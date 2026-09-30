/**
 * Copyright 2026 QubitBoard contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * OpenQASM 3 view of the circuit.
 *
 * Only exact translations are used: a gate is written as QASM only when the QASM gate has the same matrix, including
 * global phase (which matters once the gate is controlled). Everything else (displays, arithmetic, postselection,
 * time-varying formulas, ...) is written as a "// @qb ..." comment holding the column in QubitBoard's own language.
 * Standard QASM tools ignore those comments, while this parser reads them back, so nothing is lost on a round trip.
 *
 * Each line is one column of the circuit. Statements that share a line (and the same controls) share a column.
 */

import {CodeError} from "../CodeError.js"
import {
    CircuitJsonBuilder,
    CircuitModel,
    canonicalCircuitJsonText,
    evalConstantFormula,
    findGateByName,
    splitTopLevel
} from "../CircuitCode.js"
import type {ColumnEntry} from "../CircuitCode.js"
import type {CodeLanguage} from "../Languages.js"
import {Config} from "../../Config.js"
import {CustomGateSet} from "../../circuit/CustomGateSet.js"
import {Gate} from "../../circuit/Gate.js"
import {formatColumn, formatCustomGate, formatInit, parseDslLine} from "./QubitBoardDsl.js"

const PRAGMA = '@qb';
const CONTROL_ID = '•';
const ANTI_CONTROL_ID = '◦';

/** Fixed single-qubit gates with an exact standard-library equivalent. */
const ID_TO_QASM = new Map<string, string>([
    ['H', 'h'],
    ['X', 'x'],
    ['Y', 'y'],
    ['Z', 'z'],
    ['Z^½', 's'],
    ['Z^-½', 'sdg'],
    ['Z^¼', 't'],
    ['Z^-¼', 'tdg'],
    ['X^½', 'sx'],
    ['X^-½', 'inv @ sx']
]);

/** Formula gates that are exactly rx/ry/rz when their formula is a constant. */
const ROTATION_ID_TO_QASM = new Map<string, string>([
    ['Rxft', 'rx'],
    ['Ryft', 'ry'],
    ['Rzft', 'rz']
]);

/** Controlled forms with a standard-library name, keyed by "<number of controls>:<base gate>". */
const CONTROLLED_NAMES = new Map<string, string>([
    ['1:x', 'cx'],
    ['1:y', 'cy'],
    ['1:z', 'cz'],
    ['1:h', 'ch'],
    ['1:swap', 'cswap'],
    ['1:rx', 'crx'],
    ['1:ry', 'cry'],
    ['1:rz', 'crz'],
    ['1:p', 'cp'],
    ['2:x', 'ccx']
]);

/**
 * QASM gate names understood by the parser.
 * `id` is the QubitBoard gate id (null for a no-op), `angle` marks gates taking one angle, `phase` marks the phase
 * gate (turned into a Z^f(t) gate), `targets` is the number of target qubits and `controls` counts built-in controls.
 */
interface QasmGateSpec {
    id: string | null;
    angle?: boolean;
    phase?: boolean;
    targets?: number;
    controls?: number;
}

const QASM_GATES = new Map<string, QasmGateSpec>([
    ['id', {id: null}],
    ['h', {id: 'H'}],
    ['x', {id: 'X'}],
    ['y', {id: 'Y'}],
    ['z', {id: 'Z'}],
    ['s', {id: 'Z^½'}],
    ['sdg', {id: 'Z^-½'}],
    ['t', {id: 'Z^¼'}],
    ['tdg', {id: 'Z^-¼'}],
    ['sx', {id: 'X^½'}],
    ['rx', {id: 'Rxft', angle: true}],
    ['ry', {id: 'Ryft', angle: true}],
    ['rz', {id: 'Rzft', angle: true}],
    ['p', {id: 'Z^ft', angle: true, phase: true}],
    ['phase', {id: 'Z^ft', angle: true, phase: true}],
    ['u1', {id: 'Z^ft', angle: true, phase: true}],
    ['swap', {id: 'Swap', targets: 2}],
    ['cx', {id: 'X', controls: 1}],
    ['CX', {id: 'X', controls: 1}],
    ['cy', {id: 'Y', controls: 1}],
    ['cz', {id: 'Z', controls: 1}],
    ['ch', {id: 'H', controls: 1}],
    ['ccx', {id: 'X', controls: 2}],
    ['crx', {id: 'Rxft', angle: true, controls: 1}],
    ['cry', {id: 'Ryft', angle: true, controls: 1}],
    ['crz', {id: 'Rzft', angle: true, controls: 1}],
    ['cp', {id: 'Z^ft', angle: true, phase: true, controls: 1}],
    ['cphase', {id: 'Z^ft', angle: true, phase: true, controls: 1}],
    ['cu1', {id: 'Z^ft', angle: true, phase: true, controls: 1}],
    ['cswap', {id: 'Swap', targets: 2, controls: 1}]
]);

/** Inverses of fixed gates (gates not listed are their own inverse). */
const INVERSE_IDS = new Map<string, string>([
    ['Z^½', 'Z^-½'],
    ['Z^-½', 'Z^½'],
    ['Z^¼', 'Z^-¼'],
    ['Z^-¼', 'Z^¼'],
    ['X^½', 'X^-½'],
    ['X^-½', 'X^½']
]);

const UNSUPPORTED_KEYWORDS = [
    'reset', 'if', 'else', 'for', 'while', 'gate', 'def', 'defcal', 'cal', 'let', 'const', 'input', 'output',
    'return', 'box', 'delay', 'extern', 'opaque', 'U', 'u', 'u2', 'u3', 'cu', 'cu3', 'gphase'
];

const QASM_FUNCTIONS = ['sin', 'cos', 'tan', 'exp', 'ln', 'sqrt'];

/**
 * @param formula A formula gate's formula.
 * @returns The same value as a QASM expression, or undefined if there's no exact equivalent
 * (e.g. it depends on time, or uses syntax QASM lacks such as implicit multiplication).
 */
function formulaToQasm(formula: unknown): string | undefined {
    if (typeof formula !== 'string' || evalConstantFormula(formula) === undefined) {
        return undefined;
    }
    let rest = formula;
    let prevEndsOperand = false;
    let prevIsFunction = false;
    while (rest.trim() !== '') {
        let m = rest.match(/^\s*(?:(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?)|([A-Za-z_]\w*)|([-+*\/^()]))/);
        if (m === null) {
            return undefined;
        }
        rest = rest.substring(m[0].length);
        let [, num, ident, op] = m;
        let startsOperand = num !== undefined || ident !== undefined || op === '(';
        if (startsOperand && prevEndsOperand && !(prevIsFunction && op === '(')) {
            return undefined; // Implicit multiplication like "2 pi".
        }
        if (ident !== undefined && ident !== 'pi' && QASM_FUNCTIONS.indexOf(ident) === -1) {
            return undefined;
        }
        prevIsFunction = ident !== undefined && ident !== 'pi';
        prevEndsOperand = num !== undefined || ident !== undefined || op === ')';
    }
    return formula.split('^').join('**').trim();
}

/**
 * @param expr A QASM angle expression.
 * @returns The same value as a formula gate formula.
 */
function qasmToFormula(expr: string, line: number): string {
    let formula = expr.trim().
        split('**').join('^').
        split('π').join('pi').
        split('τ').join('(2*pi)').
        replace(/\btau\b/g, '(2*pi)');
    if (evalConstantFormula(formula) === undefined) {
        throw new CodeError(`Can't evaluate the angle '${expr.trim()}'.`, line);
    }
    return formula;
}

/**
 * @param controls Sorted by wire.
 * @returns Modifier prefix like "ctrl(2) @ negctrl @ ".
 */
function _modifierPrefix(controls: ColumnEntry[]): string {
    let result = '';
    let i = 0;
    while (i < controls.length) {
        let j = i;
        while (j < controls.length && controls[j].id === controls[i].id) {
            j++;
        }
        let name = controls[i].id === CONTROL_ID ? 'ctrl' : 'negctrl';
        result += (j - i > 1 ? `${name}(${j - i})` : name) + ' @ ';
        i = j;
    }
    return result;
}

/**
 * @param entries A column's gates.
 * @returns The column as QASM statements, or undefined if it has no exact QASM form.
 */
function _columnToQasm(entries: ColumnEntry[]): string | undefined {
    let controls = entries.filter(e => e.id === CONTROL_ID || e.id === ANTI_CONTROL_ID);
    let others = entries.filter(e => e.id !== CONTROL_ID && e.id !== ANTI_CONTROL_ID);
    if (others.length === 0 || entries.some(e => e.raw !== undefined)) {
        return undefined;
    }

    let swaps = others.filter(e => e.id === 'Swap');
    let measures = others.filter(e => e.id === 'Measure');
    if ((swaps.length > 0 && swaps.length !== 2) || (measures.length > 0 && controls.length > 0)) {
        return undefined;
    }

    let onlyPlainControls = controls.every(e => e.id === CONTROL_ID);
    let ctrlOperands = controls.map(e => `q[${e.wire}]`);
    let statement = (base: string, params: string, targets: number[]): string => {
        let shortName = onlyPlainControls ? CONTROLLED_NAMES.get(`${controls.length}:${base}`) : undefined;
        let head = controls.length === 0 ? base :
            shortName !== undefined ? shortName :
            _modifierPrefix(controls) + base;
        let operands = [...ctrlOperands, ...targets.map(w => `q[${w}]`)].join(', ');
        return `${head}${params} ${operands};`;
    };

    let statements: string[] = [];
    for (let e of others) {
        let fixed = e.arg === undefined ? ID_TO_QASM.get(e.id) : undefined;
        let rotation = ROTATION_ID_TO_QASM.get(e.id);
        let angle = formulaToQasm(e.arg);
        if (e.id === 'Measure') {
            statements.push(`measure q[${e.wire}];`);
        } else if (e.id === 'Swap') {
            if (e === swaps[0]) {
                statements.push(statement('swap', '', [swaps[0].wire, swaps[1].wire]));
            }
        } else if (fixed !== undefined) {
            statements.push(statement(fixed, '', [e.wire]));
        } else if (rotation !== undefined && angle !== undefined) {
            statements.push(statement(rotation, `(${angle})`, [e.wire]));
        } else if (e.id === 'Z^ft' && angle !== undefined) {
            statements.push(statement('p', `(pi*(${angle}))`, [e.wire]));
        } else {
            return undefined;
        }
    }
    return statements.join(' ');
}

/**
 * Tracks declared qubit registers, mapping them onto the circuit's wires.
 */
class _Registers {
    map = new Map<string, {offset: number, size: number}>();
    total = 0;

    declare(name: string, size: number, line: number, builder: CircuitJsonBuilder): void {
        if (this.map.has(name)) {
            throw new CodeError(`The register '${name}' is declared twice.`, line);
        }
        if (!(size >= 1)) {
            throw new CodeError(`The register '${name}' needs at least one qubit.`, line);
        }
        this.map.set(name, {offset: this.total, size});
        this.total += size;
        if (this.total > Config.MAX_WIRE_COUNT) {
            throw new CodeError(`QubitBoard supports at most ${Config.MAX_WIRE_COUNT} qubits.`, line);
        }
        builder.setQubitCount(this.total, line);
    }

    /**
     * @param text An operand like "q[2]" or "q".
     * @returns The wires the operand refers to.
     */
    resolve(text: string, line: number): number[] {
        let m = text.trim().match(/^([A-Za-z_]\w*)\s*(?:\[\s*(\d+)\s*\])?$/);
        if (m === null) {
            throw new CodeError(`Expected a qubit like 'q[0]' but found '${text.trim()}'.`, line);
        }
        let [, name, index] = m;
        if (!this.map.has(name)) {
            if (this.map.size === 0 && name === 'q') {
                // Allow skipping the declaration entirely: 'q' is then as large as it needs to be.
                this.map.set('q', {offset: 0, size: Config.MAX_WIRE_COUNT});
            } else {
                throw new CodeError(`Unknown qubit register '${name}'. Declare it with 'qubit[n] ${name};'.`, line);
            }
        }
        let {offset, size} = this.map.get(name)!;
        if (index === undefined) {
            return Array.from({length: size}, (_, i) => offset + i);
        }
        let i = parseInt(index, 10);
        if (i >= size) {
            throw new CodeError(`${name}[${i}] is out of range: '${name}' has ${size} qubits.`, line);
        }
        return [offset + i];
    }
}

interface GateCall {
    /** Control gate id by wire. */
    controls: Map<number, string>;
    targets: Array<{wire: number, id: string, arg: string | undefined}>;
}

/**
 * Parses a gate call like "ctrl @ rx(pi/2) q[0], q[1]".
 * @returns The call, or undefined for a gate that does nothing (id).
 */
function _parseGateCall(stmt: string, line: number, registers: _Registers): GateCall | undefined {
    let m = stmt.match(/^((?:\s*(?:ctrl|negctrl|inv|pow)\s*(?:\([^)]*\))?\s*@)*)\s*([A-Za-z_]\w*)\s*(?:\((.*)\))?\s+([^()]+)$/);
    if (m === null) {
        let word = (stmt.match(/^[A-Za-z_]\w*/) || [stmt])[0];
        if (UNSUPPORTED_KEYWORDS.indexOf(word) !== -1) {
            throw new CodeError(`'${word}' isn't supported by QubitBoard.`, line);
        }
        throw new CodeError(`Couldn't understand '${stmt}'.`, line);
    }
    let [, modifierText, name, paramText, operandText] = m;

    if (UNSUPPORTED_KEYWORDS.indexOf(name) !== -1) {
        throw new CodeError(`'${name}' isn't supported by QubitBoard.`, line);
    }
    let spec = QASM_GATES.get(name);
    if (spec === undefined) {
        throw new CodeError(`Unknown gate '${name}'.`, line);
    }

    // Modifiers, applied innermost (closest to the gate) first.
    let controlKinds: string[] = [];
    let inverted = false;
    for (let mod of modifierText.split('@').map(e => e.trim()).filter(e => e !== '')) {
        let mm = mod.match(/^(ctrl|negctrl|inv|pow)\s*(?:\(\s*([^)]*?)\s*\))?$/);
        let [, kind, countText] = mm!;
        if (kind === 'pow') {
            throw new CodeError("The 'pow' modifier isn't supported by QubitBoard.", line);
        }
        if (kind === 'inv') {
            if (countText !== undefined) {
                throw new CodeError("'inv' doesn't take an argument.", line);
            }
            inverted = !inverted;
            continue;
        }
        let count = countText === undefined ? 1 : Number(countText);
        if (!Number.isInteger(count) || count < 1) {
            throw new CodeError(`'${kind}(${countText})' needs a positive whole number.`, line);
        }
        for (let i = 0; i < count; i++) {
            controlKinds.push(kind === 'ctrl' ? CONTROL_ID : ANTI_CONTROL_ID);
        }
    }
    for (let i = 0; i < (spec.controls || 0); i++) {
        controlKinds.push(CONTROL_ID);
    }

    // Parameters.
    let params = paramText === undefined ? [] : splitTopLevel(paramText, ',').map(e => e.trim());
    if (params.length === 1 && params[0] === '') {
        params = [];
    }
    let expectedParams = spec.angle ? 1 : 0;
    if (params.length !== expectedParams) {
        throw new CodeError(
            `'${name}' takes ${expectedParams === 0 ? 'no' : expectedParams} angle` +
            `${expectedParams === 1 ? '' : 's'} but got ${params.length}.`,
            line);
    }
    let arg: string | undefined = undefined;
    if (spec.angle) {
        let formula = qasmToFormula(params[0], line);
        if (spec.phase) {
            let inner = formula.match(/^pi\s*\*\s*\((.*)\)$/);
            formula = inner !== null ? inner[1] : `(${formula})/pi`;
        }
        arg = inverted ? `-(${formula})` : formula;
    }

    // Operands.
    let operands = operandText.split(',').map(e => registers.resolve(e, line));
    let targetCount = spec.targets || 1;
    if (operands.length !== controlKinds.length + targetCount) {
        throw new CodeError(
            `'${name}' needs ${controlKinds.length + targetCount} qubit(s) but got ${operands.length}.`, line);
    }
    let isBroadcast = operands.some(e => e.length > 1);
    if (isBroadcast && (operands.length !== 1)) {
        throw new CodeError('Whole-register operands only work for single-qubit gates without controls.', line);
    }

    let id = spec.id;
    if (id === null) {
        return undefined;
    }
    if (inverted && !spec.angle) {
        id = INVERSE_IDS.get(id) || id;
    }

    let controls = new Map<number, string>();
    let seen = new Set<number>();
    let claim = (wire: number) => {
        if (seen.has(wire)) {
            throw new CodeError(`q[${wire}] is used more than once in '${name}'.`, line);
        }
        seen.add(wire);
    };
    for (let i = 0; i < controlKinds.length; i++) {
        claim(operands[i][0]);
        controls.set(operands[i][0], controlKinds[i]);
    }
    let targets: GateCall['targets'] = [];
    for (let op of operands.slice(controlKinds.length)) {
        for (let wire of op) {
            claim(wire);
            targets.push({wire, id, arg});
        }
    }
    return {controls, targets};
}

/**
 * @param id The id of a built-in gate that the tables above map QASM onto.
 */
function _knownGate(id: string): Gate {
    let gate = findGateByName(id, new CustomGateSet());
    if (gate === undefined) {
        throw new Error(`Missing built-in gate: ${id}`);
    }
    return gate;
}

function _sameControls(a: Map<number, string>, b: Map<number, string>): boolean {
    if (a.size !== b.size) {
        return false;
    }
    for (let [k, v] of a.entries()) {
        if (b.get(k) !== v) {
            return false;
        }
    }
    return true;
}

/**
 * Replaces block comments with spaces, keeping line numbers intact.
 */
function _blankBlockComments(text: string): string {
    return text.replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, ' '));
}

function _splitLineComment(line: string): {code: string, comment: string | undefined} {
    let inString = false;
    for (let i = 0; i < line.length - 1; i++) {
        if (line[i] === '"') {
            inString = !inString;
        } else if (!inString && line[i] === '/' && line[i + 1] === '/') {
            return {code: line.substring(0, i), comment: line.substring(i + 2)};
        }
    }
    return {code: line, comment: undefined};
}

const OpenQasm3: CodeLanguage = {
    id: 'openqasm3',
    label: 'OpenQASM 3',
    commentPrefix: '//',

    emit(jsonText: string): string {
        let model = new CircuitModel(jsonText);
        let lines = [
            'OPENQASM 3.0;',
            'include "stdgates.inc";',
            '// One line per column. "// @qb" lines hold QubitBoard-only gates; other QASM tools ignore them.',
            `qubit[${model.numWires}] q;`
        ];
        for (let {wire, state} of model.init) {
            lines.push(`// ${PRAGMA} ${formatInit(wire, state, true)}`);
        }
        for (let g of model.customGates) {
            lines.push(`// ${PRAGMA} ${formatCustomGate(g)}`);
        }
        lines.push('');
        for (let col of model.columns) {
            let qasm = _columnToQasm(col);
            lines.push(qasm !== undefined ? qasm : `// ${PRAGMA} ${formatColumn(col, true)}`);
        }
        return lines.join('\n') + '\n';
    },

    parse(text: string): string {
        let builder = new CircuitJsonBuilder();
        let registers = new _Registers();
        let lines = _blankBlockComments(text).split('\n');
        for (let i = 0; i < lines.length; i++) {
            let lineNo = i + 1;
            let {code, comment} = _splitLineComment(lines[i]);

            let parts = splitTopLevel(code, ';');
            let trailing = parts.pop()!;
            if (trailing.trim() !== '') {
                throw new CodeError(`Missing ';' after '${trailing.trim()}'.`, lineNo);
            }

            let columnControls: Map<number, string> | undefined = undefined; // Controls of the column this line is filling.
            for (let stmt of parts.map(e => e.trim())) {
                if (stmt === '' || /^(OPENQASM|include|barrier|bit|creg)\b/.test(stmt)) {
                    continue;
                }

                let m = stmt.match(/^qubit\s*(?:\[\s*(\d+)\s*\])?\s+([A-Za-z_]\w*)$/) ||
                    stmt.match(/^qreg\s+([A-Za-z_]\w*)\s*\[\s*(\d+)\s*\]$/);
                if (m !== null) {
                    let isQreg = stmt.startsWith('qreg');
                    let name = isQreg ? m[1] : m[2];
                    let size = isQreg ? Number(m[2]) : m[1] === undefined ? 1 : Number(m[1]);
                    registers.declare(name, size, lineNo, builder);
                    continue;
                }

                let call: GateCall | undefined;
                let measured = stmt.match(/^measure\s+([^-]+?)(?:\s*->\s*.+)?$/) ||
                    stmt.match(/^[A-Za-z_]\w*(?:\s*\[\s*\d+\s*\])?\s*=\s*measure\s+(.+)$/);
                if (measured !== null) {
                    let wires = registers.resolve(measured[1], lineNo);
                    call = {controls: new Map(), targets: wires.map(wire => ({wire, id: 'Measure', arg: undefined}))};
                } else {
                    call = _parseGateCall(stmt, lineNo, registers);
                }
                if (call === undefined) {
                    continue;
                }

                let fits = columnControls !== undefined &&
                    _sameControls(columnControls, call.controls) &&
                    call.targets.every(e => !builder.currentColumnTouches(e.wire));
                if (!fits) {
                    builder.startColumn();
                    columnControls = call.controls;
                    for (let [wire, id] of call.controls.entries()) {
                        builder.addGate(wire, _knownGate(id), undefined, lineNo);
                    }
                }
                for (let {wire, id, arg} of call.targets) {
                    builder.addGate(wire, _knownGate(id), arg, lineNo);
                }
            }

            if (comment !== undefined) {
                let c = comment.trim();
                if (c.startsWith(PRAGMA)) {
                    parseDslLine(c.substring(PRAGMA.length), lineNo, builder);
                }
            }
        }
        return canonicalCircuitJsonText(builder.toJson());
    },

    highlightRules: [
        ['//\\s*@qb.*', 'pragma'],
        ['//.*', 'cm'],
        ['"[^"]*"', 'str'],
        ['\\b(?:OPENQASM|include|qubit|qreg|bit|creg|measure|barrier)\\b', 'kw'],
        ['\\b(?:ctrl|negctrl|inv|pow)\\b', 'ctl'],
        ['\\b[A-Za-z_]\\w*\\s*\\[\\s*\\d+\\s*\\]', 'wire'],
        ['\\bpi\\b|π|\\b\\d+(?:\\.\\d+)?\\b', 'num']
    ]
};

export {OpenQasm3, formulaToQasm}

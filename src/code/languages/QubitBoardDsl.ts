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
 * QubitBoard's own circuit language. It mirrors the circuit JSON one-to-one, so every gate, display and setting the
 * simulator supports can be written and round-tripped without loss:
 *
 *     qubits 3
 *     init q2 = +
 *     H q0
 *     ctrl q0, X q1          # one line per column; gates in a line act at the same time
 *     Rzft[pi/2] q2          # gate arguments go in square brackets
 *     QFT3 q0                # multi-qubit gates are placed by their top qubit
 */

import {CodeError} from "../CodeError.js"
import {
    CircuitJsonBuilder,
    CircuitModel,
    canonicalCircuitJsonText,
    findGateByName,
    gateNameOf,
    parseWire,
    splitTopLevel
} from "../CircuitCode.js"
import type {ColumnEntry, GateJsonObject} from "../CircuitCode.js"
import type {CodeLanguage} from "../Languages.js"

function formatWire(wire: number, bracketWires: boolean): string {
    return bracketWires ? `q[${wire}]` : `q${wire}`;
}

/**
 * @param bracketWires Write qubits as "q[0]" (for OpenQASM comments) instead of "q0".
 */
function formatColumn(entries: ColumnEntry[], bracketWires: boolean = false): string {
    return entries.map(e => {
        let w = formatWire(e.wire, bracketWires);
        if (e.raw !== undefined) {
            return `${JSON.stringify(e.raw)} ${w}`;
        }
        let arg = e.arg === undefined ? '' : `[${e.arg}]`;
        return `${gateNameOf(e.id)}${arg} ${w}`;
    }).join(', ');
}

function formatInit(wire: number, state: string, bracketWires: boolean = false): string {
    return `init ${formatWire(wire, bracketWires)} = ${state}`;
}

function formatCustomGate(gateJson: GateJsonObject): string {
    return `gate ${gateJson.id} = ${JSON.stringify(gateJson)}`;
}

function _wireOrThrow(text: string, line: number): number {
    let wire = parseWire(text);
    if (wire === undefined) {
        throw new CodeError(`Expected a qubit like 'q0' but found '${text}'.`, line);
    }
    return wire;
}

/**
 * Parses one gate of a column (e.g. "Rzft[pi/2] q0") into the builder's current column.
 */
function _parseItem(item: string, line: number, builder: CircuitJsonBuilder): void {
    if (item.startsWith('{')) {
        let m = item.match(/^(\{.*\})\s+(\S+)$/);
        if (m === null) {
            throw new CodeError(`Expected '{...gate json...} q0' but found '${item}'.`, line);
        }
        let json: unknown;
        try {
            json = JSON.parse(m[1]);
        } catch (ex) {
            throw new CodeError(`Bad gate JSON: ${(ex as Error).message}`, line);
        }
        builder.addGateJson(_wireOrThrow(m[2], line), json, line);
        return;
    }

    let m = item.match(/^([^\s\[]+)(?:\[(.*?)\])?(?:\s+(\S+))?$/);
    if (m === null) {
        throw new CodeError(`Expected a gate and a qubit, like 'H q0', but found '${item}'.`, line);
    }
    let [, name, arg, wireText] = m;
    if (wireText === undefined) {
        throw new CodeError(`'${name}' needs a qubit, like '${name} q0'.`, line);
    }
    let gate = findGateByName(name, builder.customGateSet);
    if (gate === undefined) {
        let hint = name.startsWith('~') ? ` Define it first with a 'gate ${name} = {...}' line.` : '';
        throw new CodeError(`Unknown gate '${name}'.${hint}`, line);
    }
    builder.addGate(_wireOrThrow(wireText, line), gate, arg, line);
}

/**
 * Parses one line of the language (already stripped of comments) into the builder.
 */
function parseDslLine(text: string, line: number, builder: CircuitJsonBuilder): void {
    text = text.trim();
    if (text === '') {
        return;
    }

    let m = text.match(/^qubits\s+(\S+)$/);
    if (m !== null) {
        builder.setQubitCount(Number(m[1]), line);
        return;
    }

    m = text.match(/^init\s+(\S+)\s*=\s*(\S+)$/);
    if (m !== null) {
        builder.setInit(_wireOrThrow(m[1], line), m[2], line);
        return;
    }
    if (text.startsWith('init ') || text === 'init') {
        throw new CodeError("Expected 'init q0 = +'.", line);
    }

    m = text.match(/^gate\s+(\S+)\s*=\s*(\{.*\})$/);
    if (m !== null) {
        let json: GateJsonObject;
        try {
            json = JSON.parse(m[2]);
        } catch (ex) {
            throw new CodeError(`Bad gate JSON: ${(ex as Error).message}`, line);
        }
        if (json.id !== m[1]) {
            throw new CodeError(`The gate is named '${m[1]}' but its JSON has id '${json.id}'.`, line);
        }
        builder.addCustomGate(json, line);
        return;
    }
    if (text.startsWith('gate ') || text === 'gate') {
        throw new CodeError("Expected 'gate ~name = {...json...}'.", line);
    }

    builder.startColumn();
    for (let item of splitTopLevel(text, ',')) {
        item = item.trim();
        if (item === '') {
            throw new CodeError('Empty gate in the list. Remove the extra comma.', line);
        }
        _parseItem(item, line, builder);
    }
}

/**
 * @returns The line without its '#' comment.
 */
function _stripComment(line: string): string {
    let parts = splitTopLevel(line, '#');
    return parts[0];
}

const QubitBoardDsl: CodeLanguage = {
    id: 'qubitboard',
    label: 'QubitBoard',
    commentPrefix: '#',

    emit(jsonText: string): string {
        let model = new CircuitModel(jsonText);
        let lines = [
            '# One line per column. Gates on the same line act at the same time.',
            '# Edit, then press Run (Ctrl+Enter). Dragging gates rewrites this code.',
            `qubits ${model.numWires}`
        ];
        for (let {wire, state} of model.init) {
            lines.push(formatInit(wire, state));
        }
        for (let g of model.customGates) {
            lines.push(formatCustomGate(g));
        }
        lines.push('');
        for (let col of model.columns) {
            lines.push(formatColumn(col));
        }
        return lines.join('\n') + '\n';
    },

    parse(text: string): string {
        let builder = new CircuitJsonBuilder();
        let lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            parseDslLine(_stripComment(lines[i]), i + 1, builder);
        }
        return canonicalCircuitJsonText(builder.toJson());
    },

    highlightRules: [
        ['#.*', 'cm'],
        ['^\\s*(?:qubits|init|gate)\\b', 'kw'],
        ['\\b(?:ctrl|negctrl|xctrl|xnegctrl|yctrl|ynegctrl)\\b', 'ctl'],
        ['\\bq(?:\\d+|\\[\\d+\\])', 'wire'],
        ['\\[[^\\]]*\\]', 'arg'],
        ['\\{.*\\}', 'str']
    ]
};

export {QubitBoardDsl, parseDslLine, formatColumn, formatInit, formatCustomGate}

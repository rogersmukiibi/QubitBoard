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
 * Shared plumbing for the code panel's languages.
 *
 * The circuit JSON (the same text stored in the undo history and the URL) is the source of truth. Each language
 * turns that JSON into text and parses text back into JSON. This module holds what they have in common: readable
 * ASCII names for gate ids, a column-oriented view of circuit JSON, a validating builder for circuit JSON, and the
 * canonicalization that makes typed circuits match what drag-and-drop would have produced.
 */

import {CircuitDefinition} from "../circuit/CircuitDefinition.js"
import {CodeError} from "./CodeError.js"
import {Complex, PARSE_COMPLEX_TOKEN_MAP_RAD} from "../math/Complex.js"
import {Config} from "../Config.js"
import {CustomGateSet} from "../circuit/CustomGateSet.js"
import {Gate} from "../circuit/Gate.js"
import {Gates} from "../gates/AllGates.js"
import {Matrix} from "../math/Matrix.js"
import {Serializer, fromJsonText_CircuitDefinition} from "../circuit/Serializer.js"
import {parseFormula} from "../math/FormulaParser.js"

/** A gate as it appears in circuit JSON: a plain id, or an object with an id plus an arg, matrix or circuit. */
type GateJson = string | GateJsonObject;
interface GateJsonObject {
    id?: unknown;
    arg?: unknown;
    matrix?: unknown;
    circuit?: {cols?: unknown};
    [key: string]: unknown;
}

/** Circuit JSON, as stored in the undo history. Empty slots in a column are written as 1. */
interface CircuitJson {
    cols: Array<Array<GateJson | 1>>;
    gates?: GateJsonObject[];
    init?: Array<number | string>;
}

/** One gate of a column, as seen by the code emitters. */
interface ColumnEntry {
    wire: number;
    id: string;
    arg: string | number | undefined;
    /** Set when the gate isn't a plain id (plus optional arg), e.g. an inline matrix gate. */
    raw: GateJsonObject | undefined;
}

/** Initial states a wire can start in, as written in code. */
const INIT_STATES = ['0', '1', '+', '-', 'i', '-i'];

/** Gate ids whose ASCII name can't be derived by character substitution. */
const SPECIAL_NAMES = new Map<string, string>([
    ['•', 'ctrl'],
    ['◦', 'negctrl'],
    ['⊖', 'xctrl'],
    ['⊕', 'xnegctrl'],
    ['(/)', 'yctrl'],
    ['⊗', 'ynegctrl'],
    ['|0⟩⟨0|', 'postoff'],
    ['|1⟩⟨1|', 'poston'],
    ['|+⟩⟨+|', 'postxoff'],
    ['|-⟩⟨-|', 'postxon'],
    ['|X⟩⟨X|', 'postyoff'],
    ['|/⟩⟨/|', 'postyon'],
    ['…', 'spacer'],
    ['√i', 'sqrti'],
    ['√-i', 'sqrt-i']
]);

/** Character substitutions that turn the remaining unicode gate ids into ASCII names. Longest match first. */
const CHAR_SUBSTITUTIONS: Array<[string, string]> = [
    ['⅟₁₂₈', '1/128'],
    ['⅟₆₄', '1/64'],
    ['⅟₃₂', '1/32'],
    ['⅟₁₆', '1/16'],
    ['½', '1/2'],
    ['⅓', '1/3'],
    ['¼', '1/4'],
    ['⅛', '1/8'],
    ['†', 'dag'],
    ['⌈', 'ceil('],
    ['⌉', ')']
];

interface NameTables {
    idToName: Map<string, string>;
    nameToId: Map<string, string>;
    lowerToIds: Map<string, string[]>;
}

let _nameTables: NameTables | undefined = undefined;
function _getNameTables(): NameTables {
    if (_nameTables !== undefined) {
        return _nameTables;
    }
    let ids = new Set<string>(Gates.KnownToSerializer.map((g: Gate) => g.serializedId));
    let idToName = new Map<string, string>();
    let nameToId = new Map<string, string>();
    let lowerToIds = new Map<string, string[]>();
    let addLower = (key: string, id: string) => {
        let k = key.toLowerCase();
        let list = lowerToIds.get(k) || [];
        if (list.indexOf(id) === -1) {
            list.push(id);
        }
        lowerToIds.set(k, list);
    };
    for (let id of ids) {
        let name = SPECIAL_NAMES.get(id);
        if (name === undefined) {
            name = id;
            for (let [from, to] of CHAR_SUBSTITUTIONS) {
                name = name.split(from).join(to);
            }
        }
        if (name !== id && !ids.has(name) && !nameToId.has(name)) {
            idToName.set(id, name);
            nameToId.set(name, id);
            addLower(name, id);
        }
        addLower(id, id);
    }
    _nameTables = {idToName, nameToId, lowerToIds};
    return _nameTables;
}

/**
 * @param id A gate's serialized id.
 * @returns The name used for the gate in code. ASCII whenever possible.
 */
function gateNameOf(id: string): string {
    let name = _getNameTables().idToName.get(id);
    return name === undefined ? id : name;
}

/**
 * @param name A gate name as typed in code (an ASCII name, a serialized id, or either in the wrong case).
 */
function findGateByName(name: string, customGateSet: CustomGateSet): Gate | undefined {
    let direct = Gates.findKnownGateById(name, customGateSet);
    if (direct !== undefined) {
        return direct;
    }
    let tables = _getNameTables();
    let id = tables.nameToId.get(name);
    if (id !== undefined) {
        return Gates.findKnownGateById(id, customGateSet);
    }
    let caseless = tables.lowerToIds.get(name.toLowerCase());
    if (caseless !== undefined && caseless.length === 1) {
        return Gates.findKnownGateById(caseless[0], customGateSet);
    }
    return undefined;
}

/**
 * @param text Something like "q3" or "q[3]".
 */
function parseWire(text: string): number | undefined {
    let m = text.match(/^q(?:(\d+)|\[\s*(\d+)\s*\])$/);
    if (m === null) {
        return undefined;
    }
    return parseInt(m[1] !== undefined ? m[1] : m[2], 10);
}

/**
 * Evaluates a formula the same way formula gates do, with no time variable.
 * @returns The value, or undefined if the formula isn't a real constant.
 */
function evalConstantFormula(formula: string): number | undefined {
    try {
        let v = Complex.from(parseFormula(formula, PARSE_COMPLEX_TOKEN_MAP_RAD) as number | Complex);
        if (Math.abs(v.imag) > 0.0001 || !isFinite(v.real)) {
            return undefined;
        }
        return v.real;
    } catch (_) {
        return undefined;
    }
}

/**
 * @returns Whether a formula gate would accept the formula (with or without a time variable).
 */
function isValidTimeFormula(formula: string): boolean {
    let tokens = new Map<string, unknown>([...PARSE_COMPLEX_TOKEN_MAP_RAD.entries()]);
    for (let t of [0.01, 0.63, 0.98]) {
        tokens.set('t', t);
        try {
            let v = Complex.from(parseFormula(formula, tokens) as number | Complex);
            if (Math.abs(v.imag) > 0.0001) {
                return false;
            }
        } catch (_) {
            return false;
        }
    }
    return true;
}

/**
 * A column-oriented view of circuit JSON, for emitting code.
 */
class CircuitModel {
    numWires: number;
    init: Array<{wire: number, state: string}> = [];
    /** Custom gate definitions, as JSON. */
    customGates: GateJsonObject[];
    /** Each non-empty column's gates, top wire first. */
    columns: ColumnEntry[][] = [];

    /**
     * @param jsonText Circuit JSON text, as stored in the undo history.
     */
    constructor(jsonText: string) {
        let json = JSON.parse(jsonText) as Partial<CircuitJson>;
        this.numWires = fromJsonText_CircuitDefinition(jsonText).numWires;

        let init = json.init || [];
        for (let i = 0; i < init.length; i++) {
            if (init[i] !== 0) {
                this.init.push({wire: i, state: String(init[i])});
            }
        }

        this.customGates = json.gates || [];

        for (let col of json.cols || []) {
            let entries: ColumnEntry[] = [];
            for (let wire = 0; wire < col.length; wire++) {
                let e = col[wire];
                if (e === 1 || e === undefined || e === null) {
                    continue;
                }
                if (typeof e === 'string') {
                    entries.push({wire, id: e, arg: undefined, raw: undefined});
                } else {
                    let isPlain = Object.keys(e).every(k => k === 'id' || k === 'arg') && typeof e.id === 'string';
                    let arg = typeof e.arg === 'number' || typeof e.arg === 'string' ? e.arg : undefined;
                    entries.push({wire, id: String(e.id), arg, raw: isPlain ? undefined : e});
                }
            }
            if (entries.length > 0) {
                this.columns.push(entries);
            }
        }
    }
}

interface PlacedGate {
    json: GateJson;
    height: number;
    line: number;
}

/**
 * @returns A readable name for gate JSON, for error messages.
 */
function _nameOfGateJson(json: GateJson): string {
    return gateNameOf(typeof json === 'string' ? json : String(json.id !== undefined ? json.id : 'gate'));
}

/**
 * Accumulates parsed code into circuit JSON, checking everything the circuit loader would otherwise silently
 * repair or turn into a "parse error" gate.
 */
class CircuitJsonBuilder {
    wireLimit: number = Config.MAX_WIRE_COUNT;
    init = new Map<number, string>();
    customGateJsons: GateJsonObject[] = [];
    customGateSet: CustomGateSet = new CustomGateSet();
    columns: Array<Map<number, PlacedGate>> = [];
    /** Line of each wire's init statement, for error messages. */
    private _initLines = new Map<number, number>();

    setQubitCount(n: number, line: number): void {
        if (!(n >= 1 && n <= Config.MAX_WIRE_COUNT)) {
            throw new CodeError(`The qubit count must be between 1 and ${Config.MAX_WIRE_COUNT}.`, line);
        }
        this.wireLimit = n;
        for (let [wire, state] of this.init.entries()) {
            this._checkWire(wire, 1, `init ${state}`, this._initLines.get(wire));
        }
        for (let col of this.columns) {
            for (let [wire, {json, height, line}] of col.entries()) {
                this._checkWire(wire, height, _nameOfGateJson(json), line);
            }
        }
    }

    private _checkWire(wire: number, height: number, what: string, line: number | undefined): void {
        if (wire + height > this.wireLimit) {
            let range = height === 1 ? `q${wire}` : `q${wire}..q${wire + height - 1}`;
            throw new CodeError(
                `${what} on ${range} doesn't fit: the circuit has ${this.wireLimit} qubits (q0..q${this.wireLimit - 1}).`,
                line);
        }
    }

    setInit(wire: number, state: string, line: number): void {
        if (INIT_STATES.indexOf(state) === -1) {
            throw new CodeError(`Unknown initial state '${state}'. Use one of: ${INIT_STATES.join(', ')}.`, line);
        }
        this._checkWire(wire, 1, `init ${state}`, line);
        if (this.init.has(wire)) {
            throw new CodeError(`q${wire} already has an initial state.`, line);
        }
        this._initLines.set(wire, line);
        this.init.set(wire, state);
    }

    /**
     * @param json A custom gate definition, as found in the circuit JSON's "gates" list.
     */
    addCustomGate(json: unknown, line: number): void {
        if (typeof json !== 'object' || json === null || Array.isArray(json)) {
            throw new CodeError('A custom gate definition must be a JSON object.', line);
        }
        let obj = json as GateJsonObject;
        if (typeof obj.id !== 'string' || !obj.id.startsWith('~')) {
            throw new CodeError("A custom gate's id must start with '~'.", line);
        }
        if (this.customGateSet.findGateWithSerializedId(obj.id) !== undefined) {
            throw new CodeError(`The custom gate ${obj.id} is defined twice.`, line);
        }
        if (obj.matrix === undefined && obj.circuit === undefined) {
            throw new CodeError('A custom gate needs a "matrix" or a "circuit".', line);
        }
        this._checkGateJson(obj, this.customGateSet, line);
        let gate = Serializer.fromJson(Gate, obj, this.customGateSet);
        this.customGateSet = this.customGateSet.withGate(gate);
        this.customGateJsons.push(obj);
    }

    /**
     * Checks gate JSON so that loading it can't fall back to a "parse error" gate.
     */
    private _checkGateJson(json: unknown, customGateSet: CustomGateSet, line: number): void {
        if (typeof json === 'string') {
            if (Gates.findKnownGateById(json, customGateSet) === undefined) {
                throw new CodeError(`Unknown gate '${json}'.`, line);
            }
            return;
        }
        if (typeof json !== 'object' || json === null || Array.isArray(json)) {
            throw new CodeError(`Not a gate: ${JSON.stringify(json)}.`, line);
        }
        let obj = json as GateJsonObject;
        if (obj.matrix !== undefined) {
            let m: Matrix;
            try {
                m = Serializer.fromJson(Matrix, obj.matrix);
            } catch (ex) {
                throw new CodeError(`Bad gate matrix: ${(ex as Error).message}`, line);
            }
            let w = m.width();
            if (w !== m.height() || w < 2 || w > 16 || (w & (w - 1)) !== 0) {
                throw new CodeError('A gate matrix must be square with size 2, 4, 8 or 16.', line);
            }
            return;
        }
        if (obj.circuit !== undefined) {
            let cols = obj.circuit && obj.circuit.cols;
            if (!Array.isArray(cols) || !cols.every(Array.isArray)) {
                throw new CodeError('A custom gate\'s "circuit" needs a "cols" list of columns.', line);
            }
            for (let col of cols as unknown[][]) {
                for (let e of col) {
                    if (e !== 1) {
                        this._checkGateJson(e, customGateSet, line);
                    }
                }
            }
            return;
        }
        let gate = Gates.findKnownGateById(String(obj.id), customGateSet);
        if (gate === undefined) {
            throw new CodeError(`Unknown gate '${obj.id}'.`, line);
        }
        if (obj.arg !== undefined) {
            this._checkArg(gate, obj.arg, line);
        }
    }

    /**
     * @returns The arg, converted to the type the gate uses.
     */
    private _checkArg(gate: Gate, arg: unknown, line: number): string | number {
        let name = gateNameOf(gate.serializedId);
        if (gate.param === undefined) {
            throw new CodeError(`${name} doesn't take an argument.`, line);
        }
        if (typeof gate.param === 'number') {
            let n = typeof arg === 'number' ? arg : Number(String(arg).trim());
            if (!Number.isInteger(n) || n < 0 || n > 65535) {
                throw new CodeError(`${name} needs a whole number between 0 and 65535, not '${arg}'.`, line);
            }
            return n;
        }
        let text = String(arg).trim();
        if (!isValidTimeFormula(text)) {
            throw new CodeError(`${name} can't evaluate the formula '${text}'.`, line);
        }
        return text;
    }

    /**
     * Starts a new column. Subsequent gates go into it.
     */
    startColumn(): void {
        this.columns.push(new Map());
    }

    /**
     * @param gate A gate found with `findGateByName` or `this.customGateSet`.
     */
    addGate(wire: number, gate: Gate, arg: unknown, line: number): void {
        let json: GateJson = gate.serializedId;
        if (arg !== undefined) {
            json = {id: gate.serializedId, arg: this._checkArg(gate, arg, line)};
        }
        this._place(wire, json, gate.height, line);
    }

    /**
     * @param json Gate JSON that isn't a plain id, e.g. an inline matrix gate.
     */
    addGateJson(wire: number, json: unknown, line: number): void {
        this._checkGateJson(json, this.customGateSet, line);
        let gate: Gate = Serializer.fromJson(Gate, json, this.customGateSet);
        this._place(wire, json as GateJson, gate.height, line);
    }

    private _place(wire: number, json: GateJson, height: number, line: number): void {
        if (this.columns.length === 0) {
            this.startColumn();
        }
        let name = _nameOfGateJson(json);
        this._checkWire(wire, height, name, line);
        let col = this.columns[this.columns.length - 1];
        for (let [otherWire, other] of col.entries()) {
            if (wire < otherWire + other.height && otherWire < wire + height) {
                let where = height > 1 ? `q${wire}..q${wire + height - 1}` : `q${wire}`;
                throw new CodeError(
                    `${name} on ${where} overlaps ${_nameOfGateJson(other.json)} on q${otherWire} in the same ` +
                    'column. Put one of them on its own line.',
                    line);
            }
        }
        col.set(wire, {json, height, line});
    }

    /**
     * @returns Whether the current column has a gate touching the given wires.
     */
    currentColumnTouches(wire: number, height: number = 1): boolean {
        if (this.columns.length === 0) {
            return false;
        }
        for (let [otherWire, other] of this.columns[this.columns.length - 1].entries()) {
            if (wire < otherWire + other.height && otherWire < wire + height) {
                return true;
            }
        }
        return false;
    }

    toJson(): CircuitJson {
        let result: CircuitJson = {cols: []};
        for (let col of this.columns) {
            if (col.size === 0) {
                continue;
            }
            let arr = new Array<GateJson | 1>(Math.max(...col.keys()) + 1).fill(1);
            for (let [wire, {json}] of col.entries()) {
                arr[wire] = json;
            }
            result.cols.push(arr);
        }
        if (this.customGateJsons.length > 0) {
            result.gates = this.customGateJsons;
        }
        if (this.init.size > 0) {
            let init = new Array<number | string>(Math.max(...this.init.keys()) + 1).fill(0);
            for (let [wire, state] of this.init.entries()) {
                init[wire] = state === '1' ? 1 : state;
            }
            result.init = init;
        }
        return result;
    }
}

/**
 * Loads circuit JSON and tidies it exactly like dropping a gate does, so a typed circuit ends up as the same
 * layout (and the same undo-history text) as the equivalent drag-and-drop circuit.
 */
function canonicalCircuitJsonText(json: object): string {
    let def = Serializer.fromJson(CircuitDefinition, json).
        withUncoveredColumnsRemoved().
        withHeightOverlapsFixed().
        withWidthOverlapsFixed().
        withUncoveredColumnsRemoved().
        withTrailingSpacersIncluded();
    return JSON.stringify(Serializer.toJson(def), null, 0);
}

/**
 * Splits text on a separator, ignoring separators nested inside (), [] or {} and inside double-quoted strings.
 * @param separator A single character.
 */
function splitTopLevel(text: string, separator: string): string[] {
    let parts: string[] = [];
    let depth = 0;
    let inString = false;
    let start = 0;
    for (let i = 0; i < text.length; i++) {
        let c = text[i];
        if (inString) {
            if (c === '\\') {
                i++;
            } else if (c === '"') {
                inString = false;
            }
        } else if (c === '"') {
            inString = true;
        } else if (c === '(' || c === '[' || c === '{') {
            depth++;
        } else if (c === ')' || c === ']' || c === '}') {
            depth--;
        } else if (c === separator && depth === 0) {
            parts.push(text.substring(start, i));
            start = i + 1;
        }
    }
    parts.push(text.substring(start));
    return parts;
}

export {
    CircuitModel,
    CircuitJsonBuilder,
    INIT_STATES,
    canonicalCircuitJsonText,
    evalConstantFormula,
    findGateByName,
    gateNameOf,
    parseWire,
    splitTopLevel
}
export type {CircuitJson, ColumnEntry, GateJsonObject}

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
 * Cirq (Python) view of the circuit.
 *
 * Only exact translations are used: a gate is written as Cirq only when the Cirq gate has the same matrix, including
 * global phase. Everything else (displays, arithmetic, postselection, X/Y-axis controls, ...) is written as a
 * "# @qb ..." comment holding the column in QubitBoard's own language. Cirq ignores those comments, while this parser
 * reads them back, so nothing is lost on a round trip.
 *
 * Each line of the circuit is one column. A column is a cirq.Moment, except when several gates share controls: a
 * Moment can't use the control qubit twice, so such a column is a bracketed list of operations instead.
 *
 * Qubit order: Cirq's multi-qubit gates are big-endian while QubitBoard's top wire is the low bit, so multi-qubit
 * gates list their qubits from the bottom wire up.
 *
 * Custom gates defined by a unitary matrix become cirq.MatrixGate variables named after the gate's id.
 *
 * Time: `t` is the time used by QubitBoard's formula gates, which runs from -1 to 1. The spinning gates cover a full
 * turn over that range, so X^t is written cirq.X**(t + 1).
 *
 * Reading accepts a flat subset of Python: qubit declarations and one circuit built from a list of operations.
 */

import {CodeError} from "../CodeError.js"
import {CircuitJsonBuilder, CircuitModel, canonicalCircuitJsonText, findGateByName} from "../CircuitCode.js"
import type {ColumnEntry, GateJsonObject} from "../CircuitCode.js"
import type {CodeLanguage} from "../Languages.js"
import {Complex, PARSE_COMPLEX_TOKEN_MAP_RAD} from "../../math/Complex.js"
import {Config} from "../../Config.js"
import {CustomGateSet} from "../../circuit/CustomGateSet.js"
import {Gate} from "../../circuit/Gate.js"
import {Matrix} from "../../math/Matrix.js"
import {Serializer} from "../../circuit/Serializer.js"
import {parseFormula} from "../../math/FormulaParser.js"
import {formatColumn, formatCustomGate, formatInit, parseDslLine} from "./QubitBoardDsl.js"

const PRAGMA = '@qb';
const CONTROL_ID = '•';
const ANTI_CONTROL_ID = '◦';

type Axis = 'X' | 'Y' | 'Z';
const AXES: Axis[] = ['X', 'Y', 'Z'];

/** A single-qubit gate as a Cirq power gate (cirq.X**expr) or rotation (cirq.rx(expr)). */
interface CirqGateForm {
    kind: 'pow' | 'rot';
    axis: Axis;
    /** The exponent, or the angle in radians, as a Python expression. */
    expr: string;
}

// ---------------------------------------------------------------------------------------------------------------------
// Python expressions.

interface Token {
    kind: 'name' | 'num' | 'str' | 'op';
    text: string;
    start: number;
    end: number;
}

interface Arg {
    /** Set for keyword arguments. */
    name: string | undefined;
    value: Node;
}

type NodeBody =
    {k: 'num', value: number, imag: boolean} |
    {k: 'str', value: string} |
    {k: 'name', name: string} |
    {k: 'call', fn: Node, args: Arg[]} |
    {k: 'index', obj: Node, index: Node} |
    {k: 'slice', obj: Node, from: Node | undefined, to: Node | undefined} |
    {k: 'attr', obj: Node, name: string} |
    {k: 'pow', left: Node, right: Node} |
    {k: 'neg', operand: Node} |
    {k: 'bin', op: string, left: Node, right: Node} |
    {k: 'list', items: Node[]} |
    {k: 'star', operand: Node};

/** `start` and `end` are offsets into the source text. `paren` marks an expression wrapped in its own parentheses. */
type Node = NodeBody & {start: number, end: number, paren?: boolean};

function _tokenize(text: string, line: number | undefined): Token[] {
    let tokens: Token[] = [];
    let i = 0;
    while (i < text.length) {
        let rest = text.substring(i);
        let space = rest.match(/^\s+/);
        if (space !== null) {
            i += space[0].length;
            continue;
        }
        let m: RegExpMatchArray | null;
        let kind: Token['kind'];
        if ((m = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?j?/)) !== null) {
            kind = 'num';
        } else if ((m = rest.match(/^[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*/)) !== null) {
            kind = 'name';
        } else if ((m = rest.match(/^(?:'[^']*'|"[^"]*")/)) !== null) {
            kind = 'str';
        } else if ((m = rest.match(/^(?:\*\*|[-+*\/()\[\],=.:])/)) !== null) {
            kind = 'op';
        } else {
            throw new CodeError(`Unexpected '${rest[0]}'.`, line);
        }
        tokens.push({kind, text: m[0], start: i, end: i + m[0].length});
        i += m[0].length;
    }
    return tokens;
}

/**
 * A recursive-descent parser for the Python expressions that appear in Cirq circuits.
 */
class _ExprParser {
    private _pos = 0;

    constructor(public tokens: Token[], public text: string, public line: number | undefined) {
    }

    private _peek(text?: string): Token | undefined {
        let token = this.tokens[this._pos];
        return token !== undefined && (text === undefined || (token.kind === 'op' && token.text === text)) ?
            token :
            undefined;
    }

    private _expect(text: string): Token {
        let token = this._peek(text);
        if (token === undefined) {
            let found = this.tokens[this._pos];
            throw new CodeError(
                found === undefined ? `Missing '${text}'.` : `Expected '${text}' but found '${found.text}'.`,
                this.line);
        }
        this._pos++;
        return token;
    }

    /**
     * @returns The comma-separated expressions making up all the tokens. A trailing comma is allowed.
     */
    parseAll(): Node[] {
        let nodes: Node[] = [];
        while (this._pos < this.tokens.length) {
            nodes.push(this._element());
            if (this._pos < this.tokens.length) {
                this._expect(',');
            }
        }
        return nodes;
    }

    parseSingle(): Node {
        let nodes = this.parseAll();
        if (nodes.length !== 1) {
            throw new CodeError(`Expected one expression but found '${this.text.trim()}'.`, this.line);
        }
        return nodes[0];
    }

    /** An expression that may be unpacked with a leading '*'. */
    private _element(): Node {
        let star = this._peek('*');
        if (star !== undefined) {
            this._pos++;
            let operand = this._expr();
            return {k: 'star', operand, start: star.start, end: operand.end};
        }
        return this._expr();
    }

    private _expr(): Node {
        let left = this._term();
        let op: Token | undefined;
        while ((op = this._peek('+') || this._peek('-')) !== undefined) {
            this._pos++;
            let right = this._term();
            left = {k: 'bin', op: op.text, left, right, start: left.start, end: right.end};
        }
        return left;
    }

    private _term(): Node {
        let left = this._unary();
        let op: Token | undefined;
        while ((op = this._peek('*') || this._peek('/')) !== undefined) {
            this._pos++;
            let right = this._unary();
            left = {k: 'bin', op: op.text, left, right, start: left.start, end: right.end};
        }
        return left;
    }

    private _unary(): Node {
        let sign = this._peek('-') || this._peek('+');
        if (sign === undefined) {
            return this._power();
        }
        this._pos++;
        let operand = this._unary();
        return sign.text === '-' ?
            {k: 'neg', operand, start: sign.start, end: operand.end} :
            {...operand, start: sign.start, paren: false};
    }

    private _power(): Node {
        let left = this._postfix();
        if (this._peek('**') === undefined) {
            return left;
        }
        this._pos++;
        let right = this._unary();
        return {k: 'pow', left, right, start: left.start, end: right.end};
    }

    private _postfix(): Node {
        let node = this._atom();
        while (true) {
            if (this._peek('(') !== undefined) {
                this._pos++;
                let args = this._args();
                let close = this._expect(')');
                node = {k: 'call', fn: node, args, start: node.start, end: close.end};
            } else if (this._peek('[') !== undefined) {
                this._pos++;
                node = this._subscript(node);
            } else if (this._peek('.') !== undefined) {
                this._pos++;
                let name = this.tokens[this._pos];
                if (name === undefined || name.kind !== 'name') {
                    throw new CodeError("Expected a name after '.'.", this.line);
                }
                this._pos++;
                for (let part of name.text.split('.')) {
                    node = {k: 'attr', obj: node, name: part, start: node.start, end: name.end};
                }
            } else {
                return node;
            }
        }
    }

    private _subscript(obj: Node): Node {
        let from = this._peek(':') !== undefined ? undefined : this._expr();
        if (this._peek(':') === undefined) {
            let close = this._expect(']');
            return {k: 'index', obj, index: from!, start: obj.start, end: close.end};
        }
        this._pos++;
        let to = this._peek(']') !== undefined ? undefined : this._expr();
        let close = this._expect(']');
        return {k: 'slice', obj, from, to, start: obj.start, end: close.end};
    }

    private _args(): Arg[] {
        let args: Arg[] = [];
        while (this._peek(')') === undefined) {
            let first = this.tokens[this._pos];
            let second = this.tokens[this._pos + 1];
            if (first !== undefined && first.kind === 'name' && second !== undefined && second.kind === 'op' &&
                    second.text === '=') {
                this._pos += 2;
                args.push({name: first.text, value: this._expr()});
            } else {
                args.push({name: undefined, value: this._element()});
            }
            if (this._peek(')') === undefined) {
                this._expect(',');
            }
        }
        return args;
    }

    private _atom(): Node {
        let token = this.tokens[this._pos];
        if (token === undefined) {
            throw new CodeError('The expression ends too early.', this.line);
        }
        this._pos++;
        let {start, end} = token;
        if (token.kind === 'num') {
            return {k: 'num', value: parseFloat(token.text), imag: /j$/.test(token.text), start, end};
        }
        if (token.kind === 'str') {
            return {k: 'str', value: token.text.substring(1, token.text.length - 1), start, end};
        }
        if (token.kind === 'name') {
            return {k: 'name', name: token.text, start, end};
        }
        if (token.text === '(') {
            let inner = this._expr();
            let close = this._expect(')');
            return {...inner, start, end: close.end, paren: true};
        }
        if (token.text === '[') {
            let items: Node[] = [];
            while (this._peek(']') === undefined) {
                items.push(this._element());
                if (this._peek(']') === undefined) {
                    this._expect(',');
                }
            }
            let close = this._expect(']');
            return {k: 'list', items, start, end: close.end};
        }
        throw new CodeError(`Unexpected '${token.text}'.`, this.line);
    }
}

function _parseExpr(text: string, line: number | undefined): Node {
    return new _ExprParser(_tokenize(text, line), text, line).parseSingle();
}

/**
 * @returns The expression's source text, without the parentheses wrapping the whole expression (if any).
 */
function _textOf(node: Node, source: string): string {
    let text = source.substring(node.start, node.end);
    return node.paren ? text.substring(1, text.length - 1).trim() : text;
}

/** Names of math constants and functions: [QubitBoard formula name, name written into Cirq code, other spellings]. */
const MATH_NAMES: Array<[string, string, string[]]> = [
    ['pi', 'pi', []],
    ['e', 'E', ['e']],
    ['sin', 'sin', []],
    ['cos', 'cos', []],
    ['tan', 'tan', []],
    ['asin', 'asin', ['arcsin']],
    ['acos', 'acos', ['arccos']],
    ['atan', 'atan', ['arctan']],
    ['sqrt', 'sqrt', []],
    ['exp', 'exp', []],
    ['ln', 'log', ['ln']]
];
const MATH_FUNCTIONS: {[name: string]: (v: number) => number} = {
    sin: Math.sin,
    cos: Math.cos,
    tan: Math.tan,
    asin: Math.asin,
    acos: Math.acos,
    atan: Math.atan,
    sqrt: Math.sqrt,
    exp: Math.exp,
    ln: Math.log
};
const MATH_CONSTANTS: {[name: string]: number} = {pi: Math.PI, e: Math.E};
const MATH_MODULE_PATTERN = /^(?:sympy|np|numpy|math)\./;

/**
 * @param name A name from Python code, like "sympy.pi" or "np.arcsin".
 * @returns The matching name in QubitBoard's formulas, like "pi" or "asin".
 */
function _formulaNameOf(name: string): string | undefined {
    let bare = name.replace(MATH_MODULE_PATTERN, '');
    if (bare === 't') {
        return name === 't' ? 't' : undefined;
    }
    for (let [formulaName, cirqName, others] of MATH_NAMES) {
        if (bare === cirqName || bare === formulaName || others.indexOf(bare) !== -1) {
            return formulaName;
        }
    }
    return undefined;
}

function _usesTime(node: Node): boolean {
    switch (node.k) {
        case 'name': return node.name === 't';
        case 'call': return node.args.some(e => _usesTime(e.value));
        case 'pow':
        case 'bin': return _usesTime(node.left) || _usesTime(node.right);
        case 'neg': return _usesTime(node.operand);
        default: return false;
    }
}

/**
 * Evaluates an arithmetic expression the way Python would.
 * @returns The value, or undefined if the expression isn't arithmetic or has no real value.
 */
function _evalNode(node: Node, t: number): number | undefined {
    let result = ((): number | undefined => {
        switch (node.k) {
            case 'num':
                return node.imag ? undefined : node.value;
            case 'name': {
                let name = _formulaNameOf(node.name);
                return name === 't' ? t : name === undefined ? undefined : MATH_CONSTANTS[name];
            }
            case 'call': {
                let name = node.fn.k === 'name' ? _formulaNameOf(node.fn.name) : undefined;
                let f = name === undefined ? undefined : MATH_FUNCTIONS[name];
                if (f === undefined || node.args.length !== 1 || node.args[0].name !== undefined) {
                    return undefined;
                }
                let v = _evalNode(node.args[0].value, t);
                return v === undefined ? undefined : f(v);
            }
            case 'neg': {
                let v = _evalNode(node.operand, t);
                return v === undefined ? undefined : -v;
            }
            case 'pow':
            case 'bin': {
                let a = _evalNode(node.left, t);
                let b = _evalNode(node.right, t);
                if (a === undefined || b === undefined) {
                    return undefined;
                }
                return node.k === 'pow' ? Math.pow(a, b) :
                    node.op === '+' ? a + b :
                    node.op === '-' ? a - b :
                    node.op === '*' ? a * b :
                    a / b;
            }
            default:
                return undefined;
        }
    })();
    return result === undefined || !isFinite(result) ? undefined : result;
}

/**
 * @returns The value of a constant Python expression that may use imaginary numbers like 1j.
 */
function _evalComplex(node: Node): Complex | undefined {
    let real = _usesTime(node) ? undefined : _evalNode(node, 0);
    if (real !== undefined) {
        return new Complex(real, 0);
    }
    if (node.k === 'num') {
        return new Complex(0, node.value);
    }
    if (node.k === 'neg') {
        let v = _evalComplex(node.operand);
        return v === undefined ? undefined : v.neg();
    }
    if (node.k === 'bin') {
        let a = _evalComplex(node.left);
        let b = _evalComplex(node.right);
        if (a === undefined || b === undefined) {
            return undefined;
        }
        return node.op === '+' ? a.plus(b) : node.op === '-' ? a.minus(b) : node.op === '*' ? a.times(b) : a.dividedBy(b);
    }
    return undefined;
}

/**
 * @param t The time, from -1 to 1.
 * @returns The value of a Python arithmetic expression, following Python's rules.
 */
function evalCirqExpr(expr: string, t: number): number {
    let v = _evalNode(_parseExpr(expr, undefined), t);
    if (v === undefined) {
        throw new CodeError(`Can't evaluate '${expr}'.`);
    }
    return v;
}

/**
 * Evaluates a formula the way QubitBoard's formula gates do.
 */
function _evalFormula(formula: string, t: number): number | undefined {
    let tokens = new Map<string, unknown>([...PARSE_COMPLEX_TOKEN_MAP_RAD.entries()]);
    tokens.set('t', t);
    try {
        let v = Complex.from(parseFormula(formula, tokens) as number | Complex);
        return Math.abs(v.imag) > 1e-9 || !isFinite(v.real) ? undefined : v.real;
    } catch (_) {
        return undefined;
    }
}

const SAMPLE_TIMES = [-0.83, 0.17, 0.64];

/**
 * QubitBoard's formulas and Python use the same precedence rules, but formulas also have implied multiplication,
 * functions without parentheses and complex values. So a translation is only trusted once both sides evaluate to
 * the same numbers.
 */
function _agree(node: Node, formula: string): boolean {
    for (let t of SAMPLE_TIMES) {
        let a = _evalNode(node, t);
        let b = _evalFormula(formula, t);
        if (a === undefined || b === undefined || Math.abs(a - b) > 1e-7 * Math.max(1, Math.abs(a))) {
            return false;
        }
    }
    return true;
}

function _nodeToFormula(node: Node, source: string, line: number | undefined): string {
    let text = _textOf(node, source);
    let renamed = text.
        split('**').join('^').
        replace(/[A-Za-z_]\w*(?:\.[A-Za-z_]\w*)*/g, name => {
            let formulaName = _formulaNameOf(name);
            return formulaName === undefined ? name : formulaName;
        });
    // " * " is how a formula's implied multiplication ("pi t") is written in Python, so it turns back into a space.
    for (let candidate of [renamed.split(' * ').join(' '), renamed]) {
        if (_agree(node, candidate)) {
            return candidate;
        }
    }
    throw new CodeError(`Can't evaluate '${text}'.`, line);
}

/**
 * @param expr A Python arithmetic expression, such as an angle.
 * @returns The same value as a formula gate formula.
 */
function cirqToFormula(expr: string, line: number | undefined): string {
    return _nodeToFormula(_parseExpr(expr, line), expr, line);
}

/**
 * @param formula A formula gate's formula.
 * @returns The same value as a Python expression, or undefined if there's no exact equivalent.
 */
function formulaToCirq(formula: unknown): string | undefined {
    if (typeof formula !== 'string') {
        return undefined;
    }
    let parts: Array<{text: string, kind: 'space' | 'num' | 'name' | 'op'}> = [];
    let rest = formula;
    while (rest !== '') {
        let m = rest.match(/^(?:(\s+)|(\d+\.?\d*(?:e[+-]?\d+)?|\.\d+(?:e[+-]?\d+)?)|([A-Za-z_]\w*)|([-+*\/^()]))/);
        if (m === null) {
            return undefined;
        }
        rest = rest.substring(m[0].length);
        parts.push({
            text: m[0],
            kind: m[1] !== undefined ? 'space' : m[2] !== undefined ? 'num' : m[3] !== undefined ? 'name' : 'op'
        });
    }

    let isFunction = (text: string) => MATH_FUNCTIONS[text] !== undefined;
    let endsOperand = (i: number): boolean => {
        let p = parts[i];
        return p !== undefined && (p.kind === 'num' || p.text === ')' || (p.kind === 'name' && !isFunction(p.text)));
    };
    let startsOperand = (i: number): boolean => {
        let p = parts[i];
        return p !== undefined && (p.kind === 'num' || p.kind === 'name' || p.text === '(');
    };

    let out = '';
    for (let i = 0; i < parts.length; i++) {
        let {text, kind} = parts[i];
        if (kind === 'space') {
            out += endsOperand(i - 1) && startsOperand(i + 1) ? ' * ' : text;
            continue;
        }
        if (endsOperand(i - 1) && startsOperand(i)) {
            out += '*';
        }
        if (kind === 'name') {
            let known = MATH_NAMES.find(e => e[0] === text);
            if (text !== 't' && known === undefined) {
                return undefined;
            }
            out += known === undefined ? 't' : `sympy.${known[1]}`;
        } else {
            out += text === '^' ? '**' : text;
        }
    }

    try {
        return _agree(_parseExpr(out, undefined), formula) ? out : undefined;
    } catch (_) {
        return undefined;
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Gate tables.

/** Exponents of the fixed power gates: [the id's suffix, the value, the text written into Cirq code]. */
const FIXED_EXPONENTS: Array<[string, number, string]> = [
    ['½', 1 / 2, '0.5'],
    ['⅓', 1 / 3, '1/3'],
    ['¼', 1 / 4, '0.25'],
    ['⅛', 1 / 8, '0.125'],
    ['⅟₁₆', 1 / 16, '1/16'],
    ['⅟₃₂', 1 / 32, '1/32'],
    ['⅟₆₄', 1 / 64, '1/64'],
    ['⅟₁₂₈', 1 / 128, '1/128']
];

const SPIN_FORWARD = 't + 1';
const SPIN_BACKWARD = '-(t + 1)';
const TURN_FORWARD = '2*sympy.pi*(t + 1)';
const TURN_BACKWARD = '-2*sympy.pi*(t + 1)';

interface FixedPower {
    id: string;
    axis: Axis;
    value: number;
    expr: string;
}

let _fixedPowers: FixedPower[] | undefined = undefined;
function _getFixedPowers(): FixedPower[] {
    if (_fixedPowers === undefined) {
        _fixedPowers = [];
        for (let axis of AXES) {
            for (let [suffix, value, text] of FIXED_EXPONENTS) {
                for (let sign of [1, -1]) {
                    let id = `${axis}^${sign === 1 ? '' : '-'}${suffix}`;
                    if (findGateByName(id, new CustomGateSet()) !== undefined) {
                        _fixedPowers.push({id, axis, value: sign * value, expr: (sign === 1 ? '' : '-') + text});
                    }
                }
            }
        }
    }
    return _fixedPowers;
}

/**
 * @param id A gate's serialized id.
 * @param arg The gate's argument, for formula gates.
 * @returns The gate as a Cirq power gate or rotation, if it is one.
 */
function cirqFormOf(id: string, arg: unknown): CirqGateForm | undefined {
    for (let axis of AXES) {
        if (id === axis) {
            return {kind: 'pow', axis, expr: '1'};
        }
        if (id === `${axis}^t` || id === `${axis}^-t`) {
            return {kind: 'pow', axis, expr: id === `${axis}^t` ? SPIN_FORWARD : SPIN_BACKWARD};
        }
        if (id === `e^-i${axis}t` || id === `e^i${axis}t`) {
            return {kind: 'rot', axis, expr: id === `e^-i${axis}t` ? TURN_FORWARD : TURN_BACKWARD};
        }
        if (id === `${axis}^ft` || id === `R${axis.toLowerCase()}ft`) {
            let expr = formulaToCirq(arg);
            return expr === undefined ? undefined : {kind: id === `${axis}^ft` ? 'pow' : 'rot', axis, expr};
        }
    }
    let fixed = _getFixedPowers().find(e => e.id === id);
    return fixed === undefined ? undefined : {kind: 'pow', axis: fixed.axis, expr: fixed.expr};
}

/** Gates that have their own name in Cirq: [id, base gate, exponent written after it]. */
const NAMED_POWERS: Array<[string, string, string]> = [
    ['Z^½', 'S', ''],
    ['Z^-½', 'S', '-1'],
    ['Z^¼', 'T', ''],
    ['Z^-¼', 'T', '-1']
];

/** Gates that phase the whole state: [id, the phase factor written into Cirq code]. */
const SCALARS: Array<[string, string]> = [
    ['i', '1j'],
    ['-i', '-1j'],
    ['NeGate', '-1'],
    ['√i', '1j**0.5'],
    ['√-i', '(-1j)**0.5']
];

interface NamedGate {
    kind: 'pauli' | 'h' | 'swap';
    axis?: Axis;
    /** The exponent the name stands for, e.g. 0.5 for cirq.S. */
    scale?: number;
    /** How many of the leading qubits are controls. */
    controls?: number;
}

const NAMED_GATES: {[name: string]: NamedGate} = {
    'cirq.X': {kind: 'pauli', axis: 'X'},
    'cirq.Y': {kind: 'pauli', axis: 'Y'},
    'cirq.Z': {kind: 'pauli', axis: 'Z'},
    'cirq.S': {kind: 'pauli', axis: 'Z', scale: 0.5},
    'cirq.T': {kind: 'pauli', axis: 'Z', scale: 0.25},
    'cirq.H': {kind: 'h'},
    'cirq.SWAP': {kind: 'swap'},
    'cirq.CNOT': {kind: 'pauli', axis: 'X', controls: 1},
    'cirq.CX': {kind: 'pauli', axis: 'X', controls: 1},
    'cirq.CZ': {kind: 'pauli', axis: 'Z', controls: 1},
    'cirq.CCX': {kind: 'pauli', axis: 'X', controls: 2},
    'cirq.CCNOT': {kind: 'pauli', axis: 'X', controls: 2},
    'cirq.TOFFOLI': {kind: 'pauli', axis: 'X', controls: 2},
    'cirq.CCZ': {kind: 'pauli', axis: 'Z', controls: 2},
    'cirq.CSWAP': {kind: 'swap', controls: 1},
    'cirq.FREDKIN': {kind: 'swap', controls: 1}
};

const UNSUPPORTED_KEYWORDS = [
    'for', 'while', 'if', 'elif', 'else', 'def', 'class', 'with', 'return', 'lambda', 'try', 'except', 'finally',
    'async', 'await', 'yield', 'assert', 'del', 'global', 'raise'
];

// ---------------------------------------------------------------------------------------------------------------------
// Circuit -> Cirq.

function _qubitsText(wire: number, span: number): string {
    return span === 1 ? `q[${wire}]` : `*reversed(q[${wire}:${wire + span}])`;
}

/** A custom gate written as a cirq.MatrixGate variable. */
interface CustomGateCode {
    id: string;
    variable: string;
    /** The number of qubits the gate covers. */
    size: number;
    /** The line of code defining the variable. */
    line: string;
}

function _complexText(v: Complex): string {
    let {real, imag} = v;
    return imag === 0 ? String(real) :
        real === 0 ? `${imag}j` :
        `${real}${imag < 0 ? '-' : '+'}${Math.abs(imag)}j`;
}

function _canonicalGateJsonText(json: unknown): string {
    return JSON.stringify(Serializer.toJson(Serializer.fromJson(Gate, json)));
}

/**
 * @param json A custom gate definition from the circuit JSON.
 * @returns The definition as Cirq code, or undefined if the gate has no exact Cirq form
 * (it's defined by a circuit, or its matrix isn't unitary).
 */
function _customGateToCirq(json: GateJsonObject): CustomGateCode | undefined {
    let {id, name, matrix} = json;
    if (typeof id !== 'string' || !/^~\w+$/.test(id) || typeof matrix !== 'string' ||
            (name !== undefined && typeof name !== 'string') ||
            Object.keys(json).some(k => k !== 'id' && k !== 'name' && k !== 'matrix')) {
        return undefined;
    }
    let quote = name === undefined || name.indexOf("'") === -1 ? "'" : '"';
    if (name !== undefined && (/[\\\n]/.test(name) || (quote === '"' && name.indexOf('"') !== -1))) {
        return undefined;
    }

    try {
        let m: Matrix = Serializer.fromJson(Matrix, matrix);
        let n = m.width();
        if (n !== m.height() || !m.isUnitary(0.000001)) {
            return undefined;
        }
        let rows: string[] = [];
        for (let r = 0; r < n; r++) {
            let cells: string[] = [];
            for (let c = 0; c < n; c++) {
                cells.push(_complexText(m.cell(c, r)));
            }
            rows.push(`[${cells.join(', ')}]`);
        }
        let variable = `gate_${id.substring(1)}`;
        let nameArg = name === undefined ? '' : `, name=${quote}${name}${quote}`;
        let line = `${variable} = cirq.MatrixGate(np.array([${rows.join(', ')}])${nameArg})`;

        let reader = new _CirqReader();
        reader.readLine(line, 1);
        let readBack = reader.builder.customGateJsons;
        return readBack.length === 1 && _canonicalGateJsonText(readBack[0]) === _canonicalGateJsonText(json) ?
            {id, variable, size: Math.round(Math.log2(n)), line} :
            undefined;
    } catch (_) {
        return undefined;
    }
}

/**
 * @param text Cirq code for one operation.
 * @returns Whether reading the code back gives exactly the given gate.
 */
function _readsBackAs(text: string, entry: ColumnEntry): boolean {
    try {
        let call = new _CirqReader().readOperation(text);
        return call.controls.size === 0 && call.floating.length === 0 && call.targets.length === 1 &&
            call.targets[0].id === entry.id &&
            call.targets[0].arg === entry.arg;
    } catch (_) {
        return false;
    }
}

/**
 * @returns The gate as a Cirq operation, with `loose` set when it needs parentheses before a method call,
 * or undefined if the gate has no exact Cirq form.
 */
function _operationText(
        entry: ColumnEntry,
        customGates: CustomGateCode[]): {text: string, loose: boolean} | undefined {
    let q = `q[${entry.wire}]`;
    if (entry.raw !== undefined) {
        return undefined;
    }
    if (entry.arg === undefined) {
        let custom = customGates.find(e => e.id === entry.id);
        if (custom !== undefined) {
            return {text: `${custom.variable}(${_qubitsText(entry.wire, custom.size)})`, loose: false};
        }
        let scalar = SCALARS.find(e => e[0] === entry.id);
        if (scalar !== undefined) {
            return {text: `cirq.global_phase_operation(${scalar[1]})`, loose: false};
        }
        if (entry.id === 'H') {
            return {text: `cirq.H(${q})`, loose: false};
        }
        if (entry.id === 'Measure') {
            return {text: `cirq.measure(${q})`, loose: false};
        }
        let named = NAMED_POWERS.find(e => e[0] === entry.id);
        if (named !== undefined) {
            return {text: `cirq.${named[1]}(${q})` + (named[2] === '' ? '' : `**${named[2]}`), loose: named[2] !== ''};
        }
        let qft = entry.id.match(/^QFT(†?)(\d+)$/);
        if (qft !== null) {
            let qubits = _qubitsText(entry.wire, Number(qft[2]));
            return {text: `cirq.qft(${qubits}${qft[1] === '' ? '' : ', inverse=True'})`, loose: false};
        }
        let gradient = entry.id.match(/^Phase(Gradient|Ungradient)(\d+)$/);
        if (gradient !== null) {
            let n = Number(gradient[2]);
            let exponent = gradient[1] === 'Gradient' ? '0.5' : '-0.5';
            return {
                text: `cirq.PhaseGradientGate(num_qubits=${n}, exponent=${exponent})(${_qubitsText(entry.wire, n)})`,
                loose: false
            };
        }
    }

    let form = cirqFormOf(entry.id, entry.arg);
    if (form === undefined) {
        return undefined;
    }
    let isFormula = entry.arg !== undefined;
    if (form.kind === 'rot') {
        let name = `r${form.axis.toLowerCase()}`;
        let text = `cirq.${name}(${form.expr})(${q})`;
        if (isFormula && !_readsBackAs(text, entry)) {
            // The plain spelling would read back as another gate, such as a spinning gate.
            text = `cirq.R${form.axis.toLowerCase()}(rads=${form.expr})(${q})`;
        }
        return {text, loose: false};
    }
    if (form.expr === '1') {
        return {text: `cirq.${form.axis}(${q})`, loose: false};
    }
    let isBare = /^-?[\d.]+$/.test(form.expr) && !isFormula;
    let text = `cirq.${form.axis}(${q})**` + (isBare ? form.expr : `(${form.expr})`);
    if (isFormula && !_readsBackAs(text, entry)) {
        return {text: `cirq.${form.axis}PowGate(exponent=${form.expr})(${q})`, loose: false};
    }
    return {text, loose: true};
}

/**
 * @param entries A column's gates.
 * @param customGates The custom gates that were written as Cirq code.
 * @returns The column as a line of the Cirq circuit, or undefined if it has no exact Cirq form.
 */
function _columnToCirq(entries: ColumnEntry[], customGates: CustomGateCode[]): string | undefined {
    let controls = entries.filter(e => e.id === CONTROL_ID || e.id === ANTI_CONTROL_ID);
    let others = entries.filter(e => e.id !== CONTROL_ID && e.id !== ANTI_CONTROL_ID);
    let swaps = others.filter(e => e.id === 'Swap');
    if (others.length === 0 || (swaps.length !== 0 && swaps.length !== 2) ||
            (controls.length > 0 && others.some(e => e.id === 'Measure'))) {
        return undefined;
    }

    let suffix = '';
    if (controls.length > 0) {
        let values = controls.every(e => e.id === CONTROL_ID) ?
            '' :
            `, control_values=[${controls.map(e => e.id === CONTROL_ID ? 1 : 0).join(', ')}]`;
        suffix = `.controlled_by(${controls.map(e => `q[${e.wire}]`).join(', ')}${values})`;
    }

    let operations: string[] = [];
    for (let e of others) {
        let operation = e.id === 'Swap' ?
            (e === swaps[0] ? {text: `cirq.SWAP(q[${swaps[0].wire}], q[${swaps[1].wire}])`, loose: false} : null) :
            _operationText(e, customGates);
        if (operation === undefined) {
            return undefined;
        }
        if (operation !== null) {
            operations.push((suffix !== '' && operation.loose ? `(${operation.text})` : operation.text) + suffix);
        }
    }

    let line = controls.length > 0 && operations.length > 1 ?
        `[${operations.join(', ')}],` :
        `cirq.Moment(${operations.join(', ')}),`;
    return _readsBackAsColumn(line, entries, customGates) ? line : undefined;
}

/**
 * @param line A line of the circuit.
 * @returns Whether reading the line back gives exactly the given column.
 */
function _readsBackAsColumn(line: string, entries: ColumnEntry[], customGates: CustomGateCode[]): boolean {
    let expected: unknown[] = [];
    for (let e of entries) {
        while (expected.length < e.wire) {
            expected.push(1);
        }
        expected.push(e.raw !== undefined ? e.raw : e.arg === undefined ? e.id : {id: e.id, arg: e.arg});
    }
    try {
        let reader = new _CirqReader();
        for (let custom of customGates) {
            reader.readLine(custom.line, 1);
        }
        reader.readCircuitLine(line);
        return JSON.stringify(reader.builder.toJson().cols) === JSON.stringify([expected]);
    } catch (_) {
        return false;
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Cirq -> circuit.

/** A gate before it's known which QubitBoard gate it is. */
interface GateValue {
    kind: 'pauli' | 'rot' | 'h' | 'swap' | 'measure' | 'qft' | 'gradient' | 'scalar' | 'custom';
    /** The gate as written, for error messages. */
    name: string;
    axis?: Axis;
    scale: number;
    /** The exponent of a pauli gate, or the angle of a rotation. */
    expr?: Node;
    /** Set when the gate was spelled as a formula gate (cirq.XPowGate, cirq.Rx, ...). */
    spelledOut: boolean;
    builtinControls: number;
    /** Set when the gate applies to each of its qubits separately. */
    each: boolean;
    size?: number;
    backward?: boolean;
    /** The QubitBoard gate id, for scalar and custom gates. */
    id?: string;
}

interface OperationValue {
    gate: GateValue;
    wires: number[];
    controls: Map<number, string>;
}

type Value =
    {kind: 'gate', gate: GateValue} |
    {kind: 'operation', operation: OperationValue} |
    {kind: 'controlled_by', operation: OperationValue};

interface GateCall {
    /** Control gate id by wire. */
    controls: Map<number, string>;
    targets: Array<{wire: number, id: string, arg: string | undefined}>;
    /** Ids of gates that have no qubit in Cirq (global phases). They go on the column's first free wire. */
    floating: string[];
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
 * @returns The line's code and its comment (without the '#').
 */
function _splitComment(line: string): {code: string, comment: string | undefined} {
    let quote: string | undefined = undefined;
    for (let i = 0; i < line.length; i++) {
        let c = line[i];
        if (quote !== undefined) {
            if (c === quote) {
                quote = undefined;
            }
        } else if (c === '"' || c === "'") {
            quote = c;
        } else if (c === '#') {
            return {code: line.substring(0, i), comment: line.substring(i + 1)};
        }
    }
    return {code: line, comment: undefined};
}

/**
 * Reads Cirq code line by line into circuit JSON.
 */
class _CirqReader {
    builder = new CircuitJsonBuilder();
    /** Declared qubit names, each standing for one or more wires. */
    private _qubits = new Map<string, number[]>();
    private _qubitCount = 0;
    /** Custom gates by variable name. */
    private _customGates = new Map<string, {id: string, size: number}>();
    private _inCircuit = false;
    private _line: number | undefined = undefined;
    private _source = '';

    readLine(text: string, line: number): void {
        this._line = line;
        let {code, comment} = _splitComment(text);
        this._readCode(code.trim());
        if (comment !== undefined) {
            let c = comment.trim();
            if (c.startsWith(PRAGMA)) {
                parseDslLine(c.substring(PRAGMA.length), line, this.builder);
            }
        }
    }

    /**
     * @param text A line from inside the circuit's list of operations.
     */
    readCircuitLine(text: string): void {
        this._inCircuit = true;
        this._readCode(text);
    }

    /**
     * @param text Code for a single operation.
     */
    readOperation(text: string): GateCall {
        this._source = text;
        return this._toGateCall(_parseExpr(text, undefined));
    }

    private _fail(message: string): never {
        throw new CodeError(message, this._line);
    }

    private _readCode(code: string): void {
        if (code === '') {
            return;
        }
        this._source = code;
        let word = (code.match(/^[A-Za-z_]\w*/) || [''])[0];
        if (UNSUPPORTED_KEYWORDS.indexOf(word) !== -1) {
            this._fail(`'${word}' isn't supported by QubitBoard. Write the circuit as a flat list of operations.`);
        }
        if (word === 'import' || word === 'from' || /^print\s*\(/.test(code)) {
            return;
        }

        let tokens = _tokenize(code, this._line);
        if (this._inCircuit) {
            this._readCircuitTokens(tokens);
            return;
        }

        let depth = 0;
        let equals = tokens.findIndex(e => {
            depth += e.kind !== 'op' ? 0 : '([{'.indexOf(e.text) !== -1 ? 1 : ')]}'.indexOf(e.text) !== -1 ? -1 : 0;
            return depth === 0 && e.kind === 'op' && e.text === '=';
        });
        if (equals !== -1) {
            this._readAssignment(tokens.slice(0, equals), tokens.slice(equals + 1));
            return;
        }

        if (tokens.length > 1 && tokens[0].kind === 'name' && /\.append$/.test(tokens[0].text) &&
                tokens[1].text === '(') {
            let call = new _ExprParser(tokens, code, this._line).parseSingle();
            if (call.k === 'call' && call.args.length > 0 && call.args[0].name === undefined) {
                this._addElements([call.args[0].value]);
                return;
            }
        }
        this._fail(`Couldn't understand '${code}'.`);
    }

    private _readAssignment(targetTokens: Token[], valueTokens: Token[]): void {
        let targets = targetTokens.filter(e => e.text !== ',');
        if (targets.length === 0 || targets.some(e => e.kind !== 'name' || e.text.indexOf('.') !== -1) ||
                valueTokens.length === 0) {
            this._fail(`Couldn't understand '${this._source}'.`);
        }
        let names = targets.map(e => e.text);
        let head = valueTokens[0].text;

        if (head === 'cirq.Circuit' && valueTokens.length > 1 && valueTokens[1].text === '(') {
            this._inCircuit = true;
            this._readCircuitTokens(valueTokens.slice(2));
            return;
        }

        if (head === 'cirq.LineQubit.range' || head === 'cirq.LineQubit') {
            let wires = this._wiresOf(new _ExprParser(valueTokens, this._source, this._line).parseSingle());
            if (names.length === 1) {
                this._qubits.set(names[0], wires);
            } else if (names.length === wires.length) {
                names.forEach((name, i) => this._qubits.set(name, [wires[i]]));
            } else {
                this._fail(`${names.length} names can't hold ${wires.length} qubits.`);
            }
            this._qubitCount = Math.max(this._qubitCount, ...wires.map(e => e + 1));
            this.builder.setQubitCount(this._qubitCount, this._line!);
            return;
        }

        if (head === 'cirq.MatrixGate') {
            if (names.length !== 1) {
                this._fail('A cirq.MatrixGate needs one name.');
            }
            this._readMatrixGate(names[0], new _ExprParser(valueTokens, this._source, this._line).parseSingle());
            return;
        }

        if (head === 'sympy.Symbol' || head === 'sympy.symbols') {
            let call = new _ExprParser(valueTokens, this._source, this._line).parseSingle();
            let arg = call.k === 'call' && call.args.length === 1 ? call.args[0].value : undefined;
            if (names.length !== 1 || names[0] !== 't' || arg === undefined || arg.k !== 'str' || arg.value !== 't') {
                this._fail("QubitBoard only has the time symbol: t = sympy.Symbol('t').");
            }
            return;
        }

        if (/^cirq\.\w*Qubit/.test(head)) {
            this._fail('QubitBoard needs line qubits, like q = cirq.LineQubit.range(3).');
        }
        this._fail(`Couldn't understand '${this._source}'.`);
    }

    /**
     * Reads "name = cirq.MatrixGate(np.array([[...], ...]), name='...')" as a custom gate.
     */
    private _readMatrixGate(variable: string, node: Node): void {
        if (node.k !== 'call') {
            return this._fail(`Couldn't understand '${this._source}'.`);
        }
        let nameNode = this._namedArg(node, 'name', ['name']);
        if (nameNode !== undefined && nameNode.k !== 'str') {
            this._fail("A gate's name must be text, like name='Oracle'.");
        }
        let positional = this._positional(node);
        let rowsNode = positional[0];
        if (rowsNode !== undefined && rowsNode.k === 'call' && rowsNode.fn.k === 'name' &&
                /^(?:np|numpy)\.array$/.test(rowsNode.fn.name) && rowsNode.args.length === 1) {
            rowsNode = rowsNode.args[0].value;
        }
        if (positional.length !== 1 || rowsNode.k !== 'list') {
            return this._fail('cirq.MatrixGate needs a matrix, like cirq.MatrixGate(np.array([[0, 1], [1, 0]])).');
        }

        let n = rowsNode.items.length;
        let rows = rowsNode.items.map(row => {
            if (row.k !== 'list' || row.items.length !== n) {
                return this._fail('A gate matrix must be square, with one list per row.');
            }
            return row.items.map(cell => {
                let v = _evalComplex(cell);
                return v !== undefined ? v : this._fail(`Can't evaluate '${this._text(cell)}'.`);
            });
        });
        if ([2, 4, 8, 16].indexOf(n) === -1) {
            this._fail('A gate matrix must be square with size 2, 4, 8 or 16.');
        }
        if (this._customGates.has(variable) || NAMED_GATES[variable] !== undefined) {
            this._fail(`The gate '${variable}' is defined twice.`);
        }

        let id = '~' + variable.replace(/^gate_/, '');
        let matrix: string = Serializer.toJson(Matrix.fromRows(rows));
        let json: GateJsonObject = nameNode === undefined ? {id, matrix} : {id, name: nameNode.value, matrix};
        this.builder.addCustomGate(json, this._line!);
        this._customGates.set(variable, {id, size: Math.round(Math.log2(n))});
    }

    /**
     * Reads what follows "cirq.Circuit(": operations, and possibly the brackets that open or close the circuit.
     */
    private _readCircuitTokens(tokens: Token[]): void {
        let open: number[] = [];
        let end = tokens.length;
        for (let i = 0; i < tokens.length; i++) {
            let {kind, text} = tokens[i];
            if (kind !== 'op') {
                continue;
            }
            if (text === '(' || text === '[') {
                open.push(i);
            } else if (text === ')' || text === ']') {
                if (open.length === 0) {
                    end = i;
                    break;
                }
                open.pop();
            }
        }

        for (let closer of tokens.slice(end)) {
            if (closer.kind !== 'op' || ']),'.indexOf(closer.text) === -1) {
                this._fail(`Couldn't understand '${closer.text}' after the end of the circuit.`);
            }
            if (closer.text === ')') {
                this._inCircuit = false;
            }
        }

        let content = tokens.slice(0, end);
        if (open.length === 1 && tokens[open[0]].text === '[') {
            // The bracket opening the circuit's list of moments.
            content.splice(open[0], 1);
        } else if (open.length > 0) {
            this._fail(`Missing '${tokens[open[open.length - 1]].text === '(' ? ')' : ']'}'.`);
        }
        this._addElements(new _ExprParser(content, this._source, this._line).parseAll());
    }

    /**
     * Adds the operations of one line. Each moment or list starts a new column, and so does the line.
     */
    private _addElements(elements: Node[]): void {
        let flatten = (node: Node): Node[] =>
            node.k === 'list' ? ([] as Node[]).concat(...node.items.map(flatten)) :
            node.k === 'star' ? flatten(node.operand) :
            [node];

        let columnControls: Map<number, string> | undefined = undefined;
        for (let element of elements) {
            let isMoment = element.k === 'call' && element.fn.k === 'name' && element.fn.name === 'cirq.Moment';
            let operations = element.k === 'call' && isMoment ?
                ([] as Node[]).concat(...element.args.map(e => flatten(e.value))) :
                flatten(element);
            if (isMoment || element.k === 'list') {
                columnControls = undefined;
            }
            for (let operation of operations) {
                columnControls = this._place(this._toGateCall(operation), columnControls);
            }
            if (isMoment || element.k === 'list') {
                columnControls = undefined;
            }
        }
    }

    /**
     * @param columnControls The controls of the column being filled, or undefined if a new column is needed.
     * @returns The controls of the column the operation went into.
     */
    private _place(call: GateCall, columnControls: Map<number, string> | undefined): Map<number, string> {
        let gates = call.targets.map(e => ({...e, gate: this._knownGate(e.id)}));
        let hasSwap = (ids: string[]) => ids.indexOf('Swap') !== -1;
        let column = this.builder.columns[this.builder.columns.length - 1];
        let fits = columnControls !== undefined &&
            _sameControls(columnControls, call.controls) &&
            gates.every(e => !this.builder.currentColumnTouches(e.wire, e.gate.height)) &&
            !(hasSwap(call.targets.map(e => e.id)) &&
                hasSwap([...column.values()].map(e => typeof e.json === 'string' ? e.json : '')));
        if (!fits) {
            this.builder.startColumn();
            for (let [wire, id] of call.controls.entries()) {
                this.builder.addGate(wire, this._knownGate(id), undefined, this._line!);
            }
        }
        for (let {wire, gate, arg} of gates) {
            this.builder.addGate(wire, gate, arg, this._line!);
        }
        for (let id of call.floating) {
            let wire = 0;
            while (this.builder.currentColumnTouches(wire)) {
                wire++;
            }
            this.builder.addGate(wire, this._knownGate(id), undefined, this._line!);
        }
        return call.controls;
    }

    private _knownGate(id: string): Gate {
        let gate = findGateByName(id, this.builder.customGateSet);
        if (gate === undefined) {
            return this._fail(`QubitBoard has no '${id}' gate.`);
        }
        return gate;
    }

    private _text(node: Node): string {
        return this._source.substring(node.start, node.end);
    }

    // -- Qubits.

    private _register(name: string): number[] {
        let wires = this._qubits.get(name);
        if (wires === undefined) {
            if (name !== 'q' || this._qubits.size > 0) {
                return this._fail(`Unknown qubit '${name}'. Declare it with '${name} = cirq.LineQubit.range(n)'.`);
            }
            // Allow skipping the declaration entirely: 'q' is then as large as it needs to be.
            wires = Array.from({length: Config.MAX_WIRE_COUNT}, (_, i) => i);
            this._qubits.set('q', wires);
        }
        return wires;
    }

    private _wholeNumber(node: Node | undefined): number {
        if (node === undefined || node.k !== 'num' || !Number.isInteger(node.value)) {
            return this._fail(
                `Expected a whole number but found '${node === undefined ? '' : this._text(node)}'.`);
        }
        return node.value;
    }

    /**
     * @returns The wires that a qubit expression like "q[2]", "*q[0:3]" or "cirq.LineQubit(1)" refers to.
     */
    private _wiresOf(node: Node): number[] {
        switch (node.k) {
            case 'star':
                return this._wiresOf(node.operand);
            case 'list':
                return ([] as number[]).concat(...node.items.map(e => this._wiresOf(e)));
            case 'name':
                return this._register(node.name);
            case 'index': {
                let name = node.obj.k === 'name' ? node.obj.name : this._fail(`Expected a qubit like 'q[0]'.`);
                let wires = this._register(name);
                let i = this._wholeNumber(node.index);
                if (i >= wires.length) {
                    this._fail(`${name}[${i}] is out of range: '${name}' has ${wires.length} qubits.`);
                }
                return [wires[i]];
            }
            case 'slice': {
                let wires = this._wiresOf(node.obj);
                let from = node.from === undefined ? 0 : this._wholeNumber(node.from);
                let to = node.to === undefined ? wires.length : this._wholeNumber(node.to);
                if (to > wires.length) {
                    this._fail(`'${this._text(node)}' is out of range: there are ${wires.length} qubits.`);
                }
                return wires.slice(from, to);
            }
            case 'call': {
                let name = node.fn.k === 'name' ? node.fn.name : '';
                let args = node.args.map(e => e.name === undefined ? e.value : this._fail(
                    `Unexpected '${e.name}=' in '${this._text(node)}'.`));
                if (name === 'reversed' && args.length === 1) {
                    return this._wiresOf(args[0]).reverse();
                }
                if (name === 'cirq.LineQubit' && args.length === 1) {
                    return [this._checkedWire(this._wholeNumber(args[0]))];
                }
                if (name === 'cirq.LineQubit.range' && (args.length === 1 || args.length === 2)) {
                    let from = args.length === 1 ? 0 : this._wholeNumber(args[0]);
                    let to = this._checkedWire(this._wholeNumber(args[args.length - 1]) - 1) + 1;
                    return Array.from({length: Math.max(0, to - from)}, (_, i) => from + i);
                }
                if (/^cirq\.\w*Qubit/.test(name)) {
                    this._fail('QubitBoard needs line qubits, like q = cirq.LineQubit.range(3).');
                }
                return this._fail(`Expected a qubit but found '${this._text(node)}'.`);
            }
            default:
                return this._fail(`Expected a qubit but found '${this._text(node)}'.`);
        }
    }

    private _checkedWire(wire: number): number {
        if (wire < 0 || wire >= Config.MAX_WIRE_COUNT) {
            this._fail(`QubitBoard supports at most ${Config.MAX_WIRE_COUNT} qubits.`);
        }
        return wire;
    }

    // -- Gates and operations.

    private _namedArg(node: Node & {k: 'call'}, name: string, allowed: string[]): Node | undefined {
        for (let arg of node.args) {
            if (arg.name !== undefined && allowed.indexOf(arg.name) === -1) {
                this._fail(`'${arg.name}' isn't supported by QubitBoard in '${this._text(node)}'.`);
            }
        }
        let found = node.args.find(e => e.name === name);
        return found === undefined ? undefined : found.value;
    }

    private _flag(node: Node | undefined): boolean {
        if (node === undefined) {
            return false;
        }
        if (node.k !== 'name' || (node.name !== 'True' && node.name !== 'False')) {
            return this._fail(`Expected True or False but found '${this._text(node)}'.`);
        }
        return node.name === 'True';
    }

    private _newGate(kind: GateValue['kind'], name: string, extra: Partial<GateValue> = {}): GateValue {
        return {kind, name, scale: 1, spelledOut: false, builtinControls: 0, each: false, ...extra};
    }

    /**
     * @returns The gate named by a dotted name like "cirq.X" or "cirq.H.on_each".
     */
    private _gateFromName(dotted: string): GateValue {
        let m = dotted.match(/^(.*?)(\.on|\.on_each)?$/)!;
        let name = m[1];
        let custom = this._customGates.get(name);
        if (custom !== undefined) {
            return this._newGate('custom', name, {id: custom.id, size: custom.size, each: m[2] === '.on_each'});
        }
        let known = NAMED_GATES[name];
        if (known === undefined) {
            return this._fail(/^cirq\./.test(name) ?
                `'${name}' isn't supported by QubitBoard.` :
                `Couldn't understand '${dotted}'.`);
        }
        return this._newGate(known.kind, name, {
            axis: known.axis,
            scale: known.scale === undefined ? 1 : known.scale,
            builtinControls: known.controls || 0,
            each: m[2] === '.on_each'
        });
    }

    private _positional(node: Node & {k: 'call'}): Node[] {
        return node.args.filter(e => e.name === undefined).map(e => e.value);
    }

    private _evaluate(node: Node): Value {
        switch (node.k) {
            case 'name':
                return {kind: 'gate', gate: this._gateFromName(node.name)};

            case 'attr': {
                let inner = this._evaluate(node.obj);
                if (inner.kind === 'gate' && (node.name === 'on' || node.name === 'on_each')) {
                    return {kind: 'gate', gate: {...inner.gate, each: inner.gate.each || node.name === 'on_each'}};
                }
                if (inner.kind === 'operation' && node.name === 'controlled_by') {
                    return {kind: 'controlled_by', operation: inner.operation};
                }
                return this._fail(`'.${node.name}' isn't supported by QubitBoard.`);
            }

            case 'pow': {
                let inner = this._evaluate(node.left);
                if (inner.kind === 'controlled_by') {
                    return this._fail(`Couldn't understand '${this._text(node)}'.`);
                }
                let gate = this._raised(inner.kind === 'gate' ? inner.gate : inner.operation.gate, node.right);
                return inner.kind === 'gate' ?
                    {kind: 'gate', gate} :
                    {kind: 'operation', operation: {...inner.operation, gate}};
            }

            case 'call':
                return this._evaluateCall(node);

            default:
                return this._fail(`Couldn't understand '${this._text(node)}'.`);
        }
    }

    private _raised(gate: GateValue, exponent: Node): GateValue {
        if (gate.kind === 'pauli' && gate.expr === undefined && !gate.spelledOut) {
            return {...gate, expr: exponent};
        }
        if (!_usesTime(exponent) && _evalNode(exponent, 0) === 1) {
            return gate;
        }
        return this._fail(`QubitBoard can't raise ${gate.name} to the power '${this._text(exponent)}'.`);
    }

    private _evaluateCall(node: Node & {k: 'call'}): Value {
        let name = node.fn.k === 'name' ? node.fn.name : '';
        let positional = this._positional(node);

        let rotation = name.match(/^cirq\.(r|R)([xyz])$/);
        if (rotation !== null) {
            let spelledOut = rotation[1] === 'R';
            let angle = spelledOut ? this._namedArg(node, 'rads', ['rads']) : this._namedArg(node, '', []);
            if (!spelledOut && positional.length === 1) {
                angle = positional[0];
            }
            if (angle === undefined) {
                this._fail(spelledOut ? `${name} needs an angle, like ${name}(rads=sympy.pi/2).` :
                    `${name} needs one angle, like ${name}(sympy.pi/2).`);
            }
            let axis = rotation[2].toUpperCase() as Axis;
            return {kind: 'gate', gate: this._newGate('rot', name, {axis, expr: angle, spelledOut})};
        }

        let power = name.match(/^cirq\.([XYZ])PowGate$/);
        if (power !== null) {
            let expr = this._namedArg(node, 'exponent', ['exponent']);
            if (positional.length > 0) {
                this._fail(`${name} takes its exponent by name, like ${name}(exponent=0.5).`);
            }
            return {kind: 'gate', gate: this._newGate('pauli', name, {axis: power[1] as Axis, expr, spelledOut: true})};
        }

        if (name === 'cirq.measure') {
            this._namedArg(node, '', ['key']);
            let wires = ([] as number[]).concat(...positional.map(e => this._wiresOf(e)));
            return this._operation(this._newGate('measure', name, {each: true}), wires);
        }

        if (name === 'cirq.qft') {
            if (this._flag(this._namedArg(node, 'without_reverse', ['inverse', 'without_reverse']))) {
                this._fail("QubitBoard's QFT always includes the final swaps: remove without_reverse.");
            }
            let backward = this._flag(this._namedArg(node, 'inverse', ['inverse', 'without_reverse']));
            let wires = ([] as number[]).concat(...positional.map(e => this._wiresOf(e)));
            return this._operation(this._newGate('qft', name, {size: wires.length, backward}), wires);
        }

        if (name === 'cirq.QuantumFourierTransformGate') {
            if (this._flag(this._namedArg(node, 'without_reverse', ['num_qubits', 'without_reverse']))) {
                this._fail("QubitBoard's QFT always includes the final swaps: remove without_reverse.");
            }
            let size = this._wholeNumber(positional[0] || this._namedArg(node, 'num_qubits', ['num_qubits', 'without_reverse']));
            return {kind: 'gate', gate: this._newGate('qft', name, {size, backward: false})};
        }

        if (name === 'cirq.PhaseGradientGate') {
            let size = this._wholeNumber(this._namedArg(node, 'num_qubits', ['num_qubits', 'exponent']));
            let exponentNode = this._namedArg(node, 'exponent', ['num_qubits', 'exponent']);
            let exponent = exponentNode === undefined || _usesTime(exponentNode) ? undefined : _evalNode(exponentNode, 0);
            if (exponent !== 0.5 && exponent !== -0.5) {
                this._fail("QubitBoard's phase gradient gates need exponent=0.5 or exponent=-0.5.");
            }
            return {kind: 'gate', gate: this._newGate('gradient', name, {size, backward: exponent === -0.5})};
        }

        if (name === 'cirq.global_phase_operation') {
            this._namedArg(node, '', []);
            let shape = positional.length === 1 ? this._text(positional[0]).replace(/\s+/g, '') : '';
            let scalar = SCALARS.find(e => e[1] === shape);
            if (scalar === undefined) {
                return this._fail(
                    `QubitBoard's phase gates are ${SCALARS.map(e => `cirq.global_phase_operation(${e[1]})`).join(', ')}.`);
            }
            return this._operation(this._newGate('scalar', name, {id: scalar[0]}), []);
        }

        if (name === 'cirq.Moment' || name === 'cirq.Circuit') {
            this._fail(`${name} can't be used inside an operation.`);
        }

        let callee = this._evaluate(node.fn);
        if (callee.kind === 'gate') {
            this._namedArg(node, '', []);
            let wires = ([] as number[]).concat(...positional.map(e => this._wiresOf(e)));
            return this._operation(callee.gate, wires);
        }
        if (callee.kind === 'controlled_by') {
            let valuesNode = this._namedArg(node, 'control_values', ['control_values']);
            let wires = ([] as number[]).concat(...positional.map(e => this._wiresOf(e)));
            let values = wires.map(() => 1);
            if (valuesNode !== undefined) {
                if (valuesNode.k !== 'list' || valuesNode.items.length !== wires.length) {
                    this._fail(`control_values needs one value per control qubit, like control_values=[1, 0].`);
                }
                values = valuesNode.items.map(e => this._wholeNumber(e));
                if (values.some(e => e !== 0 && e !== 1)) {
                    this._fail('control_values can only hold 0 and 1.');
                }
            }
            let controls = new Map(callee.operation.controls);
            wires.forEach((wire, i) => {
                if (controls.has(wire) || callee.operation.wires.indexOf(wire) !== -1) {
                    this._fail(`q[${wire}] is used more than once in '${this._text(node)}'.`);
                }
                controls.set(wire, values[i] === 1 ? CONTROL_ID : ANTI_CONTROL_ID);
            });
            return {kind: 'operation', operation: {...callee.operation, controls}};
        }
        return this._fail(`Couldn't understand '${this._text(node)}'.`);
    }

    private _operation(gate: GateValue, wires: number[]): Value {
        return {kind: 'operation', operation: {gate, wires, controls: new Map()}};
    }

    private _toGateCall(node: Node): GateCall {
        let value = this._evaluate(node);
        if (value.kind !== 'operation') {
            return this._fail(value.kind === 'gate' ?
                `'${this._text(node)}' needs qubits, like ${value.gate.name}(q[0]).` :
                `Couldn't understand '${this._text(node)}'.`);
        }
        let {gate, wires} = value.operation;
        if (new Set(wires).size !== wires.length) {
            this._fail(`A qubit is used more than once in '${this._text(node)}'.`);
        }

        let controls = new Map<number, string>();
        for (let wire of wires.slice(0, gate.builtinControls)) {
            controls.set(wire, CONTROL_ID);
        }
        for (let [wire, id] of value.operation.controls.entries()) {
            controls.set(wire, id);
        }
        let targetWires = wires.slice(gate.builtinControls);
        let expectTargets = (count: number) => {
            if (wires.length < gate.builtinControls + count || (!gate.each && targetWires.length !== count)) {
                this._fail(`${gate.name} needs ${gate.builtinControls + count} qubit(s) but got ${wires.length}.`);
            }
        };

        if (gate.kind === 'scalar') {
            return {controls, targets: [], floating: [gate.id!]};
        }
        if (gate.kind === 'measure') {
            if (controls.size > 0) {
                this._fail("QubitBoard can't control a measurement.");
            }
            expectTargets(1);
            return {controls, targets: targetWires.map(wire => ({wire, id: 'Measure', arg: undefined})), floating: []};
        }
        if (gate.kind === 'swap') {
            expectTargets(2);
            return {controls, targets: targetWires.map(wire => ({wire, id: 'Swap', arg: undefined})), floating: []};
        }
        if (gate.kind === 'qft' || gate.kind === 'gradient' || gate.kind === 'custom') {
            let what = gate.kind === 'qft' ? 'QFT' : gate.kind === 'gradient' ? 'phase gradient' : 'custom gate';
            if (targetWires.length !== gate.size || targetWires.length === 0) {
                this._fail(`${gate.name} needs ${gate.size} qubit(s) but got ${targetWires.length}.`);
            }
            if (targetWires.some((wire, i) => wire !== targetWires[0] - i)) {
                this._fail(`QubitBoard's ${what} needs neighboring qubits listed from the bottom up, ` +
                    'like *reversed(q[0:3]).');
            }
            let id = gate.kind === 'custom' ? gate.id! :
                gate.kind === 'qft' ? `${gate.backward ? 'QFT†' : 'QFT'}${gate.size}` :
                `${gate.backward ? 'PhaseUngradient' : 'PhaseGradient'}${gate.size}`;
            let top = targetWires[targetWires.length - 1];
            return {controls, targets: [{wire: top, id, arg: undefined}], floating: []};
        }

        expectTargets(1);
        let {id, arg} = this._identify(gate);
        return {controls, targets: targetWires.map(wire => ({wire, id, arg})), floating: []};
    }

    /**
     * @returns The QubitBoard gate that a single-qubit Cirq gate is.
     */
    private _identify(gate: GateValue): {id: string, arg: string | undefined} {
        if (gate.kind === 'h') {
            return {id: 'H', arg: undefined};
        }
        let axis = gate.axis!;
        let formulaId = gate.kind === 'rot' ? `R${axis.toLowerCase()}ft` : `${axis}^ft`;
        let formula = (node: Node) => _nodeToFormula(node, this._source, this._line);
        let shape = gate.expr === undefined ? '' : _textOf(gate.expr, this._source).
            replace(/\s+/g, '').
            replace(/\b(?:np|numpy|math)\.pi\b/g, 'sympy.pi');
        let matches = (pattern: string) => shape === pattern.replace(/\s+/g, '');

        if (gate.spelledOut) {
            return {id: formulaId, arg: gate.expr === undefined ? '1' : formula(gate.expr)};
        }
        if (gate.kind === 'rot') {
            let expr = gate.expr!;
            return matches(TURN_FORWARD) ? {id: `e^-i${axis}t`, arg: undefined} :
                matches(TURN_BACKWARD) ? {id: `e^i${axis}t`, arg: undefined} :
                {id: formulaId, arg: formula(expr)};
        }

        if (gate.expr !== undefined && _usesTime(gate.expr)) {
            if (gate.scale !== 1) {
                this._fail(`QubitBoard can't raise ${gate.name} to the power '${this._text(gate.expr)}'. ` +
                    `Use cirq.${axis} instead.`);
            }
            return matches(SPIN_FORWARD) ? {id: `${axis}^t`, arg: undefined} :
                matches(SPIN_BACKWARD) ? {id: `${axis}^-t`, arg: undefined} :
                {id: formulaId, arg: formula(gate.expr)};
        }

        let exponent = gate.expr === undefined ? 1 : _evalNode(gate.expr, 0);
        if (exponent === undefined) {
            return this._fail(`Can't evaluate '${this._text(gate.expr!)}'.`);
        }
        let total = exponent * gate.scale;
        if (Math.abs(total - 1) < 1e-9) {
            return {id: axis, arg: undefined};
        }
        let fixed = _getFixedPowers().find(e => e.axis === axis && Math.abs(e.value - total) < 1e-9);
        if (fixed !== undefined) {
            return {id: fixed.id, arg: undefined};
        }
        if (gate.scale !== 1) {
            this._fail(`QubitBoard can't raise ${gate.name} to the power '${this._text(gate.expr!)}'. ` +
                `Use cirq.${axis} instead.`);
        }
        return {id: formulaId, arg: formula(gate.expr!)};
    }
}

const HEADER_COMMENT = '# One line per column. "# @qb" lines hold QubitBoard-only gates; Cirq ignores them.';

const Cirq: CodeLanguage = {
    id: 'cirq',
    label: 'Cirq',
    commentPrefix: '#',

    emit(jsonText: string): string {
        let model = new CircuitModel(jsonText);
        let customGates: CustomGateCode[] = [];
        let customGateLines = model.customGates.map(g => {
            let code = _customGateToCirq(g);
            if (code === undefined) {
                return `# ${PRAGMA} ${formatCustomGate(g)}`;
            }
            customGates.push(code);
            return code.line;
        });

        let body: string[] = [];
        let usesSympy = false;
        let usesTime = false;
        for (let col of model.columns) {
            let cirq = _columnToCirq(col, customGates);
            if (cirq === undefined) {
                body.push(`# ${PRAGMA} ${formatColumn(col, true)}`);
                continue;
            }
            body.push(cirq);
            usesTime = usesTime || /(^|[^\w.])t(?![\w(])/.test(cirq);
            usesSympy = usesSympy || /\bsympy\./.test(cirq);
        }

        let lines = ['import cirq'];
        if (customGates.length > 0) {
            lines.push('import numpy as np');
        }
        if (usesSympy || usesTime) {
            lines.push('import sympy');
        }
        lines.push('', HEADER_COMMENT);
        if (usesTime) {
            lines.push("t = sympy.Symbol('t')  # QubitBoard's time, which runs from -1 to 1");
        }
        lines.push(`q = cirq.LineQubit.range(${model.numWires})`);
        for (let {wire, state} of model.init) {
            lines.push(`# ${PRAGMA} ${formatInit(wire, state, true)}`);
        }
        lines.push(...customGateLines, '', 'circuit = cirq.Circuit([');
        for (let line of body) {
            lines.push(`    ${line}`);
        }
        lines.push('])');
        return lines.join('\n') + '\n';
    },

    parse(text: string): string {
        let reader = new _CirqReader();
        let lines = text.split('\n');
        for (let i = 0; i < lines.length; i++) {
            reader.readLine(lines[i], i + 1);
        }
        return canonicalCircuitJsonText(reader.builder.toJson());
    },

    highlightRules: [
        ['#\\s*@qb.*', 'pragma'],
        ['#.*', 'cm'],
        ['\'[^\']*\'|"[^"]*"', 'str'],
        ['\\b(?:import|from|as|print|reversed|True|False)\\b', 'kw'],
        ['\\b(?:controlled_by|control_values|inverse)\\b', 'ctl'],
        ['\\b[A-Za-z_]\\w*\\[[\\d:\\s]*\\]', 'wire'],
        ['\\bpi\\b|\\b\\d+(?:\\.\\d+)?\\b', 'num']
    ]
};

export {Cirq, cirqFormOf, cirqToFormula, evalCirqExpr, formulaToCirq}
export type {CirqGateForm}

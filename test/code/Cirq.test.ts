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

import {Suite, assertThat} from "../TestUtil.js"
import {CodeError} from "../../src/code/CodeError.js"
import {Cirq, cirqFormOf, cirqToFormula, evalCirqExpr, formulaToCirq} from "../../src/code/languages/Cirq.js"
import {Complex} from "../../src/math/Complex.js"
import {CustomGateSet} from "../../src/circuit/CustomGateSet.js"
import {Gates} from "../../src/gates/AllGates.js"
import {Matrix} from "../../src/math/Matrix.js"
import {EXAMPLE_CIRCUITS, assertCodeRoundTrip, assertEveryGateRoundTrips} from "./CodeTestUtil.js"

let suite = new Suite("Cirq");

let parseError = (code: string): CodeError => {
    try {
        Cirq.parse(code);
    } catch (ex) {
        if (ex instanceof CodeError) {
            return ex;
        }
        throw ex;
    }
    throw new Error(`Expected a CodeError for: ${code}`);
};

/** The lines of the emitted circuit list, without the surrounding code. */
let emitBody = (jsonText: string): string[] => {
    let lines = Cirq.emit(jsonText).split('\n');
    let start = lines.indexOf('circuit = cirq.Circuit([');
    let end = lines.indexOf('])');
    return lines.slice(start + 1, end).map(e => e.trim());
};

/** Wraps circuit lines in the code needed to parse them. */
let circuitOf = (...lines: string[]): string => ['circuit = cirq.Circuit([', ...lines, '])'].join('\n');

suite.test("roundTrip_everyGate", () => {
    assertEveryGateRoundTrips(Cirq);
});

suite.test("roundTrip_examples", () => {
    for (let name of Object.keys(EXAMPLE_CIRCUITS)) {
        assertCodeRoundTrip(Cirq, EXAMPLE_CIRCUITS[name]);
    }
    assertCodeRoundTrip(Cirq, {cols: []});
});

suite.test("roundTrip_formulasThatLookLikeOtherGates", () => {
    for (let arg of ["1/2", "1", "0.25", "t + 1", "-(t + 1)", "t+1", "0", "pi*t", "pi * t", "2pi", "PI"]) {
        assertCodeRoundTrip(Cirq, {cols: [[{id: "X^ft", arg}], ["•", {id: "Z^ft", arg}]]});
    }
    for (let arg of ["2*pi*(t + 1)", "-2*pi*(t + 1)", "pi/2", "-pi^2/3", "sqrt(2) pi", "ln(e) t"]) {
        assertCodeRoundTrip(Cirq, {cols: [[{id: "Rxft", arg}], ["◦", 1, {id: "Rzft", arg}]]});
    }
});

suite.test("emit_wholeProgram", () => {
    assertThat(Cirq.emit('{"cols":[["H"],["•","X"]]}')).isEqualTo([
        'import cirq',
        '',
        '# One line per column. "# @qb" lines hold QubitBoard-only gates; Cirq ignores them.',
        'q = cirq.LineQubit.range(2)',
        '',
        'circuit = cirq.Circuit([',
        '    cirq.Moment(cirq.H(q[0])),',
        '    cirq.Moment(cirq.X(q[1]).controlled_by(q[0])),',
        '])',
        ''
    ].join('\n'));

    assertThat(Cirq.emit('{"cols":[["X^t"],["Chance"]],"init":[1]}')).isEqualTo([
        'import cirq',
        'import sympy',
        '',
        '# One line per column. "# @qb" lines hold QubitBoard-only gates; Cirq ignores them.',
        "t = sympy.Symbol('t')  # QubitBoard's time, which runs from -1 to 1",
        'q = cirq.LineQubit.range(2)',
        '# @qb init q[0] = 1',
        '',
        'circuit = cirq.Circuit([',
        '    cirq.Moment(cirq.X(q[0])**(t + 1)),',
        '    # @qb Chance q[0]',
        '])',
        ''
    ].join('\n'));
});

suite.test("emit_standardGates", () => {
    assertThat(emitBody(
        '{"cols":[["H","X"],["•","X"],["•","•","X"],["◦","Z^½"],["X^-½"],["Swap","Swap"],["•","Swap",1,"Swap"],' +
        '["Measure","Measure"],["Y","Z"]]}')).isEqualTo([
            "cirq.Moment(cirq.H(q[0]), cirq.X(q[1])),",
            "cirq.Moment(cirq.X(q[1]).controlled_by(q[0])),",
            "cirq.Moment(cirq.X(q[2]).controlled_by(q[0], q[1])),",
            "cirq.Moment(cirq.S(q[1]).controlled_by(q[0], control_values=[0])),",
            "cirq.Moment(cirq.X(q[0])**-0.5),",
            "cirq.Moment(cirq.SWAP(q[0], q[1])),",
            "cirq.Moment(cirq.SWAP(q[1], q[3]).controlled_by(q[0])),",
            "cirq.Moment(cirq.measure(q[0]), cirq.measure(q[1])),",
            "cirq.Moment(cirq.Y(q[0]), cirq.Z(q[1])),"
        ]);
});

suite.test("emit_fractionalPowers", () => {
    assertThat(emitBody(
        '{"cols":[["X^½","Y^-½","Z^½","Z^-½"],["Z^¼","Z^-¼","X^¼","Y^-¼"],["X^⅛","Y^⅓","Z^-⅓","Z^⅟₁₆"],' +
        '["•","X^¼"],["◦","•","Z^-½"]]}')).isEqualTo([
            "cirq.Moment(cirq.X(q[0])**0.5, cirq.Y(q[1])**-0.5, cirq.S(q[2]), cirq.S(q[3])**-1),",
            "cirq.Moment(cirq.T(q[0]), cirq.T(q[1])**-1, cirq.X(q[2])**0.25, cirq.Y(q[3])**-0.25),",
            "cirq.Moment(cirq.X(q[0])**0.125, cirq.Y(q[1])**(1/3), cirq.Z(q[2])**(-1/3), cirq.Z(q[3])**(1/16)),",
            "cirq.Moment((cirq.X(q[1])**0.25).controlled_by(q[0])),",
            "cirq.Moment((cirq.S(q[2])**-1).controlled_by(q[0], q[1], control_values=[0, 1])),"
        ]);
});

suite.test("emit_sharedControlsUseAListLine", () => {
    assertThat(emitBody('{"cols":[["•","X","X"],["◦","H",1,"Z^½"]]}')).isEqualTo([
        "[cirq.X(q[1]).controlled_by(q[0]), cirq.X(q[2]).controlled_by(q[0])],",
        "[cirq.H(q[1]).controlled_by(q[0], control_values=[0]), " +
            "cirq.S(q[3]).controlled_by(q[0], control_values=[0])],"
    ]);
});

suite.test("emit_timeAndFormulaGates", () => {
    assertThat(emitBody(
        '{"cols":[["X^t"],["Y^-t"],["e^-iXt"],["e^iZt"],[{"id":"Rxft","arg":"pi/2"}],' +
        '["•",{"id":"Rzft","arg":"2 pi"}],[{"id":"X^ft","arg":"sin(pi t)"}],[{"id":"Ryft","arg":"pi t^2"}],' +
        '[{"id":"Z^ft","arg":"1/3"}],[{"id":"Z^ft","arg":"0.3"}]]}')).isEqualTo([
            "cirq.Moment(cirq.X(q[0])**(t + 1)),",
            "cirq.Moment(cirq.Y(q[0])**(-(t + 1))),",
            "cirq.Moment(cirq.rx(2*sympy.pi*(t + 1))(q[0])),",
            "cirq.Moment(cirq.rz(-2*sympy.pi*(t + 1))(q[0])),",
            "cirq.Moment(cirq.rx(sympy.pi/2)(q[0])),",
            "cirq.Moment(cirq.rz(2 * sympy.pi)(q[1]).controlled_by(q[0])),",
            "cirq.Moment(cirq.X(q[0])**(sympy.sin(sympy.pi * t))),",
            "cirq.Moment(cirq.ry(sympy.pi * t**2)(q[0])),",
            // A plain power would read back as the fixed Z^⅓ gate, so the formula gate is spelled out.
            "cirq.Moment(cirq.ZPowGate(exponent=1/3)(q[0])),",
            "cirq.Moment(cirq.Z(q[0])**(0.3)),"
        ]);
});

suite.test("emit_frequencyGates", () => {
    assertThat(emitBody('{"cols":[["QFT3"],[1,"QFT†2"],["QFT1"],["PhaseGradient2"],["•","PhaseUngradient3"]]}')).
        isEqualTo([
            "cirq.Moment(cirq.qft(*reversed(q[0:3]))),",
            "cirq.Moment(cirq.qft(*reversed(q[1:3]), inverse=True)),",
            "cirq.Moment(cirq.qft(q[0])),",
            "cirq.Moment(cirq.PhaseGradientGate(num_qubits=2, exponent=0.5)(*reversed(q[0:2]))),",
            "cirq.Moment(cirq.PhaseGradientGate(num_qubits=3, exponent=-0.5)(*reversed(q[1:4])).controlled_by(q[0])),"
        ]);
});

suite.test("emit_usesPragmasForQubitBoardOnlyGates", () => {
    assertThat(emitBody(
        '{"cols":[["Chance2"],[{"id":"Ryft","arg":"2pi"}],["⊖","X"],["•","Measure"],["|0⟩⟨0|"],["X^⌈t⌉"],' +
        '[1,"i"],["ZDetector"],["inputA2",1,"+=A2"]]}')).isEqualTo([
            "# @qb Chance2 q[0]",
            // Python has no implied multiplication, and "2*pi" wouldn't read back as the same formula text.
            "# @qb Ryft[2pi] q[0]",
            "# @qb xctrl q[0], X q[1]",
            "# @qb ctrl q[0], Measure q[1]",
            "# @qb postoff q[0]",
            "# @qb X^ceil(t) q[0]",
            // Cirq's global phase has no qubit, so a scalar gate is only written as Cirq on the first free wire.
            "# @qb i q[1]",
            "# @qb ZDetector q[0]",
            "# @qb inputA2 q[0], +=A2 q[2]"
        ]);
});

suite.test("emit_scalarGates", () => {
    assertThat(emitBody('{"cols":[["i"],["•","-i"],["NeGate"],["√i"],["H","√-i"]]}')).isEqualTo([
        "cirq.Moment(cirq.global_phase_operation(1j)),",
        "cirq.Moment(cirq.global_phase_operation(-1j).controlled_by(q[0])),",
        "cirq.Moment(cirq.global_phase_operation(-1)),",
        "cirq.Moment(cirq.global_phase_operation(1j**0.5)),",
        "cirq.Moment(cirq.H(q[0]), cirq.global_phase_operation((-1j)**0.5)),"
    ]);
});

const CUSTOM_GATES_CIRCUIT = '{"cols":[["~f7c0"],[1,"~sw"],["•","~f7c0"],["~c1"],["~bad"]],"gates":[' +
    '{"id":"~f7c0","name":"flip","matrix":"{{0,1},{1,0}}"},' +
    '{"id":"~sw","matrix":"{{1,0,0,0},{0,0,i,0},{0,i,0,0},{0,0,0,1}}"},' +
    '{"id":"~c1","name":"sub","circuit":{"cols":[["H"]]}},' +
    '{"id":"~bad","name":"bad","matrix":"{{1,1},{1,1}}"}]}';

suite.test("emit_customMatrixGates", () => {
    assertThat(Cirq.emit(CUSTOM_GATES_CIRCUIT)).isEqualTo([
        'import cirq',
        'import numpy as np',
        '',
        '# One line per column. "# @qb" lines hold QubitBoard-only gates; Cirq ignores them.',
        'q = cirq.LineQubit.range(3)',
        "gate_f7c0 = cirq.MatrixGate(np.array([[0, 1], [1, 0]]), name='flip')",
        'gate_sw = cirq.MatrixGate(np.array([[1, 0, 0, 0], [0, 0, 1j, 0], [0, 1j, 0, 0], [0, 0, 0, 1]]))',
        // Gates defined by a circuit, and matrices that aren't unitary, have no Cirq form.
        '# @qb gate ~c1 = {"id":"~c1","name":"sub","circuit":{"cols":[["H"]]}}',
        '# @qb gate ~bad = {"id":"~bad","name":"bad","matrix":"{{1,1},{1,1}}"}',
        '',
        'circuit = cirq.Circuit([',
        '    cirq.Moment(gate_f7c0(q[0])),',
        '    cirq.Moment(gate_sw(*reversed(q[1:3]))),',
        '    cirq.Moment(gate_f7c0(q[1]).controlled_by(q[0])),',
        '    # @qb ~c1 q[0]',
        '    # @qb ~bad q[0]',
        '])',
        ''
    ].join('\n'));
});

suite.test("roundTrip_customMatrixGates", () => {
    assertCodeRoundTrip(Cirq, JSON.parse(CUSTOM_GATES_CIRCUIT));
    for (let matrix of ["{{1,0},{0,i}}", "{{√½,√½},{√½,-√½}}", "{{½+½i,½-½i},{½-½i,½+½i}}", "{{0,-i},{i,0}}"]) {
        for (let name of ["Mine", "it's", undefined]) {
            let gate = name === undefined ? {id: "~g", matrix} : {id: "~g", name, matrix};
            assertCodeRoundTrip(Cirq, {cols: [["~g"], ["◦", "~g"]], gates: [gate]});
        }
    }
});

suite.test("formulaToCirq", () => {
    assertThat(formulaToCirq("pi/2")).isEqualTo("sympy.pi/2");
    assertThat(formulaToCirq("2 pi")).isEqualTo("2 * sympy.pi");
    assertThat(formulaToCirq("pi t^2")).isEqualTo("sympy.pi * t**2");
    assertThat(formulaToCirq("sin(pi t)")).isEqualTo("sympy.sin(sympy.pi * t)");
    assertThat(formulaToCirq("sqrt(2)*pi")).isEqualTo("sympy.sqrt(2)*sympy.pi");
    assertThat(formulaToCirq("ln(e)")).isEqualTo("sympy.log(sympy.E)");
    assertThat(formulaToCirq("1/3")).isEqualTo("1/3");
    assertThat(formulaToCirq("-pi^2/3")).isEqualTo("-sympy.pi**2/3");
    assertThat(formulaToCirq("-t^2")).isEqualTo("-t**2");
    assertThat(formulaToCirq("2^-t")).isEqualTo("2**-t");
    assertThat(formulaToCirq("3*2^-t")).isEqualTo("3*2**-t");
    assertThat(formulaToCirq("2^t^2")).isEqualTo("2**t**2");
    assertThat(formulaToCirq("i")).isEqualTo(undefined);
    assertThat(formulaToCirq("bogus(")).isEqualTo(undefined);
    assertThat(formulaToCirq("sin pi")).isEqualTo(undefined);
});

suite.test("cirqToFormula", () => {
    assertThat(cirqToFormula("sympy.pi/2", 1)).isEqualTo("pi/2");
    assertThat(cirqToFormula("np.pi * t**2", 1)).isEqualTo("pi t^2");
    assertThat(cirqToFormula("math.sin(math.pi*t)", 1)).isEqualTo("sin(pi*t)");
    assertThat(cirqToFormula("numpy.log(sympy.E)", 1)).isEqualTo("ln(e)");
    assertThat(cirqToFormula("0.25", 1)).isEqualTo("0.25");
    assertThat(evalCirqExpr("-sympy.pi**2", 0)).isApproximatelyEqualTo(-Math.PI * Math.PI);
    assertThat(cirqToFormula("-sympy.pi**2", 1)).isEqualTo("-pi^2");
    assertThat(cirqToFormula("-t**2 + 1", 1)).isEqualTo("-t^2 + 1");
    assertThat(cirqToFormula("2**t**2", 1)).isEqualTo("2^t^2");
    // Implied multiplication can't be used where it would read as something else.
    assertThat(cirqToFormula("2 * -t", 1)).isEqualTo("2 * -t");
    assertThat(cirqToFormula("2 * sympy.E * 3", 1)).isEqualTo("2 * e * 3");
});

suite.test("evalCirqExpr", () => {
    assertThat(evalCirqExpr("1/3", 0)).isApproximatelyEqualTo(1 / 3);
    assertThat(evalCirqExpr("2**3**2", 0)).isApproximatelyEqualTo(512);
    assertThat(evalCirqExpr("2**-1", 0)).isApproximatelyEqualTo(0.5);
    assertThat(evalCirqExpr("-2**2", 0)).isApproximatelyEqualTo(-4);
    assertThat(evalCirqExpr("(-2)**2", 0)).isApproximatelyEqualTo(4);
    assertThat(evalCirqExpr("6/3/2", 0)).isApproximatelyEqualTo(1);
    assertThat(evalCirqExpr("2 - 3 - 4", 0)).isApproximatelyEqualTo(-5);
    assertThat(evalCirqExpr("sympy.sin(sympy.pi * t)", 0.5)).isApproximatelyEqualTo(1);
    assertThat(evalCirqExpr("2*sympy.pi*(t + 1)", 0.25)).isApproximatelyEqualTo(2.5 * Math.PI);
    assertThat(evalCirqExpr("1e-3", 0)).isApproximatelyEqualTo(0.001);
});

/** Reference matrices, from the formulas in Cirq's documentation of XPowGate, YPowGate, ZPowGate, Rx, Ry and Rz. */
let cirqMatrix = (kind: string, axis: string, v: number): Matrix => {
    let half = v * (kind === 'pow' ? Math.PI : 1) / 2;
    let c = Math.cos(half);
    let s = Math.sin(half);
    let phase = kind === 'pow' ? Complex.polar(1, half) : Complex.ONE;
    let m = axis === 'X' ? Matrix.square(c, new Complex(0, -s), new Complex(0, -s), c) :
        axis === 'Y' ? Matrix.square(c, -s, s, c) :
        Matrix.square(Complex.polar(1, -half), 0, 0, Complex.polar(1, half));
    return m.times(phase);
};

suite.test("exactness_emittedGatesHaveTheSameMatrix", () => {
    let gates = [...Gates.KnownToSerializer];
    for (let id of ["X^ft", "Y^ft", "Z^ft", "Rxft", "Ryft", "Rzft"]) {
        for (let arg of ["0.3", "-0.7", "1.5", "t", "pi t^2", "sin(pi t)", "-2.25", "5 t", "-t^2", "2^-t^2"]) {
            gates.push(Gates.findKnownGateById(id, new CustomGateSet()).withParam(arg));
        }
    }

    let covered = new Set<string>();
    for (let gate of gates) {
        let form = cirqFormOf(gate.serializedId, gate.param);
        if (form === undefined) {
            continue;
        }
        covered.add(gate.serializedId);
        for (let time of [0, 0.13, 0.5, 0.77, 0.99]) {
            let value = evalCirqExpr(form.expr, time * 2 - 1);
            assertThat(gate.knownMatrixAt(time)).withInfo({id: gate.serializedId, param: gate.param, time, form}).
                isApproximatelyEqualTo(cirqMatrix(form.kind, form.axis, value), 0.0001);
        }
    }

    for (let id of [
        "X", "Y", "Z", "X^½", "X^-½", "Y^½", "Y^-½", "Z^½", "Z^-½", "Z^¼", "Z^-¼", "X^¼", "X^-¼", "Y^¼", "Y^-¼",
        "X^⅓", "Y^-⅓", "Z^⅛", "X^-⅛", "Z^⅟₁₆", "Y^-⅟₁₆", "X^⅟₃₂", "Z^⅟₆₄", "Z^⅟₁₂₈",
        "X^t", "X^-t", "Y^t", "Y^-t", "Z^t", "Z^-t",
        "e^iXt", "e^-iXt", "e^iYt", "e^-iYt", "e^iZt", "e^-iZt",
        "X^ft", "Y^ft", "Z^ft", "Rxft", "Ryft", "Rzft"
    ]) {
        assertThat(covered.has(id)).withInfo({id}).isEqualTo(true);
    }
});

suite.test("exactness_namedGates", () => {
    // cirq.S and cirq.T are ZPowGate(exponent=0.5) and ZPowGate(exponent=0.25).
    assertThat(cirqFormOf("Z^½", undefined)).isEqualTo({kind: 'pow', axis: 'Z', expr: '0.5'});
    assertThat(cirqFormOf("Z^-¼", undefined)).isEqualTo({kind: 'pow', axis: 'Z', expr: '-0.25'});
    assertThat(cirqFormOf("H", undefined)).isEqualTo(undefined);
    assertThat(cirqFormOf("Chance", undefined)).isEqualTo(undefined);
});

suite.test("parse_program", () => {
    assertThat(Cirq.parse([
        'import cirq',
        'import sympy',
        'import numpy as np',
        '',
        "t = sympy.Symbol('t')",
        'q = cirq.LineQubit.range(3)',
        '',
        'circuit = cirq.Circuit([',
        '    cirq.Moment(cirq.H(q[0]), cirq.H(q[1])),  # a comment',
        '    cirq.Moment(cirq.X(q[2]).controlled_by(q[0], q[1])),',
        '    cirq.Moment((cirq.Z(q[1])**-0.5).controlled_by(q[0], control_values=[0])),',
        '    cirq.Moment(cirq.rx(np.pi/4)(q[2])),',
        '    cirq.Moment(cirq.measure(q[1])),',
        '])',
        'print(circuit)'
    ].join('\n'))).isEqualTo(
        '{"cols":[["H","H"],["•","•","X"],["◦","Z^-½"],[1,1,{"id":"Rxft","arg":"pi/4"}],[1,"Measure"]]}');
});

suite.test("parse_gateSpellings", () => {
    assertThat(Cirq.parse(circuitOf(
        'cirq.S(q[0]), cirq.T(q[1]), cirq.S(q[2])**-1, cirq.T(q[3])**-1,',
        '(cirq.X**0.5)(q[0]), (cirq.Y**0.25).on(q[1]), cirq.Z.on(q[2]), cirq.X(q[3])**(1/3),',
        'cirq.XPowGate(exponent=0.5)(q[0]), cirq.Rx(rads=sympy.pi)(q[1]), cirq.Z(q[2])**1, cirq.X(q[3])**0.3,',
        'cirq.X(q[0])**t, cirq.Y(q[1])**(t + 1), cirq.Z(q[2])**-(t+1), cirq.ry(2*np.pi*(t+1))(q[3]),'
    ))).isEqualTo(
        '{"cols":[["Z^½","Z^¼","Z^-½","Z^-¼"],["X^½","Y^¼","Z","X^⅓"],' +
        '[{"id":"X^ft","arg":"0.5"},{"id":"Rxft","arg":"pi"},"Z",{"id":"X^ft","arg":"0.3"}],' +
        '[{"id":"X^ft","arg":"t"},"Y^t","Z^-t","e^-iYt"]]}');
});

suite.test("parse_controlledGateSpellings", () => {
    assertThat(Cirq.parse(circuitOf(
        'cirq.CNOT(q[0], q[1]),',
        'cirq.CX(q[1], q[0]),',
        'cirq.CZ(q[0], q[2]),',
        'cirq.CCX(q[0], q[1], q[2]),',
        'cirq.TOFFOLI(q[0], q[1], q[2]),',
        'cirq.CCZ(q[0], q[1], q[2]),',
        'cirq.CSWAP(q[0], q[1], q[2]),',
        'cirq.CNOT(q[1], q[2]).controlled_by(q[0]),',
        'cirq.X(q[1]).controlled_by(q[0])**0.5,',
        'cirq.H(q[2]).controlled_by(q[0]).controlled_by(q[1], control_values=[0]),'
    ))).isEqualTo(
        '{"cols":[["•","X"],["X","•"],["•",1,"Z"],["•","•","X"],["•","•","X"],["•","•","Z"],["•","Swap","Swap"],' +
        '["•","•","X"],["•","X^½"],["•","◦","H"]]}');
});

suite.test("parse_qubits", () => {
    assertThat(Cirq.parse('a, b = cirq.LineQubit.range(2)\nc = cirq.LineQubit(3)\n' +
        'circuit = cirq.Circuit(cirq.CNOT(a, b), cirq.H(c), cirq.X(cirq.LineQubit(2)))')).isEqualTo(
        '{"cols":[["•","X"],[1,1,"X","H"]]}');
    // The declaration can be skipped when the qubits are called 'q'.
    assertThat(Cirq.parse('circuit = cirq.Circuit(cirq.H(q[3]))')).isEqualTo('{"cols":[[1,1,1,"H"]]}');
    assertThat(Cirq.parse(circuitOf('cirq.H.on_each(*q[0:3]),', 'cirq.measure(*q[1:3]),', 'cirq.X.on_each(q[0], q[2]),'))).
        isEqualTo('{"cols":[["H","H","H"],[1,"Measure","Measure"],["X",1,"X"]]}');
});

suite.test("parse_circuitShapes", () => {
    let expected = '{"cols":[["H"],["•","X"]]}';
    assertThat(Cirq.parse('circuit = cirq.Circuit(cirq.H(q[0]), cirq.CNOT(q[0], q[1]))')).isEqualTo(expected);
    assertThat(Cirq.parse('circuit = cirq.Circuit(\n    cirq.H(q[0]),\n    cirq.CNOT(q[0], q[1])\n)')).
        isEqualTo(expected);
    assertThat(Cirq.parse('circuit = cirq.Circuit([cirq.H(q[0]),\n    cirq.CNOT(q[0], q[1])])')).isEqualTo(expected);
    assertThat(Cirq.parse('c = cirq.Circuit()\nc.append(cirq.H(q[0]))\nc.append([cirq.CNOT(q[0], q[1])])')).
        isEqualTo(expected);
    assertThat(Cirq.parse('circuit = cirq.Circuit(cirq.Moment(cirq.H(q[0])), cirq.Moment([cirq.CNOT(q[0], q[1])]))')).
        isEqualTo(expected);
});

suite.test("parse_sameLineSharesColumnOnlyWhenControlsMatch", () => {
    assertThat(Cirq.parse(circuitOf(
        'cirq.H(q[0]), cirq.H(q[1]), cirq.X(q[2]).controlled_by(q[0]), cirq.X(q[3]).controlled_by(q[0]),'))).
        isEqualTo('{"cols":[["H","H"],["•",1,"X","X"]]}');
    assertThat(Cirq.parse(circuitOf('cirq.X(q[0]), cirq.X(q[0]),'))).isEqualTo('{"cols":[["X"],["X"]]}');
    // A moment's other gates must not pick up a neighbor's controls.
    assertThat(Cirq.parse(circuitOf('cirq.Moment(cirq.X(q[1]).controlled_by(q[0]), cirq.H(q[2])),'))).
        isEqualTo('{"cols":[["•","X"],[1,1,"H"]]}');
    assertThat(Cirq.parse(circuitOf('cirq.Moment(cirq.SWAP(q[0], q[1]), cirq.SWAP(q[2], q[3])),'))).
        isEqualTo('{"cols":[["Swap","Swap"],[1,1,"Swap","Swap"]]}');
});

suite.test("parse_frequencyGates", () => {
    assertThat(Cirq.parse(circuitOf(
        'cirq.qft(*reversed(q[0:3])),',
        'cirq.qft(q[2], q[1], inverse=True),',
        'cirq.QuantumFourierTransformGate(2)(q[1], q[0]),',
        'cirq.PhaseGradientGate(num_qubits=2, exponent=-0.5)(*reversed(q[0:2])),'
    ))).isEqualTo('{"cols":[["QFT3"],[1,"QFT†2"],["QFT2"],["PhaseUngradient2"]]}');
});

suite.test("parse_scalarGates", () => {
    assertThat(Cirq.parse(circuitOf(
        'cirq.global_phase_operation(1j),',
        'cirq.H(q[0]), cirq.global_phase_operation(-1),',
        'cirq.global_phase_operation(1j ** 0.5).controlled_by(q[0]),'
    ))).isEqualTo('{"cols":[["i"],["H","NeGate"],["•","√i"]]}');
    assertThat(parseError(circuitOf('cirq.global_phase_operation(0.3),')).line).isEqualTo(2);
});

suite.test("parse_customMatrixGates", () => {
    assertThat(Cirq.parse([
        'import numpy as np',
        'my = cirq.MatrixGate(np.array([[0, 1j], [-1j, 0]]), name="Yish")',
        'gate_ab = cirq.MatrixGate(np.array([[1, 0, 0, 0], [0, 0, 1, 0], [0, 1, 0, 0], [0, 0, 0, 1]]))',
        'circuit = cirq.Circuit([',
        '    my(q[1]),',
        '    gate_ab(q[2], q[1]).controlled_by(q[0]),',
        '])'
    ].join('\n'))).isEqualTo(
        '{"cols":[[1,"~my"],["•","~ab"]],"gates":[{"id":"~my","name":"Yish","matrix":"{{0,i},{-i,0}}"},' +
        '{"id":"~ab","matrix":"{{1,0,0,0},{0,0,1,0},{0,1,0,0},{0,0,0,1}}"}]}');

    assertThat(parseError('g = cirq.MatrixGate(np.array([[1, 0, 0], [0, 1, 0], [0, 0, 1]]))').line).isEqualTo(1);
    assertThat(parseError('g = cirq.MatrixGate(np.array([[1, 0], [0]]))').line).isEqualTo(1);
    assertThat(parseError('g = cirq.MatrixGate(np.array([[1, 0], [0, 1]]))\ng = cirq.MatrixGate(np.array([[1, 0], [0, 1]]))').line).
        isEqualTo(2);
    assertThat(parseError('g = cirq.MatrixGate(np.array([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]))\n' +
        circuitOf('g(q[0]),')).line).isEqualTo(3);
    assertThat(parseError('g = cirq.MatrixGate(np.array([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]))\n' +
        circuitOf('g(q[0], q[1]),')).line).isEqualTo(3);
});

suite.test("parse_pragmas", () => {
    assertThat(Cirq.parse('q = cirq.LineQubit.range(2)\n# @qb init q[1] = +\n' +
        circuitOf('cirq.H(q[0]),', '# @qb Chance2 q[0]', '# not a pragma'))).isEqualTo(
        '{"cols":[["H"],["Chance2"]],"init":[0,"+"]}');
});

suite.test("parse_errors", () => {
    assertThat(parseError('q = cirq.LineQubit.range(2)\nfor i in range(2):\n    pass').line).isEqualTo(2);
    assertThat(parseError('for i in range(2):').message).isEqualTo(
        "'for' isn't supported by QubitBoard. Write the circuit as a flat list of operations.");
    assertThat(parseError(circuitOf('cirq.ISWAP(q[0], q[1]),')).message).isEqualTo(
        "'cirq.ISWAP' isn't supported by QubitBoard.");
    assertThat(parseError(circuitOf('cirq.ISWAP(q[0], q[1]),')).line).isEqualTo(2);
    assertThat(parseError('q = cirq.LineQubit.range(2)\n\n' + circuitOf('cirq.H(q[5]),')).line).isEqualTo(4);
    assertThat(parseError(circuitOf('cirq.CNOT(q[0], q[0]),')).line).isEqualTo(2);
    assertThat(parseError(circuitOf('cirq.CNOT(q[0]),')).line).isEqualTo(2);
    assertThat(parseError(circuitOf('cirq.H(q[0], q[1]),')).line).isEqualTo(2);
    assertThat(parseError(circuitOf('cirq.X(q[0])**foo,')).line).isEqualTo(2);
    assertThat(parseError(circuitOf('cirq.H(q[0])**0.5,')).line).isEqualTo(2);
    assertThat(parseError(circuitOf('cirq.H(q[0],')).line).isEqualTo(2);
    assertThat(parseError(circuitOf('cirq.H(r[0]),')).line).isEqualTo(2);
    assertThat(parseError(circuitOf('cirq.X(q[1]).controlled_by(q[0], control_values=[2]),')).line).isEqualTo(2);
    assertThat(parseError(circuitOf('cirq.measure(q[1]).controlled_by(q[0]),')).line).isEqualTo(2);
    assertThat(parseError(circuitOf('cirq.qft(*q[0:3]),')).message).isEqualTo(
        "QubitBoard's QFT needs neighboring qubits listed from the bottom up, like *reversed(q[0:3]).");
    assertThat(parseError(circuitOf('cirq.qft(*reversed(q[0:3]), without_reverse=True),')).line).isEqualTo(2);
    assertThat(parseError('q = cirq.GridQubit.rect(2, 2)').line).isEqualTo(1);
    assertThat(parseError(circuitOf('cirq.H(q[0]),', '# @qb Foo q[1]')).line).isEqualTo(3);
    assertThat(parseError('x = 5').line).isEqualTo(1);
});

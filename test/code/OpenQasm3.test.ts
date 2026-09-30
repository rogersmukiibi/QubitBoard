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

import {Suite, assertThat, assertThrows} from "../TestUtil.js"
import {CodeError} from "../../src/code/CodeError.js"
import {OpenQasm3, formulaToQasm} from "../../src/code/languages/OpenQasm3.js"
import {EXAMPLE_CIRCUITS, assertCodeRoundTrip, assertEveryGateRoundTrips} from "./CodeTestUtil.js"

let suite = new Suite("OpenQasm3");

let parseError = (code: string): CodeError => {
    try {
        OpenQasm3.parse(code);
    } catch (ex) {
        if (ex instanceof CodeError) {
            return ex;
        }
        throw ex;
    }
    throw new Error(`Expected a CodeError for: ${code}`);
};

/** The emitted code, minus the header. */
let emitBody = (jsonText: string): string[] => OpenQasm3.emit(jsonText).split('\n').slice(4).filter(e => e !== '');

suite.test("roundTrip_everyGate", () => {
    assertEveryGateRoundTrips(OpenQasm3);
});

suite.test("roundTrip_examples", () => {
    for (let name of Object.keys(EXAMPLE_CIRCUITS)) {
        assertCodeRoundTrip(OpenQasm3, EXAMPLE_CIRCUITS[name]);
    }
    assertCodeRoundTrip(OpenQasm3, {cols: []});
});

suite.test("emit_standardGates", () => {
    assertThat(emitBody('{"cols":[["H","X"],["•","X"],["•","•","X"],["◦","Z^½"],["X^-½"],["Swap","Swap"]]}')).isEqualTo([
        "h q[0]; x q[1];",
        "cx q[0], q[1];",
        "ccx q[0], q[1], q[2];",
        "negctrl @ s q[0], q[1];",
        "inv @ sx q[0];",
        "swap q[0], q[1];"
    ]);
    assertThat(emitBody('{"cols":[[{"id":"Rxft","arg":"pi/2"}],["•",{"id":"Rzft","arg":"pi^2"}],[{"id":"Z^ft","arg":"1/4"}]]}')).
        isEqualTo([
            "rx(pi/2) q[0];",
            "crz(pi**2) q[0], q[1];",
            "p(pi*(1/4)) q[0];"
        ]);
    assertThat(emitBody('{"cols":[["Measure","Measure"]]}')).isEqualTo(["measure q[0]; measure q[1];"]);
});

suite.test("emit_usesPragmasForQubitBoardOnlyGates", () => {
    assertThat(emitBody('{"cols":[["Chance2"],[{"id":"Rxft","arg":"pi t^2"}],["Y^½"],["⊖","X"]],"init":[1]}')).
        isEqualTo([
            "// @qb init q[0] = 1",
            "// @qb Chance2 q[0]",
            "// @qb Rxft[pi t^2] q[0]",
            "// @qb Y^1/2 q[0]",
            "// @qb xctrl q[0], X q[1]"
        ]);
});

suite.test("formulaToQasm", () => {
    assertThat(formulaToQasm("pi/2")).isEqualTo("pi/2");
    assertThat(formulaToQasm("-pi^2/3")).isEqualTo("-pi**2/3");
    assertThat(formulaToQasm("sqrt(2)*pi")).isEqualTo("sqrt(2)*pi");
    assertThat(formulaToQasm("2 pi")).isEqualTo(undefined);
    assertThat(formulaToQasm("pi t")).isEqualTo(undefined);
    assertThat(formulaToQasm("e")).isEqualTo(undefined);
    assertThat(formulaToQasm("bogus(")).isEqualTo(undefined);
});

suite.test("parse_qasm3", () => {
    assertThat(OpenQasm3.parse([
        'OPENQASM 3.0;',
        'include "stdgates.inc";',
        'qubit[3] q;',
        'bit[3] c;',
        'h q;',
        'ctrl(2) @ x q[0], q[1], q[2];',
        'negctrl @ inv @ s q[0], q[1];',
        'rx(π/4) q[2];',
        'p(pi/2) q[0];',
        'c[1] = measure q[1];'
    ].join('\n'))).isEqualTo(
        '{"cols":[["H","H","H"],["•","•","X"],["◦","Z^-½"],[1,1,{"id":"Rxft","arg":"pi/4"}],' +
        '[{"id":"Z^ft","arg":"(pi/2)/pi"}],[1,"Measure"]]}');
});

suite.test("parse_qasm2", () => {
    assertThat(OpenQasm3.parse([
        'OPENQASM 2.0;',
        'include "qelib1.inc";',
        'qreg q[2];',
        'creg c[2];',
        'h q[0];',
        'cx q[0],q[1];',
        'barrier q;',
        'measure q -> c;'
    ].join('\n'))).isEqualTo('{"cols":[["H"],["•","X"],["Measure","Measure"]]}');
});

suite.test("parse_sameLineSharesColumnOnlyWhenControlsMatch", () => {
    assertThat(OpenQasm3.parse("h q[0]; h q[1]; cx q[0], q[2]; cx q[0], q[3];")).isEqualTo(
        '{"cols":[["H","H"],["•",1,"X","X"]]}');
    assertThat(OpenQasm3.parse("x q[0]; x q[0];")).isEqualTo('{"cols":[["X"],["X"]]}');
});

suite.test("parse_registers", () => {
    assertThat(OpenQasm3.parse("qubit a;\nqubit[2] b;\ncx a, b[1];")).isEqualTo('{"cols":[["•",1,"X"]]}');
    // The declaration can be skipped when the register is called 'q'.
    assertThat(OpenQasm3.parse("h q[3];")).isEqualTo('{"cols":[[1,1,1,"H"]]}');
});

suite.test("parse_errors", () => {
    assertThat(parseError("qubit[2] q;\nh q[0]").line).isEqualTo(2);
    assertThat(parseError("u3(1,2,3) q[0];").message).isEqualTo("'u3' isn't supported by QubitBoard.");
    assertThat(parseError("reset q[0];").line).isEqualTo(1);
    assertThat(parseError("qubit[2] q;\n\nh q[5];").line).isEqualTo(3);
    assertThat(parseError("cx q[0], q[0];").line).isEqualTo(1);
    assertThat(parseError("cx q[0];").line).isEqualTo(1);
    assertThat(parseError("rx(foo) q[0];").line).isEqualTo(1);
    assertThat(parseError("h(1) q[0];").line).isEqualTo(1);
    assertThat(parseError("foo q[0];").message).isEqualTo("Unknown gate 'foo'.");
    assertThat(parseError("qubit[2] q;\nh r[0];").line).isEqualTo(2);
    assertThat(parseError("cx q, q[1];").line).isEqualTo(1);
    assertThat(parseError("h q[0];\n// @qb Foo q[1]").line).isEqualTo(2);
    assertThrows(() => OpenQasm3.parse("pow(2) @ x q[0];"));
});

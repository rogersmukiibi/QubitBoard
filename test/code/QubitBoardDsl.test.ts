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
import {Gates} from "../../src/gates/AllGates.js"
import {QubitBoardDsl} from "../../src/code/languages/QubitBoardDsl.js"
import {EXAMPLE_CIRCUITS, assertCodeRoundTrip, assertEveryGateRoundTrips} from "./CodeTestUtil.js"
import {canonicalCircuitJsonText, gateNameOf, findGateByName} from "../../src/code/CircuitCode.js"
import {CustomGateSet} from "../../src/circuit/CustomGateSet.js"

let suite = new Suite("QubitBoardDsl");

let parseError = (code: string): CodeError => {
    try {
        QubitBoardDsl.parse(code);
    } catch (ex) {
        if (ex instanceof CodeError) {
            return ex;
        }
        throw ex;
    }
    throw new Error(`Expected a CodeError for: ${code}`);
};

suite.test("roundTrip_everyGate", () => {
    assertEveryGateRoundTrips(QubitBoardDsl);
});

suite.test("roundTrip_examples", () => {
    for (let name of Object.keys(EXAMPLE_CIRCUITS)) {
        assertCodeRoundTrip(QubitBoardDsl, EXAMPLE_CIRCUITS[name]);
    }
    assertCodeRoundTrip(QubitBoardDsl, {cols: []});
});

suite.test("gateNames_areUniqueAndResolve", () => {
    let seen = new Map<string, string>();
    for (let gate of Gates.KnownToSerializer) {
        let name = gateNameOf(gate.serializedId);
        assertThat(seen.has(name)).withInfo({name, a: seen.get(name), b: gate.serializedId}).isEqualTo(false);
        seen.set(name, gate.serializedId);
        assertThat(findGateByName(name, new CustomGateSet())).isEqualTo(gate);
        assertThat(findGateByName(gate.serializedId, new CustomGateSet())).isEqualTo(gate);
    }
    assertThat(gateNameOf("•")).isEqualTo("ctrl");
    assertThat(gateNameOf("Z^½")).isEqualTo("Z^1/2");
    assertThat(gateNameOf("QFT†3")).isEqualTo("QFTdag3");
    assertThat(gateNameOf("H")).isEqualTo("H");
});

suite.test("emit", () => {
    let code = QubitBoardDsl.emit('{"cols":[["H"],["•","X"],[1,{"id":"Rzft","arg":"pi/2"}]],"init":[0,"+"]}');
    let body = code.split('\n').filter(e => e !== '' && !e.startsWith('#'));
    assertThat(body).isEqualTo([
        "qubits 2",
        "init q1 = +",
        "H q0",
        "ctrl q0, X q1",
        "Rzft[pi/2] q1"
    ]);
});

suite.test("parse", () => {
    assertThat(QubitBoardDsl.parse("H q0\nctrl q0, X q1")).isEqualTo('{"cols":[["H"],["•","X"]]}');
    // Case-insensitive names, bracketed wires, unicode ids, comments and blank lines.
    assertThat(QubitBoardDsl.parse("h q[0]  # hadamard\n\n•  q0, x q[1]\nZ^½ q1")).isEqualTo(
        '{"cols":[["H"],["•","X"],[1,"Z^½"]]}');
    assertThat(QubitBoardDsl.parse("init q1 = -i\nsetA[5] q0\nRxft[pi t] q2")).isEqualTo(
        '{"cols":[[{"id":"setA","arg":5}],[1,1,{"id":"Rxft","arg":"pi t"}]],"init":[0,"-i"]}');
    assertThat(QubitBoardDsl.parse("QFT3 q0\nchance2 q1")).isEqualTo('{"cols":[["QFT3"],[1,"Chance2"]]}');
    assertThat(QubitBoardDsl.parse('gate ~a = {"id":"~a","matrix":"{{0,1},{1,0}}"}\n~a q1')).isEqualTo(
        '{"cols":[[1,"~a"]],"gates":[{"id":"~a","matrix":"{{0,1},{1,0}}"}]}');
});

suite.test("parse_matchesDragAndDropLayout", () => {
    // A gate typed onto a wide gate's second column gets pushed right, exactly like dropping it there would.
    let typed = QubitBoardDsl.parse("Rzft[pi/2] q0\nH q0");
    assertThat(typed).isEqualTo(canonicalCircuitJsonText(JSON.parse(typed)));
});

suite.test("parse_errors", () => {
    let e = parseError("H q0\nFoo q1");
    assertThat(e.line).isEqualTo(2);
    assertThat(e.message).isEqualTo("Unknown gate 'Foo'.");

    assertThat(parseError("H q0, X q0").line).isEqualTo(1);
    assertThat(parseError("\n\nQFT3 q0, H q2").line).isEqualTo(3);
    assertThat(parseError("H").message).isEqualTo("'H' needs a qubit, like 'H q0'.");
    assertThat(parseError("H x0").line).isEqualTo(1);
    assertThat(parseError("qubits 2\nH q2").line).isEqualTo(2);
    assertThat(parseError("H q2\nqubits 2").line).isEqualTo(1);
    assertThat(parseError("H q16").line).isEqualTo(1);
    assertThat(parseError("H[2] q0").message).isEqualTo("H doesn't take an argument.");
    assertThat(parseError("setA[70000] q0").line).isEqualTo(1);
    assertThat(parseError("Rzft[bogus(] q0").line).isEqualTo(1);
    assertThat(parseError("init q0 = 7").line).isEqualTo(1);
    assertThat(parseError("~missing q0").line).isEqualTo(1);
    assertThat(parseError('gate ~a = {"id":"~b","matrix":"{{1,0},{0,1}}"}').line).isEqualTo(1);
    assertThat(parseError('gate ~a = {"id":"~a","matrix":"{{1,0,0},{0,1,0},{0,0,1}}"}').line).isEqualTo(1);
    assertThat(parseError("H q0,, X q1").line).isEqualTo(1);
    assertThrows(() => QubitBoardDsl.parse("Foo q0"));
});

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
import {Gates} from "../../src/gates/AllGates.js"
import {QubitBoardDsl} from "../../src/code/languages/QubitBoardDsl.js"
import {EXAMPLE_CIRCUITS, assertCodeRoundTrip, assertEveryGateRoundTrips} from "./CodeTestUtil.js"
import {gateNameOf, findGateByName} from "../../src/code/CircuitCode.js"
import {CustomGateSet} from "../../src/circuit/CustomGateSet.js"

let suite = new Suite("QubitBoardDsl");

/** The error that parsing the code gives, as "Line N: message". */
let parseError = (code: string): string => {
    try {
        QubitBoardDsl.parse(code);
    } catch (ex) {
        if (ex instanceof CodeError) {
            return ex.toString();
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

suite.test("emptyColumn", () => {
    let json = '{"cols":[["Amps2"],[],[1,1,1,"H"]]}';
    let body = QubitBoardDsl.emit(json).split('\n').filter(e => e !== '' && !e.startsWith('#'));
    assertThat(body).isEqualTo(["qubits 4", "Amps2 q0", "skip", "H q3"]);
    assertThat(QubitBoardDsl.parse("Amps2 q0\nskip\nH q3")).isEqualTo(json);
    // Without the skip line, H goes in the column beside the wide display.
    assertThat(QubitBoardDsl.parse("Amps2 q0\nH q3")).isEqualTo('{"cols":[["Amps2"],[1,1,1,"H"]]}');
    // An empty column that nothing covers is removed, like after a drop.
    assertThat(QubitBoardDsl.parse("H q0\nskip\nskip\nX q0\nskip")).isEqualTo('{"cols":[["H"],["X"]]}');
});

suite.test("parse_matchesDragAndDropLayout", () => {
    // A gate typed onto a wide gate's second column gets pushed right, exactly like dropping it there would.
    assertThat(QubitBoardDsl.parse("Rzft[sin(pi t)] q0\nH q0")).isEqualTo(
        '{"cols":[[{"id":"Rzft","arg":"sin(pi t)"}],[],["H"]]}');
    assertThat(QubitBoardDsl.parse("Rzft[sin(pi t)] q0\nH q1")).isEqualTo(
        '{"cols":[[{"id":"Rzft","arg":"sin(pi t)"}],[1,"H"]]}');
});

suite.test("parse_errors", () => {
    assertThat(parseError("H q0\nFoo q1")).isEqualTo("Line 2: Unknown gate 'Foo'.");
    assertThat(parseError("H q0, X q0")).isEqualTo(
        "Line 1: X on q0 overlaps H on q0 in the same column. Put one of them on its own line.");
    assertThat(parseError("\n\nQFT3 q0, H q2")).isEqualTo(
        "Line 3: H on q2 overlaps QFT3 on q0 in the same column. Put one of them on its own line.");
    assertThat(parseError("H")).isEqualTo("Line 1: 'H' needs a qubit, like 'H q0'.");
    assertThat(parseError("H x0")).isEqualTo("Line 1: Expected a qubit like 'q0' but found 'x0'.");
    assertThat(parseError("qubits 2\nH q2")).isEqualTo(
        "Line 2: H on q2 doesn't fit: the circuit has 2 qubits (q0..q1).");
    assertThat(parseError("H q2\nqubits 2")).isEqualTo(
        "Line 1: H on q2 doesn't fit: the circuit has 2 qubits (q0..q1).");
    assertThat(parseError("H q16")).isEqualTo("Line 1: H on q16 doesn't fit: the circuit has 16 qubits (q0..q15).");
    assertThat(parseError("H[2] q0")).isEqualTo("Line 1: H doesn't take an argument.");
    assertThat(parseError("setA[70000] q0")).isEqualTo(
        "Line 1: setA needs a whole number between 0 and 65535, not '70000'.");
    assertThat(parseError("Rzft[bogus(] q0")).isEqualTo("Line 1: Rzft can't evaluate the formula 'bogus('.");
    assertThat(parseError("init q0 = 7")).isEqualTo(
        "Line 1: Unknown initial state '7'. Use one of: 0, 1, +, -, i, -i.");
    assertThat(parseError("~missing q0")).isEqualTo(
        "Line 1: Unknown gate '~missing'. Define it first with a 'gate ~missing = {...}' line.");
    assertThat(parseError('gate ~a = {"id":"~b","matrix":"{{1,0},{0,1}}"}')).isEqualTo(
        "Line 1: The gate is named '~a' but its JSON has id '~b'.");
    assertThat(parseError('gate ~a = {"id":"~a","matrix":"{{1,0,0},{0,1,0},{0,0,1}}"}')).isEqualTo(
        "Line 1: A gate matrix must be square with size 2, 4, 8 or 16.");
    assertThat(parseError("H q0,, X q1")).isEqualTo("Line 1: Empty gate in the list. Remove the extra comma.");
});

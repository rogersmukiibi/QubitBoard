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

import {assertThat} from "../TestUtil.js"
import {Gates} from "../../src/gates/AllGates.js"
import {canonicalCircuitJsonText} from "../../src/code/CircuitCode.js"
import type {CodeLanguage} from "../../src/code/Languages.js"

/** Circuits from the menu's examples, covering custom gates, displays, inputs, arithmetic and postselection. */
const EXAMPLE_CIRCUITS: {[name: string]: object} = {
    grover: {"cols":[["X","X","X","X","X"],["H","H","H","H","H"],["Chance5"],["~vn6c"],["⊖","⊖","⊖","⊖","X"],["Chance5"],["~vn6c"],["⊖","⊖","⊖","⊖","X"],["Chance5"]],"gates":[{"id":"~vn6c","name":"Oracle","circuit":{"cols":[["Z","•","◦","•","•"]]}}]},
    teleport: {"cols":[[1,"H"],[1,"•",1,1,"X"],["…","…",1,1,"…"],["…","…",1,1,"…"],["~87lj"],["Bloch"],["•","X"],["H"],["Measure","Measure"],[1,"•",1,1,"X"],["•",1,1,1,"Z"],[1,1,1,1,"Bloch"],[1,1,1,1,"~f7c0"]],"gates":[{"id":"~87lj","name":"message","circuit":{"cols":[["e^-iYt"],["X^t"]]}},{"id":"~f7c0","name":"received","matrix":"{{1,0},{0,1}}"}]},
    shor: {"cols":[[1,1,1,1,1,1,1,1,1,1,"~input",1,1,1,"~guess"],[1,1,1,1,1,1,1,1,1,1,{"id":"setR","arg":55},1,1,1,{"id":"setB","arg":26}],[],["H","H","H","H","H","H","H","H","H","H","X"],["inputA10",1,1,1,1,1,1,1,1,1,"*BToAmodR6"],["QFT†10"],[1,1,1,1,"~out"],["Chance10"]],"gates":[{"id":"~guess","name":"guess:","matrix":"{{1,0,0,0},{0,1,0,0},{0,0,1,0},{0,0,0,1}}"},{"id":"~input","name":"input:","matrix":"{{1,0,0,0},{0,1,0,0},{0,0,1,0},{0,0,0,1}}"},{"id":"~out","name":"out:","matrix":"{{1,0,0,0},{0,1,0,0},{0,0,1,0},{0,0,0,1}}"}]},
    postselect: {"cols":[["H","H","H","H"],["Chance4"],["Amps1","|0⟩⟨0|","|+⟩⟨+|","|X⟩⟨X|"]],"init":[0,"+",1,"-i"]},
    formulas: {"cols":[[{"id":"Rxft","arg":"pi/2"}],["•",{"id":"Ryft","arg":"-pi^2/3"}],[{"id":"Z^ft","arg":"1/3"}],["◦","•",{"id":"Rzft","arg":"2 pi"}],[{"id":"X^ft","arg":"sin(pi t)"}]]},
    swaps: {"cols":[["Swap","Swap"],["•","Swap","Swap"],["◦","Swap",1,"Swap"]]}
};

/**
 * Checks that emitting a circuit as code and parsing the code gives back exactly the same circuit.
 */
function assertCodeRoundTrip(language: CodeLanguage, circuitJson: object): void {
    let canonical = canonicalCircuitJsonText(circuitJson);
    let code = language.emit(canonical);
    let back: string;
    try {
        back = language.parse(code);
    } catch (ex) {
        throw new Error(`${language.label} couldn't parse its own code for ${canonical}:\n${code}\n${ex}`);
    }
    assertThat(back).withInfo({code}).isEqualTo(canonical);
}

function assertEveryGateRoundTrips(language: CodeLanguage): void {
    for (let gate of Gates.KnownToSerializer) {
        let json: string | object = gate.param === undefined ? gate.serializedId : {id: gate.serializedId, arg: gate.param};
        assertCodeRoundTrip(language, {cols: [[json]]});
        if (gate.height === 1) {
            assertCodeRoundTrip(language, {cols: [["•", "◦", json]]});
        }
    }
}

export {EXAMPLE_CIRCUITS, assertCodeRoundTrip, assertEveryGateRoundTrips}

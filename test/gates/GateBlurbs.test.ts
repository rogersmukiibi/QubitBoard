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

import {Suite, assertThat, assertTrue} from "../TestUtil.js"
import {Gates} from "../../src/gates/AllGates.js"
import {Complex} from "../../src/math/Complex.js"
import {Matrix} from "../../src/math/Matrix.js"

let suite = new Suite("GateBlurbs");

const POSTSELECT_BLURB = /^Keeps (\S+) states, discards\/retries (\S+) states\.$/;

/**
 * @returns The single-qubit state that a tooltip names, such as "OFF-iON", as a column vector.
 */
function stateNamed(name: string): Matrix {
    let match = /^OFF([+-])(i?)ON$/.exec(name);
    if (match === null) {
        throw new Error(`Not a state name: ${name}`);
    }
    let amplitude = (match[2] === 'i' ? Complex.I : Complex.ONE).times(match[1] === '-' ? -1 : 1);
    return Matrix.col(1, amplitude);
}

/**
 * @returns The names of the states that a postselection tooltip says are kept and discarded.
 */
function statesIn(blurb: string): [string, string] {
    let match = POSTSELECT_BLURB.exec(blurb);
    if (match === null) {
        throw new Error(`Not a postselection tooltip: ${blurb}`);
    }
    return [match[1], match[2]];
}

suite.test("tooltipsHaveNoKnownTypos", () => {
    let typo = /Principle|proportional its/;
    assertThat(Gates.KnownToSerializer.filter(gate => typo.test(gate.blurb)).map(gate => gate.serializedId)).
        isEqualTo([]);
});

suite.test("hadamardTooltipMatchesItsMatrix", () => {
    let blurb = Gates.HalfTurns.H.blurb;
    assertTrue(blurb.includes("Maps OFF to OFF + ON."));
    assertTrue(blurb.includes("Maps ON to OFF - ON."));
});

suite.test("zAxisPostselectionTooltipsUseTheSameCase", () => {
    assertThat(Gates.PostSelectionGates.PostSelectOff.blurb).
        isEqualTo("Keeps OFF states, discards/retries ON states.");
    assertThat(Gates.PostSelectionGates.PostSelectOn.blurb).
        isEqualTo("Keeps ON states, discards/retries OFF states.");
});

suite.test("xyAxisPostselectionTooltipsNameTheStatesTheirMatrixKeepsAndDiscards", () => {
    let gates = Gates.PostSelectionGates;
    for (let gate of [gates.PostSelectAntiX, gates.PostSelectX, gates.PostSelectAntiY, gates.PostSelectY]) {
        let [kept, discarded] = statesIn(gate.blurb);
        let matrix = gate.knownMatrixAt(0);
        assertThat(matrix.times(stateNamed(kept))).isApproximatelyEqualTo(stateNamed(kept));
        assertThat(matrix.times(stateNamed(discarded))).isApproximatelyEqualTo(Matrix.col(0, 0));
    }
});

suite.test("xyAxisControlTooltipsNameTheStateTheirPostselectionKeeps", () => {
    let controls = Gates.Controls;
    let gates = Gates.PostSelectionGates;
    let pairs = [
        [controls.XAntiControl, gates.PostSelectAntiX],
        [controls.XControl, gates.PostSelectX],
        [controls.YAntiControl, gates.PostSelectAntiY],
        [controls.YControl, gates.PostSelectY]
    ];
    for (let [control, postselection] of pairs) {
        let [kept] = statesIn(postselection.blurb);
        assertTrue(control.blurb.startsWith(`Conditions on a qubit being ${kept}.\n`));
    }
});

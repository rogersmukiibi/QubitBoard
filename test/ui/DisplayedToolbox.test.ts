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
import {CustomGateSet} from "../../src/circuit/CustomGateSet.js"
import {DisplayedInspector} from "../../src/ui/DisplayedInspector.js"
import {DisplayedToolbox} from "../../src/ui/DisplayedToolbox.js"
import {Gates} from "../../src/gates/AllGates.js"
import {Rect} from "../../src/math/Rect.js"

let suite = new Suite("DisplayedToolbox");

const toolboxAt = (width: number) => new DisplayedToolbox('Toolbox', 0, Gates.ToolboxGroups).withWidth(width);

const gateRects = (toolbox: DisplayedToolbox): Rect[] => {
    let rects: Rect[] = [];
    toolbox.toolboxGroups.forEach((group, groupIndex) => group.gates.forEach((gate, gateIndex) => {
        if (gate !== undefined) {
            rects.push(toolbox.gateDrawRect(groupIndex, gateIndex));
        }
    }));
    return rects;
};

const overlaps = (a: Rect, b: Rect) =>
    a.x < b.right() && b.x < a.right() && a.y < b.bottom() && b.y < a.bottom();

const rowTops = (toolbox: DisplayedToolbox): number[] =>
    [...new Set(toolbox.toolboxGroups.map((_, groupIndex) => toolbox.gateDrawRect(groupIndex, 0).y))];

suite.test("groupsWrapAtTheLastOneThatFits", () => {
    let oneRowWidth = toolboxAt(Infinity).desiredWidth();
    let n = Gates.ToolboxGroups.length;
    assertThat(toolboxAt(oneRowWidth).groupsPerRow).isEqualTo(n);
    assertThat(rowTops(toolboxAt(oneRowWidth)).length).isEqualTo(1);
    assertThat(toolboxAt(oneRowWidth - 1).groupsPerRow).isEqualTo(n - 1);
    assertThat(rowTops(toolboxAt(oneRowWidth - 1)).length).isEqualTo(2);
});

suite.test("everyGateFitsInsideTheWidth", () => {
    for (let width of [400, 800, 1366, 1920]) {
        let toolbox = toolboxAt(width);
        assertTrue(toolbox.desiredWidth() <= width);
        for (let rect of gateRects(toolbox)) {
            assertTrue(rect.right() <= width);
        }
    }
});

suite.test("narrowerThanOneGroupStillShowsOneGroupPerRow", () => {
    let toolbox = toolboxAt(10);
    assertThat(toolbox.groupsPerRow).isEqualTo(1);
    assertThat(rowTops(toolbox).length).isEqualTo(Gates.ToolboxGroups.length);
});

suite.test("wrappedToolboxIsTallEnoughForEveryGate", () => {
    let toolbox = toolboxAt(800);
    assertTrue(rowTops(toolbox).length > 1);
    assertTrue(toolbox.desiredHeight() > toolboxAt(Infinity).desiredHeight());
    for (let rect of gateRects(toolbox)) {
        assertTrue(rect.bottom() <= toolbox.desiredHeight());
    }
});

suite.test("wrappedGatesAndLabelsDontOverlap", () => {
    let toolbox = toolboxAt(800);
    let rects = gateRects(toolbox);
    for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
            assertThat(overlaps(rects[i], rects[j])).isEqualTo(false);
        }
    }
    toolbox.toolboxGroups.forEach((group, groupIndex) => {
        let label = toolbox.groupLabelRect(groupIndex);
        toolbox.toolboxGroups.forEach((other, otherIndex) => other.gates.forEach((gate, gateIndex) => {
            if (otherIndex !== groupIndex && gate !== undefined) {
                assertThat(overlaps(label, toolbox.gateDrawRect(otherIndex, gateIndex))).isEqualTo(false);
            }
        }));
    });
});

suite.test("wrappedGatesAreFoundWhereTheyAreDrawn", () => {
    let toolbox = toolboxAt(800);
    toolbox.toolboxGroups.forEach((group, groupIndex) => group.gates.forEach((gate, gateIndex) => {
        if (gate !== undefined) {
            let found = toolbox.findGateAt(toolbox.gateDrawRect(groupIndex, gateIndex).center());
            assertThat(found === undefined ? undefined : found.gate).isEqualTo(gate);
        }
    }));
});

suite.test("customGateGroupsWrapToo", () => {
    let toolbox = toolboxAt(800).withCustomGatesInserted(new CustomGateSet(Gates.HalfTurns.X));
    assertThat(toolbox.toolboxGroups.length).isEqualTo(Gates.ToolboxGroups.length + 1);
    assertThat(toolbox.groupsPerRow).isEqualTo(toolboxAt(800).groupsPerRow);
    for (let rect of gateRects(toolbox)) {
        assertTrue(rect.right() <= 800);
    }
});

suite.test("noCustomGatesGroupUntilThereAreCustomGates", () => {
    let toolbox = toolboxAt(Infinity).withCustomGatesInserted(new CustomGateSet());
    assertThat(toolbox.toolboxGroups).isEqualTo(Gates.ToolboxGroups);
    assertThat(rowTops(toolbox).length).isEqualTo(1);
});

suite.test("inspectorWrapsTheToolboxToItsWidth", () => {
    let inspector = DisplayedInspector.empty(new Rect(0, 0, 800, 600));
    assertThat(inspector.displayedToolbox.groupsPerRow).isEqualTo(toolboxAt(800).groupsPerRow);
    assertTrue(inspector.desiredWidth() <= 800);
});

suite.test("circuitFollowsTheToolboxHeight", () => {
    let inspector = DisplayedInspector.empty(new Rect(0, 0, 800, 600));
    let narrowTop = inspector.displayedCircuit.top;
    assertThat(narrowTop).isEqualTo(inspector.displayedToolbox.desiredHeight());

    inspector.updateArea(new Rect(0, 0, 4000, 600));
    assertThat(inspector.displayedCircuit.top).isEqualTo(inspector.displayedToolbox.desiredHeight());
    assertTrue(inspector.displayedCircuit.top < narrowTop);
    let circuit = inspector.displayedCircuit;
    assertTrue(circuit.top + circuit.desiredHeight() <= inspector.desiredHeight());
});

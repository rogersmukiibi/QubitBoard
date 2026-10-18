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
import {CircuitStats} from "../../src/circuit/CircuitStats.js"
import {CustomGateSet} from "../../src/circuit/CustomGateSet.js"
import {Painter} from "../../src/draw/Painter.js"
import {DisplayedInspector} from "../../src/ui/DisplayedInspector.js"
import {DisplayedToolbox} from "../../src/ui/DisplayedToolbox.js"
import {Gates} from "../../src/gates/AllGates.js"
import {Hand} from "../../src/ui/Hand.js"
import {Point} from "../../src/math/Point.js"
import {Rect} from "../../src/math/Rect.js"

let suite = new Suite("DisplayedToolbox");

const toolbox = () => new DisplayedToolbox('Toolbox', 0, Gates.ToolboxGroups);

const gateRects = (box: DisplayedToolbox): Rect[] => {
    let rects: Rect[] = [];
    box.toolboxGroups.forEach((group, groupIndex) => group.gates.forEach((gate, gateIndex) => {
        if (gate !== undefined) {
            rects.push(box.gateDrawRect(groupIndex, gateIndex));
        }
    }));
    return rects;
};

const overlaps = (a: Rect, b: Rect) =>
    a.x < b.right() && b.x < a.right() && a.y < b.bottom() && b.y < a.bottom();

suite.test("everyGroupIsInOneRowFromLeftToRight", () => {
    let box = toolbox();
    let firstGates = box.toolboxGroups.map((_, groupIndex) => box.gateDrawRect(groupIndex, 0));
    assertThat(new Set(firstGates.map(rect => rect.y)).size).isEqualTo(1);
    let lefts = firstGates.map(rect => rect.x);
    assertThat(lefts).isEqualTo([...lefts].sort((a, b) => a - b));
});

suite.test("groupsAreAtMostThreeGatesTall", () => {
    assertThat(new Set(gateRects(toolbox()).map(rect => rect.y)).size).isEqualTo(3);
});

suite.test("pairsInTheFirstThreeRowsStaySideBySide", () => {
    let box = toolbox();
    box.toolboxGroups.forEach((group, groupIndex) => {
        for (let gateIndex = 0; gateIndex + 1 < Math.min(6, group.gates.length); gateIndex += 2) {
            let left = box.gateDrawRect(groupIndex, gateIndex);
            let right = box.gateDrawRect(groupIndex, gateIndex + 1);
            assertThat(right.y).isEqualTo(left.y);
            assertTrue(right.x > left.x);
        }
    });
});

suite.test("gatesDontOverlapEachOtherOrOtherGroupsLabels", () => {
    let box = toolbox();
    let rects = gateRects(box);
    for (let i = 0; i < rects.length; i++) {
        for (let j = i + 1; j < rects.length; j++) {
            assertThat(overlaps(rects[i], rects[j])).isEqualTo(false);
        }
    }
    box.toolboxGroups.forEach((group, groupIndex) => {
        let label = box.groupLabelRect(groupIndex);
        box.toolboxGroups.forEach((other, otherIndex) => other.gates.forEach((gate, gateIndex) => {
            if (otherIndex !== groupIndex && gate !== undefined) {
                assertThat(overlaps(label, box.gateDrawRect(otherIndex, gateIndex))).isEqualTo(false);
            }
        }));
    });
});

suite.test("toolboxIsWideAndTallEnoughForEveryGate", () => {
    let box = toolbox();
    for (let rect of gateRects(box)) {
        assertTrue(rect.right() <= box.desiredWidth());
        assertTrue(rect.bottom() <= box.desiredHeight());
    }
});

suite.test("gatesAreFoundWhereTheyAreDrawn", () => {
    let box = toolbox();
    box.toolboxGroups.forEach((group, groupIndex) => group.gates.forEach((gate, gateIndex) => {
        if (gate !== undefined) {
            let found = box.findGateAt(box.gateDrawRect(groupIndex, gateIndex).center());
            assertThat(found === undefined ? undefined : found.gate).isEqualTo(gate);
        }
    }));
});

suite.test("customGatesGoAtTheEndOfTheRow", () => {
    let box = toolbox().withCustomGatesInserted(new CustomGateSet(Gates.HalfTurns.X));
    assertThat(box.toolboxGroups.length).isEqualTo(Gates.ToolboxGroups.length + 1);
    let custom = box.gateDrawRect(box.toolboxGroups.length - 1, 0);
    assertThat(custom.y).isEqualTo(box.gateDrawRect(0, 0).y);
    assertTrue(custom.x >= toolbox().desiredWidth());
    assertTrue(custom.right() <= box.desiredWidth());
});

suite.test("noCustomGatesGroupUntilThereAreCustomGates", () => {
    let box = toolbox().withCustomGatesInserted(new CustomGateSet());
    assertThat(box.toolboxGroups).isEqualTo(Gates.ToolboxGroups);
});

suite.test("scrollingMovesTheGatesLeft", () => {
    let box = toolbox().withViewWidth(800);
    let scrolled = box.withScrolledBy(100);
    assertThat(scrolled.scrollX).isEqualTo(100);
    assertThat(scrolled.gateDrawRect(3, 1).x).isEqualTo(box.gateDrawRect(3, 1).x - 100);
    let found = scrolled.findGateAt(scrolled.gateDrawRect(3, 1).center());
    assertThat(found === undefined ? undefined : found.gate).isEqualTo(Gates.ToolboxGroups[3].gates[1]);
});

suite.test("scrollingStopsAtBothEnds", () => {
    let box = toolbox().withViewWidth(800);
    assertThat(box.withScrolledBy(-50).scrollX).isEqualTo(0);
    let end = box.withScrolledBy(1e6);
    assertThat(end.scrollX).isEqualTo(box.desiredWidth() - 800);
    assertThat(end.withScrolledBy(10).scrollX).isEqualTo(end.scrollX);
    assertThat(end.withViewWidth(1500).scrollX).isEqualTo(box.desiredWidth() - 1500);
    assertThat(end.withViewWidth(1e5).scrollX).isEqualTo(0);
});

suite.test("scrollButtonsShowWhereThereIsMoreToSee", () => {
    let box = toolbox().withViewWidth(800);
    assertThat(box.scrollButtonRect(-1)).isEqualTo(undefined);
    assertTrue(box.scrollButtonRect(+1) !== undefined);
    let end = box.withScrolledBy(1e6);
    assertTrue(end.scrollButtonRect(-1) !== undefined);
    assertThat(end.scrollButtonRect(+1)).isEqualTo(undefined);
    assertThat(toolbox().withViewWidth(1e5).scrollButtonRect(+1)).isEqualTo(undefined);
});

suite.test("aScrollButtonIsNotAGate", () => {
    let box = toolbox().withViewWidth(800);
    let button = box.scrollButtonRect(+1);
    assertTrue(button !== undefined);
    if (button !== undefined) {
        assertThat(box.findGateAt(button.center())).isEqualTo(undefined);
    }
});

suite.test("scrollingKeepsCustomGates", () => {
    let box = toolbox().withViewWidth(800).withScrolledBy(100).
        withCustomGatesInserted(new CustomGateSet(Gates.HalfTurns.X));
    assertThat(box.scrollX).isEqualTo(100);
    assertThat(box.withTop(5).scrollX).isEqualTo(100);
});

suite.test("touchBlockersStayInsideTheView", () => {
    let canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 200;
    for (let box of [toolbox().withViewWidth(800), toolbox().withViewWidth(800).withScrolledBy(300)]) {
        let painter = new Painter(canvas);
        box.paint(painter, CircuitStats.EMPTY, Hand.EMPTY);
        assertTrue(painter.touchBlockers.length > 0);
        for (let {rect} of painter.touchBlockers) {
            assertTrue(rect.x >= 0 && rect.right() <= 800);
        }
    }
});

suite.test("inspectorDoesNotWidenForTheToolbox", () => {
    let inspector = DisplayedInspector.empty(new Rect(0, 0, 800, 600));
    assertTrue(inspector.desiredWidth() < toolbox().desiredWidth());
});

suite.test("inspectorKeepsTheToolboxScroll", () => {
    let inspector = DisplayedInspector.empty(new Rect(0, 0, 800, 600)).withToolboxScrolledBy(100);
    assertThat(inspector.displayedToolbox.scrollX).isEqualTo(100);
    assertThat(inspector.withHand(Hand.EMPTY).displayedToolbox.scrollX).isEqualTo(100);
    let circuit = inspector.displayedCircuit.circuitDefinition;
    assertThat(inspector.withCircuitDefinition(circuit).displayedToolbox.scrollX).isEqualTo(100);
    inspector.updateArea(new Rect(0, 0, 820, 600));
    assertThat(inspector.displayedToolbox.scrollX).isEqualTo(100);
});

suite.test("inspectorScrollsTheToolboxFromItsButtons", () => {
    let inspector = DisplayedInspector.empty(new Rect(0, 0, 800, 600));
    let right = inspector.displayedToolbox.scrollButtonRect(+1);
    assertTrue(right !== undefined);
    if (right !== undefined) {
        let scrolled = inspector.tryScrollToolboxAt(right.center());
        assertTrue(scrolled !== undefined && scrolled.displayedToolbox.scrollX > 0);
    }
    assertThat(inspector.tryScrollToolboxAt(new Point(400, 300))).isEqualTo(undefined);
});

suite.test("hintsFadeOutAsTheToolboxScrollsAway", () => {
    let inspector = DisplayedInspector.empty(new Rect(0, 0, 800, 600));
    assertThat(inspector._hintVisibility()).isEqualTo(1);
    assertTrue(inspector.withToolboxScrolledBy(50)._hintVisibility() < 1);
    assertThat(inspector.withToolboxScrolledBy(200)._hintVisibility()).isEqualTo(0);
});

suite.test("circuitSitsBelowTheToolbox", () => {
    let inspector = DisplayedInspector.empty(new Rect(0, 0, 800, 600));
    assertThat(inspector.displayedCircuit.top).isEqualTo(inspector.displayedToolbox.desiredHeight());
    let circuit = inspector.displayedCircuit;
    assertTrue(circuit.top + circuit.desiredHeight() <= inspector.desiredHeight());
});

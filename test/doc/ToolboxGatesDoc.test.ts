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
import {Gates} from "../../src/gates/AllGates.js"
import toolboxPage from "../../doc/gates/toolbox.md"

let suite = new Suite("ToolboxGatesDoc");

interface ToolboxGroup {
    hint: string;
    gates: Array<undefined | {serializedId: string}>;
}

/**
 * @returns The page's "## " sections in order, as [heading, body] pairs.
 */
function sectionsOf(page: string): Array<[string, string]> {
    return page.split(/^## /m).slice(1).map((section): [string, string] => {
        let end = section.indexOf('\n');
        return [section.substring(0, end).trim(), section.substring(end).split('\\|').join('|')];
    });
}

/**
 * @returns The toolbox gates whose id isn't written, in backticks, in the section named after their group.
 */
function undocumentedGates(page: string, groups: ToolboxGroup[]): string[] {
    let sections = new Map(sectionsOf(page));
    let missing: string[] = [];
    for (let group of groups) {
        let body = sections.get(group.hint) || '';
        for (let gate of group.gates) {
            if (gate !== undefined && !body.includes('`' + gate.serializedId + '`')) {
                missing.push(`${group.hint}: ${gate.serializedId}`);
            }
        }
    }
    return missing;
}

/**
 * @returns The picture at the start of the table row that names each toolbox gate, or a note that it has none.
 */
function gatePictures(page: string, groups: ToolboxGroup[]): string[] {
    let sections = new Map(sectionsOf(page));
    let pictures: string[] = [];
    for (let group of groups) {
        let rows = (sections.get(group.hint) || '').split('\n').filter(line => line.startsWith('|'));
        for (let gate of group.gates) {
            if (gate !== undefined) {
                let row = rows.find(line => line.includes('`' + gate.serializedId + '`')) || '';
                let match = /^\| !\[[^\]]+\]\((\.\.\/images\/gates\/[a-z0-9-]+\.png)\) \|/.exec(row);
                pictures.push(match === null ? `${group.hint}: ${gate.serializedId} has no picture` : match[1]);
            }
        }
    }
    return pictures;
}

suite.test("toolboxPageHasASectionPerGroupInToolboxOrder", () => {
    assertThat(sectionsOf(toolboxPage).map(e => e[0])).isEqualTo(Gates.ToolboxGroups.map(e => e.hint));
});

suite.test("toolboxPageNamesEveryGate", () => {
    assertThat(undocumentedGates(toolboxPage, Gates.ToolboxGroups)).isEqualTo([]);
});

suite.test("everyGateRowStartsWithItsOwnPicture", () => {
    let pictures = gatePictures(toolboxPage, Gates.ToolboxGroups);
    assertThat(pictures.filter(picture => picture.endsWith('has no picture'))).isEqualTo([]);
    assertThat(pictures.filter((picture, index) => pictures.indexOf(picture) !== index)).isEqualTo([]);
});

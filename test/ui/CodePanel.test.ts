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
import {Observable} from "../../src/base/Obs.js"
import {Revision} from "../../src/base/Revision.js"
import {initCodePanel} from "../../src/ui/codePanel.js"

let suite = new Suite("CodePanel");

const STORAGE_KEYS = ['qubitboard.codePanel.collapsed', 'qubitboard.codePanel.closed'];

const ELEMENTS = `
    <div id="code-panel" style="display: none">
        <div id="code-panel-resize"></div>
        <button id="code-panel-toggle"></button>
        <select id="code-panel-language"></select>
        <button id="code-panel-run"></button>
        <button id="code-panel-copy"></button>
        <span id="code-panel-status"></span>
        <div id="code-panel-body">
            <div id="code-panel-gutter"></div>
            <pre id="code-panel-highlight"></pre>
            <textarea id="code-panel-text"></textarea>
        </div>
    </div>`;

/**
 * Runs the test against a fresh copy of the panel's elements, with the panel's settings cleared and restored after.
 */
const withPanel = (test: (byId: (id: string) => HTMLElement) => void) => {
    let saved = STORAGE_KEYS.map(key => window.localStorage.getItem(key));
    let padding = document.body.style.paddingBottom;
    let container = document.createElement('div');
    try {
        STORAGE_KEYS.forEach(key => window.localStorage.removeItem(key));
        container.innerHTML = ELEMENTS;
        document.body.appendChild(container);
        test(id => {
            let element = container.querySelector(`#${id}`);
            if (element === null) {
                throw new Error(`Missing #${id}`);
            }
            return element as HTMLElement;
        });
    } finally {
        container.remove();
        document.body.style.paddingBottom = padding;
        STORAGE_KEYS.forEach((key, i) => {
            let value = saved[i];
            if (value === null) {
                window.localStorage.removeItem(key);
            } else {
                window.localStorage.setItem(key, value);
            }
        });
    }
};

const init = () => initCodePanel(Revision.startingAt('{"cols":[]}'), Observable.of(false));

suite.test("minimisingHidesTheCodeButKeepsTheHeader", () => withPanel(byId => {
    init();
    byId('code-panel-toggle').click();
    assertThat(byId('code-panel').style.display).isEqualTo('block');
    assertThat(byId('code-panel-body').style.display).isEqualTo('none');
    assertThat(byId('code-panel-toggle').getAttribute('aria-expanded')).isEqualTo('false');
    byId('code-panel-toggle').click();
    assertThat(byId('code-panel-body').style.display).isEqualTo('flex');
}));

suite.test("aMinimisedPanelStartsMinimised", () => withPanel(byId => {
    window.localStorage.setItem('qubitboard.codePanel.collapsed', 'true');
    init();
    assertThat(byId('code-panel').style.display).isEqualTo('block');
    assertThat(byId('code-panel-body').style.display).isEqualTo('none');
}));

suite.test("thePanelAlwaysShowsEvenIfAnEarlierVersionSavedItClosed", () => withPanel(byId => {
    window.localStorage.setItem('qubitboard.codePanel.closed', 'true');
    init();
    assertThat(byId('code-panel').style.display).isEqualTo('block');
}));

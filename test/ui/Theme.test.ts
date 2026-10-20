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
import {activeThemeName, setActiveTheme} from "../../src/Palette.js"
import {initTheme, nextThemePreference, parseThemePreference, resolveTheme} from "../../src/ui/theme.js"

let suite = new Suite("Theme");

const STORAGE_KEY = 'qubitboard.theme';

class FakeDarkQuery {
    matches: boolean;
    private _listeners: (() => void)[] = [];

    constructor(matches: boolean) {
        this.matches = matches;
    }

    addEventListener(_type: 'change', listener: () => void): void {
        this._listeners.push(listener);
    }

    change(matches: boolean): void {
        this.matches = matches;
        this._listeners.forEach(listener => listener());
    }
}

/**
 * Runs the test with a fresh theme button and the stored theme cleared, restoring the page's theme after.
 */
const withButton = (test: (button: HTMLButtonElement) => void) => {
    let saved = window.localStorage.getItem(STORAGE_KEY);
    let button = document.createElement('button');
    try {
        window.localStorage.removeItem(STORAGE_KEY);
        document.body.appendChild(button);
        test(button);
    } finally {
        button.remove();
        document.documentElement.removeAttribute('data-theme');
        setActiveTheme('light');
        if (saved === null) {
            window.localStorage.removeItem(STORAGE_KEY);
        } else {
            window.localStorage.setItem(STORAGE_KEY, saved);
        }
    }
};

suite.test("parseThemePreference", () => {
    assertThat(parseThemePreference('dark')).isEqualTo('dark');
    assertThat(parseThemePreference('light')).isEqualTo('light');
    assertThat(parseThemePreference('auto')).isEqualTo('auto');
    assertThat(parseThemePreference(null)).isEqualTo('auto');
    assertThat(parseThemePreference('purple')).isEqualTo('auto');
});

suite.test("resolveTheme", () => {
    assertThat(resolveTheme('auto', true)).isEqualTo('dark');
    assertThat(resolveTheme('auto', false)).isEqualTo('light');
    assertThat(resolveTheme('light', true)).isEqualTo('light');
    assertThat(resolveTheme('dark', false)).isEqualTo('dark');
});

suite.test("nextThemePreferenceCycles", () => {
    assertThat(nextThemePreference('auto')).isEqualTo('light');
    assertThat(nextThemePreference('light')).isEqualTo('dark');
    assertThat(nextThemePreference('dark')).isEqualTo('auto');
});

suite.test("autoFollowsTheSystem", () => withButton(button => {
    let query = new FakeDarkQuery(true);
    let changes = 0;
    initTheme(button, () => changes++, query);
    assertThat(activeThemeName()).isEqualTo('dark');
    assertThat(document.documentElement.getAttribute('data-theme')).isEqualTo('dark');
    assertThat(button.textContent).isEqualTo('Theme: Auto');

    query.change(false);
    assertThat(activeThemeName()).isEqualTo('light');
    assertThat(document.documentElement.getAttribute('data-theme')).isEqualTo('light');
    assertThat(changes).isEqualTo(1);
}));

suite.test("aStoredThemeOverridesTheSystem", () => withButton(button => {
    window.localStorage.setItem(STORAGE_KEY, 'dark');
    let query = new FakeDarkQuery(false);
    let changes = 0;
    initTheme(button, () => changes++, query);
    assertThat(activeThemeName()).isEqualTo('dark');
    assertThat(button.textContent).isEqualTo('Theme: Dark');

    query.change(true);
    query.change(false);
    assertThat(activeThemeName()).isEqualTo('dark');
    assertThat(changes).isEqualTo(0);
}));

suite.test("clickingCyclesAndRemembersTheTheme", () => withButton(button => {
    let changes = 0;
    initTheme(button, () => changes++, new FakeDarkQuery(false));

    button.click();
    assertThat(button.textContent).isEqualTo('Theme: Light');
    assertThat(window.localStorage.getItem(STORAGE_KEY)).isEqualTo('light');
    assertThat(activeThemeName()).isEqualTo('light');
    assertThat(changes).isEqualTo(0);

    button.click();
    assertThat(button.textContent).isEqualTo('Theme: Dark');
    assertThat(window.localStorage.getItem(STORAGE_KEY)).isEqualTo('dark');
    assertThat(activeThemeName()).isEqualTo('dark');
    assertThat(document.documentElement.getAttribute('data-theme')).isEqualTo('dark');
    assertThat(changes).isEqualTo(1);

    button.click();
    assertThat(button.textContent).isEqualTo('Theme: Auto');
    assertThat(window.localStorage.getItem(STORAGE_KEY)).isEqualTo('auto');
    assertThat(activeThemeName()).isEqualTo('light');
    assertThat(changes).isEqualTo(2);
}));

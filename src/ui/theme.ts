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

import {activeThemeName, setActiveTheme} from "../Palette.js"
import {loadSetting, saveSetting} from "../browser/Settings.js"
import type {ThemeName} from "../Palette.js"

type ThemePreference = 'auto' | ThemeName;

const STORAGE_KEY = 'qubitboard.theme';
const PREFERENCE_CYCLE: ThemePreference[] = ['auto', 'light', 'dark'];
const PREFERENCE_LABELS = {auto: 'Auto', light: 'Light', dark: 'Dark'};

/** Whether the system prefers dark colors, and a way to hear when that changes. */
interface DarkQuery {
    readonly matches: boolean;
    addEventListener(type: 'change', listener: () => void): void;
}

function parseThemePreference(text: string | null | undefined): ThemePreference {
    return text === 'light' || text === 'dark' ? text : 'auto';
}

function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ThemeName {
    if (preference === 'auto') {
        return systemPrefersDark ? 'dark' : 'light';
    }
    return preference;
}

function nextThemePreference(preference: ThemePreference): ThemePreference {
    return PREFERENCE_CYCLE[(PREFERENCE_CYCLE.indexOf(preference) + 1) % PREFERENCE_CYCLE.length];
}

function systemDarkQuery(): DarkQuery {
    let query = window.matchMedia('(prefers-color-scheme: dark)');
    return {
        get matches() {
            return query.matches;
        },
        addEventListener(type: 'change', listener: () => void): void {
            if (typeof query.addEventListener === 'function') {
                query.addEventListener(type, listener);
            } else {
                // Safari before 14.
                query.addListener(listener);
            }
        }
    };
}

/**
 * Applies the stored theme, follows the system while it is on Auto, and makes the button cycle Auto, Light and Dark.
 *
 * @param button The theme button, whose label shows the current choice.
 * @param onChange Called after the palette changes, to repaint the canvas.
 * @param darkQuery Defaults to the browser's prefers-color-scheme query.
 */
function initTheme(button: HTMLButtonElement, onChange: () => void, darkQuery: DarkQuery = systemDarkQuery()): void {
    let preference = parseThemePreference(loadSetting(STORAGE_KEY));

    /** @returns Whether the palette changed. */
    const apply = (): boolean => {
        let before = activeThemeName();
        let theme = resolveTheme(preference, darkQuery.matches);
        setActiveTheme(theme);
        document.documentElement.setAttribute('data-theme', theme);
        button.textContent = `Theme: ${PREFERENCE_LABELS[preference]}`;
        return theme !== before;
    };

    button.title = 'Cycles the colors between Auto (follow the system), Light and Dark.';
    apply();
    darkQuery.addEventListener('change', () => {
        if (apply()) {
            onChange();
        }
    });
    button.addEventListener('click', () => {
        preference = nextThemePreference(preference);
        saveSetting(STORAGE_KEY, preference);
        if (apply()) {
            onChange();
        }
    });
}

export {initTheme, nextThemePreference, parseThemePreference, resolveTheme}
export type {DarkQuery, ThemePreference}

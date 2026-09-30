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

import {CODE_LANGUAGES, findCodeLanguage} from "../code/Languages.js"
import {CodeEditor} from "./CodeEditor.js"
import {CodeError} from "../code/CodeError.js"
import type {Observable} from "../base/Obs.js"
import type {Revision} from "../base/Revision.js"

const STORAGE_KEY_LANGUAGE = 'qubitboard.codePanel.language';
const STORAGE_KEY_HEIGHT = 'qubitboard.codePanel.height';
const STORAGE_KEY_COLLAPSED = 'qubitboard.codePanel.collapsed';
const MIN_BODY_HEIGHT = 60;
const DEFAULT_BODY_HEIGHT = 220;

function loadSetting(key: string): string | undefined {
    try {
        let v = window.localStorage.getItem(key);
        return v === null ? undefined : v;
    } catch (_) {
        return undefined;
    }
}

function saveSetting(key: string, value: string): void {
    try {
        window.localStorage.setItem(key, value);
    } catch (_) {
        // Storage can be unavailable (private windows, blocked site data). The panel works without it.
    }
}

/**
 * The code panel docked at the bottom of the page.
 *
 * - Every committed circuit change (drop, click, undo, redo, loading a link) rewrites the code, replacing unrun edits.
 * - Typed code only touches the circuit on Run (or Ctrl+Enter), like a notebook cell, and becomes one undo step.
 */
function initCodePanel(revision: Revision, obsIsAnyOverlayShowing: Observable): void {
    const byId = <T extends HTMLElement>(id: string): T => {
        let element = document.getElementById(id);
        if (element === null) {
            throw new Error(`Missing element #${id}`);
        }
        return element as T;
    };
    const panel = byId<HTMLDivElement>('code-panel');
    const body = byId<HTMLDivElement>('code-panel-body');
    const toggleButton = byId<HTMLButtonElement>('code-panel-toggle');
    const languageSelect = byId<HTMLSelectElement>('code-panel-language');
    const runButton = byId<HTMLButtonElement>('code-panel-run');
    const copyButton = byId<HTMLButtonElement>('code-panel-copy');
    const statusSpan = byId<HTMLSpanElement>('code-panel-status');
    const resizeHandle = byId<HTMLDivElement>('code-panel-resize');
    const textArea = byId<HTMLTextAreaElement>('code-panel-text');

    const editor = new CodeEditor(textArea, byId('code-panel-highlight'), byId('code-panel-gutter'));

    let language = findCodeLanguage(loadSetting(STORAGE_KEY_LANGUAGE) || '');
    /** The text the editor last showed for the current circuit, to tell whether the user has edited it. */
    let syncedText = '';
    /** The circuit produced by the last Run, and the code that produced it. Lets a Run keep the user's own text. */
    let lastRun: {json: string | undefined, text: string | undefined} = {json: undefined, text: undefined};

    const setStatus = (text: string, kind: 'synced' | 'dirty' | 'error') => {
        statusSpan.textContent = text;
        statusSpan.className = `qb-code-status qb-code-status-${kind}`;
    };

    const showSynced = () => setStatus('In sync with the circuit', 'synced');

    const regenerate = () => {
        let jsonText = revision.peekActiveCommit();
        let text: string;
        try {
            text = language.emit(jsonText);
        } catch (ex) {
            console.error(ex);
            text = `${language.commentPrefix} Couldn't write this circuit as ${language.label}: ${(ex as Error).message}\n`;
        }
        editor.setText(text);
        syncedText = text;
        showSynced();
    };

    // Language picker.
    for (let lang of CODE_LANGUAGES) {
        let option = document.createElement('option');
        option.value = lang.id;
        option.textContent = lang.label;
        languageSelect.appendChild(option);
    }
    languageSelect.value = language.id;
    editor.setHighlightRules(language.highlightRules);
    languageSelect.addEventListener('change', () => {
        language = findCodeLanguage(languageSelect.value);
        saveSetting(STORAGE_KEY_LANGUAGE, language.id);
        editor.setHighlightRules(language.highlightRules);
        lastRun = {json: undefined, text: undefined};
        regenerate();
    });

    // Circuit -> code.
    revision.latestActiveCommit().subscribe((jsonText: string) => {
        if (jsonText === lastRun.json && lastRun.text !== undefined && editor.getText() === lastRun.text) {
            // This change came from running the code that's already in the editor. Keep the user's text.
            syncedText = lastRun.text;
            return;
        }
        regenerate();
    });

    // Code -> circuit.
    const run = () => {
        if (runButton.disabled) {
            return;
        }
        let text = editor.getText();
        let jsonText: string;
        try {
            jsonText = language.parse(text);
        } catch (ex) {
            if (!(ex instanceof CodeError)) {
                console.error(ex);
            }
            let err = ex instanceof CodeError ? ex : new CodeError(`Unexpected problem: ${(ex as Error).message}`);
            editor.markErrorLine(err.line);
            setStatus(err.toString(), 'error');
            return;
        }

        editor.markErrorLine(undefined);
        lastRun = {json: jsonText, text};
        syncedText = text;
        if (jsonText === revision.peekActiveCommit()) {
            setStatus('Ran: the circuit already matches this code', 'synced');
        } else {
            revision.commit(jsonText);
            setStatus('Ran: circuit updated (Undo reverts it)', 'synced');
        }
    };
    editor.onRun = run;
    runButton.addEventListener('click', run);
    obsIsAnyOverlayShowing.subscribe((showing: boolean) => {
        runButton.disabled = showing;
    });

    editor.onInput = () => {
        if (editor.getText() === syncedText) {
            showSynced();
        } else {
            setStatus('Edited: press Run (Ctrl+Enter) to apply', 'dirty');
        }
    };

    // Copy.
    copyButton.addEventListener('click', () => {
        let done = () => {
            copyButton.textContent = 'Copied!';
            setTimeout(() => { copyButton.textContent = 'Copy'; }, 1000);
        };
        let text = editor.getText();
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(done, () => setStatus("Couldn't copy to the clipboard", 'error'));
        } else {
            textArea.select();
            try {
                document.execCommand('copy');
                done();
            } catch (_) {
                setStatus("Couldn't copy to the clipboard", 'error');
            }
        }
    });

    // Size, collapse and page padding.
    let bodyHeight = Number(loadSetting(STORAGE_KEY_HEIGHT)) || DEFAULT_BODY_HEIGHT;
    let collapsed = loadSetting(STORAGE_KEY_COLLAPSED) === 'true';
    const layout = () => {
        let maxHeight = Math.max(MIN_BODY_HEIGHT, Math.floor(window.innerHeight * 0.7));
        bodyHeight = Math.min(Math.max(bodyHeight, MIN_BODY_HEIGHT), maxHeight);
        body.style.height = `${bodyHeight}px`;
        body.style.display = collapsed ? 'none' : 'flex';
        resizeHandle.style.display = collapsed ? 'none' : 'block';
        toggleButton.textContent = collapsed ? '▸ Code' : '▾ Code';
        toggleButton.setAttribute('aria-expanded', String(!collapsed));
        // Leave room at the bottom of the page so the panel never hides the end of the circuit.
        document.body.style.paddingBottom = `${panel.offsetHeight}px`;
    };
    toggleButton.addEventListener('click', () => {
        collapsed = !collapsed;
        saveSetting(STORAGE_KEY_COLLAPSED, String(collapsed));
        layout();
    });
    window.addEventListener('resize', layout);

    resizeHandle.addEventListener('pointerdown', e => {
        e.preventDefault();
        resizeHandle.setPointerCapture(e.pointerId);
        let startY = e.clientY;
        let startHeight = bodyHeight;
        let onMove = (ev: PointerEvent) => {
            bodyHeight = startHeight + (startY - ev.clientY);
            layout();
        };
        let onUp = () => {
            resizeHandle.removeEventListener('pointermove', onMove);
            resizeHandle.removeEventListener('pointerup', onUp);
            resizeHandle.removeEventListener('pointercancel', onUp);
            saveSetting(STORAGE_KEY_HEIGHT, String(bodyHeight));
        };
        resizeHandle.addEventListener('pointermove', onMove);
        resizeHandle.addEventListener('pointerup', onUp);
        resizeHandle.addEventListener('pointercancel', onUp);
    });

    panel.style.display = 'block';
    layout();
}

export {initCodePanel}

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

const INDENT = '    ';

function escapeHtml(text: string): string {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * A dependency-free code editor: a plain textarea drawn over a syntax-highlighted copy of its text, with a line
 * number gutter. Everything outside this class talks to it through getText/setText/markErrorLine and the callbacks,
 * so it can be swapped for a heavier editor later without touching the languages or the panel.
 */
class CodeEditor {
    onRun: () => void = () => {};
    onInput: () => void = () => {};
    private _highlightRegex: RegExp | undefined = undefined;
    private _highlightClasses: string[] = [];
    private _errorLine: number | undefined = undefined;

    /**
     * @param highlightPre Sits behind the text area and shows the colored text.
     * @param gutter Shows line numbers.
     */
    constructor(private textArea: HTMLTextAreaElement,
                private highlightPre: HTMLElement,
                private gutter: HTMLElement) {

        textArea.addEventListener('input', () => {
            this._errorLine = undefined;
            this._render();
            this.onInput();
        });
        textArea.addEventListener('scroll', () => this._syncScroll());
        textArea.addEventListener('keydown', e => this._onKeyDown(e));
    }

    getText(): string {
        return this.textArea.value;
    }

    /**
     * Replaces the text. Keeps the scroll position, so regenerating code after a drag doesn't jump around.
     */
    setText(text: string): void {
        if (this.textArea.value !== text) {
            let top = this.textArea.scrollTop;
            let left = this.textArea.scrollLeft;
            this.textArea.value = text;
            this.textArea.scrollTop = top;
            this.textArea.scrollLeft = left;
        }
        this._errorLine = undefined;
        this._render();
    }

    /**
     * @param rules Pairs of [regex source, css class]. Earlier rules win ties.
     */
    setHighlightRules(rules: Array<[string, string]>): void {
        this._highlightRegex = new RegExp(rules.map(([src]) => `(${src})`).join('|'), 'g');
        this._highlightClasses = rules.map(([, cls]) => cls);
        this._render();
    }

    /**
     * @param line 1-indexed line to flag, or undefined to clear the flag.
     */
    markErrorLine(line: number | undefined): void {
        this._errorLine = line;
        this._render();
        if (line !== undefined) {
            let lineHeight = parseFloat(getComputedStyle(this.textArea).lineHeight) || 18;
            let y = (line - 1) * lineHeight;
            if (y < this.textArea.scrollTop || y > this.textArea.scrollTop + this.textArea.clientHeight - lineHeight) {
                this.textArea.scrollTop = Math.max(0, y - this.textArea.clientHeight / 2);
            }
        }
    }

    /**
     * @returns The line as highlighted html.
     */
    private _highlightLine(line: string): string {
        if (this._highlightRegex === undefined) {
            return escapeHtml(line);
        }
        let out = '';
        let last = 0;
        this._highlightRegex.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = this._highlightRegex.exec(line)) !== null) {
            if (m[0].length === 0) {
                this._highlightRegex.lastIndex++;
                continue;
            }
            let group = 1;
            while (m[group] === undefined) {
                group++;
            }
            out += escapeHtml(line.substring(last, m.index));
            out += `<span class="qb-tok-${this._highlightClasses[group - 1]}">${escapeHtml(m[0])}</span>`;
            last = m.index + m[0].length;
        }
        return out + escapeHtml(line.substring(last));
    }

    private _render(): void {
        let lines = this.textArea.value.split('\n');
        this.highlightPre.innerHTML = lines.map((line, i) => {
            let html = this._highlightLine(line);
            return i + 1 === this._errorLine ? `<span class="qb-code-error-line">${html || ' '}</span>` : html;
        }).join('\n') + '\n ';

        let numbers = [];
        for (let i = 1; i <= lines.length; i++) {
            numbers.push(i === this._errorLine ? `<div class="qb-code-error-number">${i}</div>` : `<div>${i}</div>`);
        }
        this.gutter.innerHTML = numbers.join('');
        this._syncScroll();
    }

    private _syncScroll(): void {
        this.highlightPre.scrollTop = this.textArea.scrollTop;
        this.highlightPre.scrollLeft = this.textArea.scrollLeft;
        this.gutter.scrollTop = this.textArea.scrollTop;
    }

    private _insertText(text: string): void {
        // execCommand keeps the browser's own undo history working; setRangeText is the fallback.
        if (!document.execCommand || !document.execCommand('insertText', false, text)) {
            let {selectionStart, selectionEnd} = this.textArea;
            this.textArea.setRangeText(text, selectionStart, selectionEnd, 'end');
            this.textArea.dispatchEvent(new Event('input'));
        }
    }

    private _onKeyDown(e: KeyboardEvent): void {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            this.onRun();
        } else if (e.key === 'Tab' && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
            e.preventDefault();
            this._insertText(INDENT);
        } else if (e.key === 'Escape') {
            // Give keyboard users a way out, since Tab is taken for indenting.
            this.textArea.blur();
        }
    }
}

export {CodeEditor}

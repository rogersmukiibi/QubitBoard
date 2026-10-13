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

// Saves a picture of every toolbox gate to doc/images/gates/, for the gate tables in the documentation.
// Usage: npm run build && npm run screenshot-gates

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import * as esbuild from 'esbuild';
import puppeteer from 'puppeteer';

interface ToolboxGate {
    id: string;
    name: string;
    x: number;
    y: number;
    w: number;
    h: number;
}

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(ROOT, 'doc', 'images', 'gates');
const MARGIN = 1.5;

// A circuit that isn't empty, so the page skips the menu and the hints that are drawn over the toolboxes.
const CIRCUIT = {cols: [[1, 'H']]};

// Runs in the page. It lays the toolboxes out the way the app does, to find where each gate is drawn.
const LAYOUT_SCRIPT = `
    import {Rect} from "./src/math/Rect.js";
    import {DisplayedInspector} from "./src/ui/DisplayedInspector.js";
    import {gateNameOf} from "./src/code/CircuitCode.js";

    globalThis.toolboxGates = (width, height) => {
        let inspector = DisplayedInspector.empty(new Rect(0, 0, width, height));
        let result = [];
        for (let toolbox of [inspector.displayedToolboxTop, inspector.displayedToolboxBottom]) {
            toolbox.toolboxGroups.forEach((group, groupIndex) => group.gates.forEach((gate, gateIndex) => {
                if (gate !== undefined) {
                    let r = toolbox.gateDrawRect(groupIndex, gateIndex);
                    let id = gate.serializedId;
                    result.push({id, name: gateNameOf(id), x: r.x, y: r.y, w: r.w, h: r.h});
                }
            }));
        }
        return result;
    };
`;

const WORDS: Record<string, string> = {
    '!=': 'ne', '<=': 'le', '>=': 'ge', '<<': 'shl', '>>': 'shr', '+=': 'plus', '-=': 'minus',
    '<': 'lt', '>': 'gt', '=': 'eq', '+': 'plus', '-': 'minus', '*': 'times', '/': 'over'
};

/**
 * @param name A gate's name in code, such as "Z^-1/2".
 * @returns A file name made of lowercase letters, digits and dashes, such as "z-minus-1-over-2".
 */
const fileNameOf = (name: string): string => name.
    replace(/!=|<=|>=|<<|>>|\+=|-=|[<>=+\-*\/]/g, symbol => `-${WORDS[symbol]}-`).
    toLowerCase().
    replace(/[^a-z0-9]+/g, '-').
    replace(/^-|-$/g, '');

const main = async (): Promise<void> => {
    const layout = await esbuild.build({
        stdin: {contents: LAYOUT_SCRIPT, resolveDir: ROOT, sourcefile: 'toolbox-layout.js'},
        bundle: true,
        format: 'iife',
        write: false,
        logLevel: 'warning'
    });

    // Set PUPPETEER_NO_SANDBOX=1 when running inside a container that can't use Chromium's sandbox.
    const browser = await puppeteer.launch(process.env.PUPPETEER_NO_SANDBOX ? {args: ['--no-sandbox']} : {});
    try {
        const page = await browser.newPage();
        await page.setViewport({width: 1500, height: 900, deviceScaleFactor: 2});
        const url = pathToFileURL(path.join(ROOT, 'out', 'qubitboard.html'));
        url.hash = 'circuit=' + JSON.stringify(CIRCUIT);
        await page.goto(url.href);
        await page.waitForFunction(() => {
            const canvas = document.getElementById('drawCanvas') as HTMLCanvasElement | null;
            const context = canvas === null ? null : canvas.getContext('2d');
            // The corner of the canvas turns into toolbox background once the first frame is painted.
            return context !== null && context.getImageData(2, 2, 1, 1).data[3] !== 0;
        }, {timeout: 20000});
        await page.addScriptTag({content: layout.outputFiles[0].text});

        const canvas = await page.$eval('#drawCanvas', element => {
            const rect = element.getBoundingClientRect();
            return {left: rect.left, top: rect.top, width: rect.width, height: rect.height};
        });
        const gates: ToolboxGate[] = await page.evaluate(
            (width, height) => (globalThis as any).toolboxGates(width, height),
            canvas.width,
            canvas.height);

        const files = gates.map(gate => `${fileNameOf(gate.name)}.png`);
        const repeated = files.filter((file, index) => files.indexOf(file) !== index);
        if (repeated.length > 0) {
            throw new Error(`Two gates would be saved to the same file: ${repeated.join(', ')}`);
        }

        // Keep the mouse over the circuit, so that no toolbox gate is drawn highlighted.
        await page.mouse.move(canvas.left + canvas.width - 20, canvas.top + canvas.height / 2);

        fs.rmSync(OUT_DIR, {recursive: true, force: true});
        fs.mkdirSync(OUT_DIR, {recursive: true});
        for (let i = 0; i < gates.length; i++) {
            const gate = gates[i];
            await page.screenshot({
                path: path.join(OUT_DIR, files[i]),
                clip: {
                    x: canvas.left + gate.x - MARGIN,
                    y: canvas.top + gate.y - MARGIN,
                    width: gate.w + MARGIN * 2,
                    height: gate.h + MARGIN * 2
                }
            });
            console.log(`${files[i].padEnd(30)} ${gate.id}`);
        }
        console.log(`Wrote ${gates.length} gate pictures to ${path.relative(ROOT, OUT_DIR)}/`);
    } finally {
        await browser.close();
    }
};

main().catch(ex => {
    console.error(ex);
    process.exit(1);
});

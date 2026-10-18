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

// Checks the built page: it starts without errors, opens a circuit link, and its downloaded offline copy opens the
// same circuit without errors.
// Usage: npm run check-app [-- path/to/page.html]

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';
import puppeteer from 'puppeteer';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const CIRCUIT = {cols: [['H'], ['•', 'X'], ['Chance2']]};

/** @type {!Array.<!string>} */
const problems = [];

/**
 * @param {!Browser} browser
 * @param {!string} url
 * @param {!string} name What to call the page in reported problems.
 * @returns {!Promise.<!Page>} The page, once its first frame is painted and its loading screen is gone.
 */
const openPage = async (browser, url, name) => {
    const page = await browser.newPage();
    page.on('pageerror', error => problems.push(`${name}: page error: ${error.message}`));
    page.on('console', message => {
        if (message.type() === 'error') {
            problems.push(`${name}: console error: ${message.text()}`);
        }
    });
    await page.goto(url);
    await page.waitForFunction(() => {
        const canvas = document.getElementById('drawCanvas');
        const context = canvas === null ? null : canvas.getContext('2d');
        // The corner of the canvas turns into toolbox background once the first frame is painted.
        return context !== null && context.getImageData(2, 2, 1, 1).data[3] !== 0;
    }, {timeout: 20000});
    await page.waitForSelector('#loading-div', {hidden: true, timeout: 20000});
    return page;
};

/**
 * @param {!Page} page
 * @param {!string} name
 * @returns {!Promise.<*>} The circuit JSON that the page's export dialog shows.
 */
const shownCircuit = async (page, name) => {
    if (await page.$eval('#export-button', button => button.disabled)) {
        throw new Error(`${name}: the Export button is disabled because the menu or another overlay is showing. ` +
            'The menu opens by itself when the page starts with an empty circuit.');
    }
    await page.click('#export-button');
    await page.waitForSelector('#download-offline-copy-button', {visible: true, timeout: 5000});
    return JSON.parse(await page.$eval('#export-circuit-json-pre', element => element.innerText));
};

/**
 * @param {*} actual
 * @param {!string} name
 */
const expectCircuit = (actual, name) => {
    if (JSON.stringify(actual) !== JSON.stringify(CIRCUIT)) {
        problems.push(`${name}: expected the circuit ${JSON.stringify(CIRCUIT)}, but it shows ${JSON.stringify(actual)}`);
    }
};

/**
 * @param {!Browser} browser
 * @param {!Page} page A page with its export dialog open.
 * @param {!string} dir
 * @returns {!Promise.<!string>} The path of the downloaded offline copy.
 */
const downloadOfflineCopy = async (browser, page, dir) => {
    const session = await browser.target().createCDPSession();
    await session.send('Browser.setDownloadBehavior', {behavior: 'allow', downloadPath: dir});
    await page.click('#download-offline-copy-button');
    const deadline = Date.now() + 10000;
    while (Date.now() < deadline) {
        const files = fs.readdirSync(dir).filter(file => file.endsWith('.html'));
        if (files.length > 0) {
            return path.join(dir, files[0]);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('The offline copy was not downloaded within 10 seconds.');
};

const main = async () => {
    const pagePath = path.resolve(process.argv[2] ?? path.join(ROOT, 'out', 'qubitboard.html'));
    const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qubitboard-check-'));

    // Set PUPPETEER_NO_SANDBOX=1 when running inside a container that can't use Chromium's sandbox.
    const browser = await puppeteer.launch(process.env.PUPPETEER_NO_SANDBOX ? {args: ['--no-sandbox']} : {});
    try {
        const url = pathToFileURL(pagePath);
        url.hash = 'circuit=' + JSON.stringify(CIRCUIT);
        const page = await openPage(browser, url.href, 'page');
        expectCircuit(await shownCircuit(page, 'page'), 'page');

        const copyPath = await downloadOfflineCopy(browser, page, downloadDir);
        const copy = await openPage(browser, pathToFileURL(copyPath).href, 'offline copy');
        expectCircuit(await shownCircuit(copy, 'offline copy'), 'offline copy');
    } catch (ex) {
        problems.push(ex instanceof Error ? ex.message : String(ex));
    } finally {
        await browser.close();
        fs.rmSync(downloadDir, {recursive: true, force: true});
    }

    if (problems.length > 0) {
        throw new Error(`${path.relative(ROOT, pagePath)} failed its checks:\n${problems.join('\n')}`);
    }
    console.log(`${path.relative(ROOT, pagePath)} passed: it opens a circuit link, and its offline copy works.`);
};

main().catch(ex => {
    console.error(ex instanceof Error ? ex.message : ex);
    process.exit(1);
});

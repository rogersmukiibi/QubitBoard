/**
 * Copyright 2017 Google Inc.
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

const puppeteer = require('puppeteer');

// Set PUPPETEER_NO_SANDBOX=1 when running inside a container that can't use Chromium's sandbox.
const launchOptions = process.env.PUPPETEER_NO_SANDBOX ? {args: ['--no-sandbox']} : {};

// If the browser dies mid-run, the awaits below never settle and node would otherwise exit 0
// with no tests having run. Treat any exit that didn't reach the end of the run as a failure.
let reachedEndOfRun = false;
process.on('exit', code => {
    if (!reachedEndOfRun && code === 0) {
        console.error("PuppeteerRunTests.js exited before the test run finished.");
        process.exitCode = 1;
    }
});

(async () => {
    try {
        const browser = await puppeteer.launch(launchOptions);
        browser.on('disconnected', () => {
            if (!reachedEndOfRun) {
                console.error("Browser disconnected before the test run finished.");
                process.exit(1);
            }
        });

        const page = await browser.newPage();
        let caughtPageError = false;
        page.on('console', message => console.log(message.text()));
        page.on('pageerror', ({message}) => {
            caughtPageError = true;
            console.error("Page error bubbled into PuppeteerRunTests.js: " + message);
        });

        const outDirUrl = 'file:///' + __dirname.split('\\').join('/') + '/out/';
        await page.goto(outDirUrl + 'test.html#blocking');
        await page.waitForSelector('#done', {timeout: 5 * 60 * 1000});
        let {total, done, anyFailures} = await page.evaluate(() => ({
            total: __total_tests,
            done: __total_done,
            anyFailures: __any_failures
        }));

        reachedEndOfRun = true;
        await browser.close();

        // A run that reported no tests, or stopped short, is a failure even when nothing failed.
        if (total === 0 || done !== total) {
            console.error(`Expected a full test run, but only ${done}/${total} tests reported.`);
            process.exit(1);
        }
        if (anyFailures || caughtPageError) {
            process.exit(1);
        }
        console.log(`All ${total} tests passed.`);
    } catch (ex) {
        console.error("Error bubbled up into PuppeteerRunTests.js: " + ex);
        process.exit(1);
    }
})();

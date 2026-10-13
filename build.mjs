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

// Builds the pages in out/. Usage: node build.mjs <app|app-debug|test|test-perf>

import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import * as esbuild from 'esbuild';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

const TARGET = 'es2015';

const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');

const write = (file, content) => {
    fs.mkdirSync(path.dirname(path.join(ROOT, file)), {recursive: true});
    fs.writeFileSync(path.join(ROOT, file), content);
    console.log(`Wrote ${file} (${Math.ceil(Buffer.byteLength(content) / 1024)} kB)`);
};

const typecheck = () => {
    const tsc = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
    const {status} = spawnSync(process.execPath, [tsc, '-p', path.join(ROOT, 'tsconfig.json')], {stdio: 'inherit'});
    if (status !== 0) {
        throw new Error('TypeScript type check failed.');
    }
};

/**
 * @param {!{entryPoints: !Array.<!string>}|!{stdin: !Object}} entry
 * @param {!string} outfile
 * @param {!boolean} minify
 * @returns {!Promise.<!string>}
 */
const bundle = async (entry, outfile, minify) => {
    const result = await esbuild.build({
        ...entry,
        absWorkingDir: ROOT,
        outfile,
        write: false,
        bundle: true,
        format: 'iife',
        target: TARGET,
        minify,
        keepNames: true,
        loader: {'.md': 'text'},
        sourcemap: minify ? false : 'inline',
        // The pages inject the bundle mid-script, where a leading "use strict" would have no effect.
        banner: {js: '(function() { "use strict";'},
        footer: {js: '})();'},
        logLevel: 'warning'
    });
    return result.outputFiles[0].text;
};

/**
 * @param {!string} dir
 * @param {!Array.<!string>} suffixes
 * @returns {!Object} An esbuild entry point that imports every matching file under the directory.
 */
const importAll = (dir, suffixes) => {
    const files = fs.readdirSync(path.join(ROOT, dir), {recursive: true})
        .map(file => file.split(path.sep).join('/'))
        .filter(file => suffixes.some(suffix => file.endsWith(suffix)))
        .sort();
    return {
        stdin: {
            contents: files.map(file => `import ${JSON.stringify(`./${dir}/${file}`)};`).join('\n'),
            resolveDir: ROOT,
            sourcefile: `${dir}-entry.js`
        }
    };
};

/**
 * @param {!string} template
 * @param {!string} js
 * @returns {!string} The template with its "<!-- INCLUDE ... -->" markers replaced.
 */
const injectIntoHtml = (template, js) => {
    if (/<!--(?:(?!-->)[\s\S])*<script/i.test(js)) {
        throw new Error('The bundle has a "<!--" followed by "<script", which would break the page it is put in.');
    }
    const parts = {
        'VERSION': JSON.parse(read('package.json')).version.split('.').slice(0, 2).join('.'),
        'SOURCE PART': js,
        'MENU PART': read('html/menu.partial.html'),
        'ERROR PART': read('html/error.partial.html'),
        'FORGE PART': read('html/forge.partial.html'),
        'EXPORT PART': read('html/export.partial.html'),
        'CODE PART': read('html/code.partial.html')
    };
    return read(template).replace(/<!-- INCLUDE ([A-Z ]+) -->/g, (marker, name) => {
        if (!parts.hasOwnProperty(name)) {
            throw new Error(`Unknown marker ${marker} in ${template}.`);
        }
        return parts[name];
    });
};

const buildApp = async minify => {
    const js = await bundle({entryPoints: ['src/main.js']}, 'out/qubitboard.js', minify);
    write('out/qubitboard.html', injectIntoHtml('html/qubitboard.template.html', js));
};

const buildTests = async (dir, suffixes, name) => {
    const js = await bundle(importAll(dir, suffixes), `out/${name}.js`, false);
    write(`out/${name}.js`, js);
    write(`out/${name}.html`, injectIntoHtml('test_perf/test_page.template.html', js));
};

const TARGETS = {
    'app': () => buildApp(true),
    'app-debug': () => buildApp(false),
    'test': () => buildTests('test', ['.test.js', '.test.ts'], 'test'),
    'test-perf': () => buildTests('test_perf', ['.perf.js', '.perf.ts'], 'test_perf')
};

const main = async () => {
    const target = process.argv[2];
    if (process.argv.length !== 3 || !TARGETS.hasOwnProperty(target)) {
        console.error(`Usage: node build.mjs <${Object.keys(TARGETS).join('|')}>`);
        process.exit(1);
    }
    const start = Date.now();
    typecheck();
    await TARGETS[target]();
    console.log(`Built ${target} in ${((Date.now() - start) / 1000).toFixed(1)}s`);
};

main().catch(ex => {
    if (!Array.isArray(ex.errors)) {
        console.error(ex.message);
    }
    process.exit(1);
});

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

import {readFileSync} from 'node:fs';
import {defineConfig} from 'vitepress';

const APP_URL = 'https://rogersmukiibi.com/QubitBoard/';
const REPO_URL = 'https://github.com/rogersmukiibi/QubitBoard';

const packageJson: {version: string} = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const version = packageJson.version.split('.').slice(0, 2).join('.');

export default defineConfig({
    title: 'QubitBoard',
    description: 'Documentation for QubitBoard, a drag-and-drop quantum circuit simulator.',
    lang: 'en-US',
    // The app is the root of the GitHub Pages site, so the docs are served from a folder beside it.
    base: '/QubitBoard/docs/',
    outDir: '../out/docs',
    cacheDir: '../node_modules/.vitepress',
    srcExclude: ['README.md', 'wiki/**'],
    cleanUrls: true,
    head: [['link', {rel: 'icon', href: '/QubitBoard/docs/favicon.ico'}]],
    markdown: {
        config: md => {
            // Vue would otherwise read a matrix such as {{0,1},{1,0}} in inline code as an expression.
            const renderInlineCode = md.renderer.rules.code_inline!;
            md.renderer.rules.code_inline = (tokens, index, options, env, self) => {
                tokens[index].attrSet('v-pre', '');
                return renderInlineCode(tokens, index, options, env, self);
            };
        }
    },
    themeConfig: {
        logo: '/favicon.ico',
        nav: [
            {text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/'},
            {text: 'Gates', link: '/gates/', activeMatch: '/gates/'},
            {text: 'Code panel', link: '/code/', activeMatch: '/code/'},
            {text: 'Reference', link: '/reference/controls', activeMatch: '/reference/'},
            {
                text: `v${version}`,
                items: [
                    {text: 'Changelog', link: `${REPO_URL}/blob/main/CHANGELOG.md`},
                    {text: 'Roadmap', link: `${REPO_URL}/blob/main/ROADMAP.md`},
                    {text: 'Contributing', link: `${REPO_URL}/blob/main/CONTRIBUTING.md`}
                ]
            },
            {text: 'Open QubitBoard', link: APP_URL}
        ],
        sidebar: [
            {
                text: 'Guide',
                items: [
                    {text: 'Getting started', link: '/guide/getting-started'},
                    {text: 'Editing circuits', link: '/guide/editing-circuits'},
                    {text: 'Displays', link: '/guide/displays'},
                    {text: 'Measurement and detectors', link: '/guide/measurement'},
                    {text: 'Arithmetic', link: '/guide/arithmetic'},
                    {text: 'Advanced techniques', link: '/guide/advanced-techniques'}
                ]
            },
            {
                text: 'Gates',
                items: [
                    {text: 'Overview', link: '/gates/'},
                    {text: 'Top toolbox', link: '/gates/top-toolbox'},
                    {text: 'Bottom toolbox', link: '/gates/bottom-toolbox'},
                    {text: 'Unlisted gates', link: '/gates/unlisted-gates'}
                ]
            },
            {
                text: 'Code panel',
                items: [
                    {text: 'Overview', link: '/code/'},
                    {text: 'Cirq', link: '/code/cirq'},
                    {text: 'OpenQASM 3', link: '/code/openqasm'},
                    {text: 'QubitBoard language', link: '/code/qubitboard-language'}
                ]
            },
            {
                text: 'Reference',
                items: [
                    {text: 'Controls', link: '/reference/controls'},
                    {text: 'Conventions', link: '/reference/conventions'},
                    {text: 'Circuit links', link: '/reference/circuit-links'}
                ]
            }
        ],
        outline: [2, 3],
        search: {provider: 'local'},
        editLink: {
            pattern: `${REPO_URL}/edit/main/doc/:path`,
            text: 'Edit this page on GitHub'
        },
        socialLinks: [{icon: 'github', link: REPO_URL}],
        footer: {
            message: 'Released under the Apache License 2.0.',
            copyright: 'QubitBoard is a fork of Quirk.'
        }
    }
});

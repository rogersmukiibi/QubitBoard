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

import {OpenQasm3} from "./languages/OpenQasm3.js"
import {QubitBoardDsl} from "./languages/QubitBoardDsl.js"

/**
 * A language offered by the code panel. The circuit JSON is the hub: every language converts to and from it.
 */
interface CodeLanguage {
    id: string;
    label: string;
    commentPrefix: string;
    /** Turns circuit JSON text into code. */
    emit(jsonText: string): string;
    /** Turns code into canonical circuit JSON text. Throws a CodeError pointing at the offending line. */
    parse(text: string): string;
    /** Syntax highlighting: pairs of [regex source, css class]. The first alternative that matches wins. */
    highlightRules: Array<[string, string]>;
}

/**
 * The languages offered by the code panel. To add a language, implement CodeLanguage and list it here.
 */
const CODE_LANGUAGES: CodeLanguage[] = [
    QubitBoardDsl,
    OpenQasm3
];

/**
 * @returns The language with the given id, or the default language if there's none.
 */
function findCodeLanguage(id: string): CodeLanguage {
    return CODE_LANGUAGES.find(e => e.id === id) || CODE_LANGUAGES[0];
}

export {CODE_LANGUAGES, findCodeLanguage}
export type {CodeLanguage}

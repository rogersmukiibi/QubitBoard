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

/**
 * A problem with circuit code typed by the user, pointing at the line that caused it.
 */
class CodeError extends Error {
    /** 1-indexed line number, or undefined if the problem isn't tied to a line. */
    line: number | undefined;

    constructor(message: string, line: number | undefined = undefined) {
        super(message);
        this.name = 'CodeError';
        this.message = message;
        this.line = line;
    }

    toString(): string {
        return this.line === undefined ? this.message : `Line ${this.line}: ${this.message}`;
    }
}

export {CodeError}

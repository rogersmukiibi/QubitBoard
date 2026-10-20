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

import {Suite, assertThat} from "../TestUtil.js"
import {CachablePainting} from "../../src/draw/CachablePainting.js"
import {Painter} from "../../src/draw/Painter.js"
import {setActiveTheme} from "../../src/Palette.js"

let suite = new Suite("CachablePainting");

suite.test("paintsOncePerKey", () => {
    let draws = 0;
    let cached = new CachablePainting(() => ({width: 4, height: 4}), () => draws++);
    let canvas = document.createElement('canvas');
    let painter = new Painter(canvas);
    cached.paint(0, 0, painter, 'a');
    cached.paint(0, 0, painter, 'a');
    assertThat(draws).isEqualTo(1);
    cached.paint(0, 0, painter, 'b');
    assertThat(draws).isEqualTo(2);
});

suite.test("repaintsAfterTheThemeChanges", () => {
    let draws = 0;
    let cached = new CachablePainting(() => ({width: 4, height: 4}), () => draws++);
    let painter = new Painter(document.createElement('canvas'));
    cached.paint(0, 0, painter);
    setActiveTheme('dark');
    try {
        cached.paint(0, 0, painter);
        cached.paint(0, 0, painter);
        assertThat(draws).isEqualTo(2);
    } finally {
        setActiveTheme('light');
    }
    cached.paint(0, 0, painter);
    assertThat(draws).isEqualTo(3);
});

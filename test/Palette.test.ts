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

import {Suite, assertThat, assertTrue} from "./TestUtil.js"
import {Config} from "../src/Config.js"
import {
    DARK_PALETTE,
    LIGHT_PALETTE,
    activePalette,
    activeThemeName,
    paletteVersion,
    setActiveTheme,
    withAlpha
} from "../src/Palette.js"
import type {Palette} from "../src/Palette.js"

let suite = new Suite("Palette");

const withDarkTheme = (test: () => void) => {
    setActiveTheme('dark');
    try {
        test();
    } finally {
        setActiveTheme('light');
    }
};

/** The [r, g, b] a canvas draws for the color, composited over opaque white. */
const rgbOf = (color: string): number[] => {
    let canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    let ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, 1, 1);
    let [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b];
};

const relativeLuminance = (color: string): number => {
    let [r, g, b] = rgbOf(color).map(v => {
        let c = v / 255;
        return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrast = (a: string, b: string): number => {
    let [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
};

suite.test("lightIsTheDefault", () => {
    assertThat(activeThemeName()).isEqualTo('light');
    assertThat(activePalette()).isEqualTo(LIGHT_PALETTE);
});

suite.test("lightPaletteKeepsTheOriginalColors", () => {
    assertThat(Config.BACKGROUND_COLOR).isEqualTo('white');
    assertThat(Config.BACKGROUND_COLOR_TOOLBOX).isEqualTo('#CCC');
    assertThat(Config.GATE_FILL_COLOR).isEqualTo('white');
    assertThat(Config.HIGHLIGHTED_GATE_FILL_COLOR).isEqualTo('#FB7');
    assertThat(Config.DISPLAY_GATE_BACK_COLOR).isEqualTo('#EFE');
    assertThat(Config.SUPERPOSITION_FORE_COLOR).isEqualTo('#0BB');
    assertThat(Config.DEFAULT_STROKE_COLOR).isEqualTo('black');
    assertThat(Config.DEFAULT_TEXT_COLOR).isEqualTo('black');
    assertThat(Config.ALERT_COLOR).isEqualTo('red');
});

suite.test("darkThemeChangesTheConfigColors", () => withDarkTheme(() => {
    assertThat(activeThemeName()).isEqualTo('dark');
    assertThat(Config.BACKGROUND_COLOR).isEqualTo(DARK_PALETTE.background);
    assertThat(Config.GATE_FILL_COLOR).isEqualTo(DARK_PALETTE.gateFill);
    assertThat(Config.DEFAULT_TEXT_COLOR).isEqualTo(DARK_PALETTE.text);
    assertTrue(Config.GATE_FILL_COLOR !== LIGHT_PALETTE.gateFill);
}));

suite.test("palettesNameTheSameColors", () => {
    assertThat(Object.keys(DARK_PALETTE).sort()).isEqualTo(Object.keys(LIGHT_PALETTE).sort());
    for (let palette of [LIGHT_PALETTE, DARK_PALETTE]) {
        let keys = Object.keys(palette) as (keyof Palette)[];
        assertThat(keys.filter(key => !CSS.supports('color', palette[key]))).isEqualTo([]);
    }
});

suite.test("darkPaletteIsDark", () => {
    let surfaces: (keyof Palette)[] = ['background', 'toolboxBackground', 'gateFill', 'displayBack',
        'superpositionBack', 'operationBack', 'tooltipBack'];
    assertThat(surfaces.filter(key => relativeLuminance(DARK_PALETTE[key]) >= 0.05)).isEqualTo([]);
});

suite.test("darkTextIsReadable", () => {
    let surfaces: (keyof Palette)[] = ['background', 'toolboxBackground', 'gateFill', 'gateHighlightFill',
        'timeDependentFill', 'displayBack', 'displayFore', 'displayToolboxFill', 'superpositionBack',
        'operationBack', 'operationFore', 'tooltipBack', 'inputGateFill', 'labelBack'];
    assertThat(surfaces.filter(key => contrast(DARK_PALETTE.text, DARK_PALETTE[key]) < 4.5)).isEqualTo([]);
    assertTrue(contrast(DARK_PALETTE.alert, DARK_PALETTE.background) >= 4.5);
    assertTrue(contrast(DARK_PALETTE.subtleText, DARK_PALETTE.background) >= 4.5);
    assertTrue(contrast(DARK_PALETTE.stroke, DARK_PALETTE.gateFill) >= 4.5);
    assertTrue(contrast(DARK_PALETTE.gateTitle, DARK_PALETTE.tooltipBack) >= 4.5);
});

suite.test("versionChangesOnlyWhenTheThemeDoes", () => {
    let v = paletteVersion();
    setActiveTheme('light');
    assertThat(paletteVersion()).isEqualTo(v);
    withDarkTheme(() => assertThat(paletteVersion()).isEqualTo(v + 1));
    assertThat(paletteVersion()).isEqualTo(v + 2);
});

suite.test("withAlpha", () => {
    assertThat(withAlpha('black', 0.5)).isEqualTo('rgba(0, 0, 0, 0.5)');
    assertThat(withAlpha('red', 0)).isEqualTo('rgba(255, 0, 0, 0)');
    assertThat(withAlpha('#FB7', 1)).isEqualTo('rgba(255, 187, 119, 1)');
    assertThat(withAlpha('#ff6b6b', 0.25)).isEqualTo('rgba(255, 107, 107, 0.25)');
});

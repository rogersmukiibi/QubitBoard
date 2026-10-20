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

type ThemeName = 'light' | 'dark';

/**
 * The colors the canvas is painted with. Code reads them through the color getters on `Config`, at draw time, so
 * switching the theme recolors the next frame.
 */
interface Palette {
    readonly background: string;
    readonly toolboxBackground: string;
    readonly gateFill: string;
    readonly gateHighlightFill: string;
    readonly timeDependentFill: string;
    readonly permutationFill: string;
    readonly inputGateFill: string;
    readonly inputGateStroke: string;
    readonly setDefaultFill: string;

    readonly displayToolboxFill: string;
    readonly displayBack: string;
    readonly displayFore: string;
    readonly operationBack: string;
    readonly operationFore: string;
    readonly superpositionBack: string;
    readonly superpositionMid: string;
    readonly superpositionFore: string;

    readonly stroke: string;
    readonly text: string;
    readonly subtleText: string;
    readonly mutedText: string;
    readonly alert: string;

    readonly grid: string;
    readonly faintStroke: string;
    readonly logCircle: string;
    readonly logHint: string;
    readonly blochGuide: string;
    readonly blochArrow: string;
    readonly densityStroke: string;

    readonly tooltipBack: string;
    readonly gateTitle: string;
    readonly labelBack: string;
    readonly scrollButtonFill: string;
    readonly scrollButtonHoverFill: string;
    readonly scrollButtonEdge: string;
    readonly dragHighlight: string;
}

/** Quirk's original colors. */
const LIGHT_PALETTE: Palette = Object.freeze({
    background: 'white',
    toolboxBackground: '#CCC',
    gateFill: 'white',
    gateHighlightFill: '#FB7',
    timeDependentFill: '#FFC',
    permutationFill: '#F3F3F3',
    inputGateFill: '#DDD',
    inputGateStroke: '#888',
    setDefaultFill: '#EEE',

    // Mixed-state displays are green, changes are yellow, and pure-state displays are cyan.
    displayToolboxFill: '#4F4',
    displayBack: '#EFE',
    displayFore: '#3F3',
    operationBack: '#FFE',
    operationFore: '#FF0',
    superpositionBack: '#EFF',
    superpositionMid: '#8FF',
    superpositionFore: '#0BB',

    stroke: 'black',
    text: 'black',
    subtleText: 'gray',
    mutedText: '#666',
    alert: 'red',

    grid: 'lightgray',
    faintStroke: '#BBB',
    logCircle: '#AAA',
    logHint: '#CCC',
    blochGuide: '#666',
    blochArrow: '#444',
    densityStroke: '#040',

    tooltipBack: '#F9FFF9',
    gateTitle: 'blue',
    labelBack: 'lightgray',
    scrollButtonFill: 'rgba(255, 255, 255, 0.8)',
    scrollButtonHoverFill: 'rgba(255, 255, 255, 0.95)',
    scrollButtonEdge: '#999',
    dragHighlight: 'rgba(255, 196, 112, 0.7)',
});

const DARK_PALETTE: Palette = Object.freeze({
    background: '#1b1b1d',
    toolboxBackground: '#2e2e32',
    gateFill: '#26262a',
    gateHighlightFill: '#7a4f1d',
    timeDependentFill: '#3b3820',
    permutationFill: '#303035',
    inputGateFill: '#3a3a40',
    inputGateStroke: '#77777f',
    setDefaultFill: '#34343a',

    displayToolboxFill: '#2e6b30',
    displayBack: '#17291a',
    displayFore: '#26732f',
    operationBack: '#29281a',
    operationFore: '#6b6614',
    superpositionBack: '#132a2c',
    superpositionMid: '#1f6466',
    superpositionFore: '#21a3a6',

    stroke: '#d0d0d4',
    text: '#e6e6e9',
    subtleText: '#a0a0a8',
    mutedText: '#9a9aa2',
    alert: '#ff6b6b',

    grid: '#4a4a52',
    faintStroke: '#55555c',
    logCircle: '#6a6a72',
    logHint: '#5a5a62',
    blochGuide: '#9a9aa2',
    blochArrow: '#c0c0c6',
    densityStroke: '#8fd18f',

    tooltipBack: '#1c261d',
    gateTitle: '#7ab8ff',
    labelBack: '#3a3a40',
    scrollButtonFill: 'rgba(46, 46, 50, 0.85)',
    scrollButtonHoverFill: 'rgba(70, 70, 76, 0.95)',
    scrollButtonEdge: '#6a6a72',
    dragHighlight: 'rgba(190, 120, 40, 0.55)',
});

let _activeTheme: ThemeName = 'light';
let _version = 0;

function activeThemeName(): ThemeName {
    return _activeTheme;
}

function activePalette(): Palette {
    return _activeTheme === 'dark' ? DARK_PALETTE : LIGHT_PALETTE;
}

/**
 * Increases every time the theme changes, so cached paintings can tell when they are stale.
 */
function paletteVersion(): number {
    return _version;
}

function setActiveTheme(name: ThemeName): void {
    if (name !== _activeTheme) {
        _activeTheme = name;
        _version++;
    }
}

let _normalizer: CanvasRenderingContext2D | undefined;
const _rgbCache = new Map<string, string>();

/**
 * @param color An opaque CSS color, such as a palette color.
 * @param alpha Opacity, from 0 to 1.
 * @returns The color with the given opacity, as an rgba() color.
 */
function withAlpha(color: string, alpha: number): string {
    let rgb = _rgbCache.get(color);
    if (rgb === undefined) {
        if (_normalizer === undefined) {
            let ctx = document.createElement('canvas').getContext('2d');
            if (ctx === null) {
                throw new Error('No 2d canvas context.');
            }
            _normalizer = ctx;
        }
        // A canvas reports an opaque fill style as '#rrggbb', whatever form it was set in.
        _normalizer.fillStyle = '#000000';
        _normalizer.fillStyle = color;
        let hex = String(_normalizer.fillStyle);
        rgb = [1, 3, 5].map(i => parseInt(hex.substr(i, 2), 16)).join(', ');
        _rgbCache.set(color, rgb);
    }
    return `rgba(${rgb}, ${alpha})`;
}

export {DARK_PALETTE, LIGHT_PALETTE, activePalette, activeThemeName, paletteVersion, setActiveTheme, withAlpha}
export type {Palette, ThemeName}

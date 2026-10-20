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

import {activePalette} from "./Palette.js"

/**
 * Configuration parameters for quantum circuit visualizer.
 *
 * The colors are getters onto the active theme's palette, so read them while drawing instead of keeping them.
 */
class Config {
    // Backgrounds.
    static get BACKGROUND_COLOR() { return activePalette().background; }
    static get BACKGROUND_COLOR_CIRCUIT() { return activePalette().background; }
    static get BACKGROUND_COLOR_TOOLBOX() { return activePalette().toolboxBackground; }

    // Gate background colors.
    static get GATE_FILL_COLOR() { return activePalette().gateFill; }
    static get HIGHLIGHTED_GATE_FILL_COLOR() { return activePalette().gateHighlightFill; }
    static get TIME_DEPENDENT_HIGHLIGHT_COLOR() { return activePalette().timeDependentFill; }
    static get PERMUTATION_GATE_FILL_COLOR() { return activePalette().permutationFill; }
    static get INPUT_GATE_FILL_COLOR() { return activePalette().inputGateFill; }
    static get INPUT_GATE_STROKE_COLOR() { return activePalette().inputGateStroke; }
    static get SET_DEFAULT_GATE_FILL_COLOR() { return activePalette().setDefaultFill; }

    // Mixed-state displays are green.
    static get DISPLAY_GATE_IN_TOOLBOX_FILL_COLOR() { return activePalette().displayToolboxFill; }
    static get DISPLAY_GATE_BACK_COLOR() { return activePalette().displayBack; }
    static get DISPLAY_GATE_FORE_COLOR() { return activePalette().displayFore; }

    // Changes are yellow.
    static get OPERATION_BACK_COLOR() { return activePalette().operationBack; }
    static get OPERATION_FORE_COLOR() { return activePalette().operationFore; }

    // Pure-state displays are cyan.
    static get SUPERPOSITION_BACK_COLOR() { return activePalette().superpositionBack; }
    static get SUPERPOSITION_MID_COLOR() { return activePalette().superpositionMid; }
    static get SUPERPOSITION_FORE_COLOR() { return activePalette().superpositionFore; }

    // Lines and text.
    static get DEFAULT_FILL_COLOR() { return activePalette().background; }
    static get DEFAULT_STROKE_COLOR() { return activePalette().stroke; }
    static get DEFAULT_TEXT_COLOR() { return activePalette().text; }
    static get SUBTLE_TEXT_COLOR() { return activePalette().subtleText; }
    static get MUTED_TEXT_COLOR() { return activePalette().mutedText; }
    /** Hints, warnings and NaN markers. */
    static get ALERT_COLOR() { return activePalette().alert; }

    // Details inside displays.
    static get GRID_COLOR() { return activePalette().grid; }
    static get FAINT_STROKE_COLOR() { return activePalette().faintStroke; }
    static get LOG_CIRCLE_COLOR() { return activePalette().logCircle; }
    static get LOG_HINT_COLOR() { return activePalette().logHint; }
    static get BLOCH_GUIDE_COLOR() { return activePalette().blochGuide; }
    static get BLOCH_ARROW_COLOR() { return activePalette().blochArrow; }
    static get DENSITY_STROKE_COLOR() { return activePalette().densityStroke; }

    // Tooltips, labels and controls drawn on the canvas.
    static get TOOLTIP_BACK_COLOR() { return activePalette().tooltipBack; }
    static get GATE_TITLE_COLOR() { return activePalette().gateTitle; }
    static get LABEL_BACK_COLOR() { return activePalette().labelBack; }
    static get SCROLL_BUTTON_FILL_COLOR() { return activePalette().scrollButtonFill; }
    static get SCROLL_BUTTON_HOVER_FILL_COLOR() { return activePalette().scrollButtonHoverFill; }
    static get SCROLL_BUTTON_EDGE_COLOR() { return activePalette().scrollButtonEdge; }
    static get DRAG_HIGHLIGHT_COLOR() { return activePalette().dragHighlight; }
}

Config.EMPTY_CIRCUIT_TITLE = 'QubitBoard: Quantum Circuit Simulator';

// Each qubit (when actually used) doubles the cost of simulating each gate applied to the circuit.
// Also each qubit tends to increase the amount of accuracy required.
// I see obvious errors when I set this to 20, and things get pretty laggy past 16.
// Beware setting it too high.
Config.MAX_WIRE_COUNT = 16;
Config.SIMPLE_SUPERPOSITION_DRAWING_WIRE_THRESHOLD = 14;

Config.MIN_WIRE_COUNT = 2;
Config.MIN_COL_COUNT = 5;
Config.URL_CIRCUIT_PARAM_KEY = 'circuit';

// Time constants.
Config.CYCLE_DURATION_MS = 8000; // How long it takes for evolving gates to cycle, in milliseconds.
Config.TIME_CACHE_GRANULARITY = 196; // The number of buckets the cycle is divided into.
Config.REDRAW_COOLDOWN_MILLIS = 10; // Milliseconds. Rate-limit on redraws. Long draws pad this limit.

/** Half of the span of a drawn gate, width-wise and height-wise.
* @type {!number} */
Config.GATE_RADIUS = 20;
Config.WIRE_SPACING = 50;

// Toolbox layout.
Config.TOOLBOX_GATE_SPACING = 2;
Config.TOOLBOX_GROUP_SPACING = 24 - Config.TOOLBOX_GATE_SPACING;
Config.TOOLBOX_GATE_SPAN = Config.GATE_RADIUS * 2 + Config.TOOLBOX_GATE_SPACING;
Config.TOOLBOX_GROUP_SPAN = Config.TOOLBOX_GATE_SPAN * 2 + Config.TOOLBOX_GROUP_SPACING;
Config.TOOLBOX_MARGIN_X = 35;
Config.TOOLBOX_MARGIN_Y = 18;

/**
 * Some tooltips end up looking terrible without available vertical space.
 * (e.g. the error box might not fit, or the gate tips might get squashed)
 * @type {number}
 */
Config.MINIMUM_CANVAS_HEIGHT = 400;

Config.SUPPRESSED_GLSL_WARNING_PATTERNS = [];

// Draw constants.
Config.DEFAULT_FONT_SIZE = 12;
Config.DEFAULT_FONT_FAMILY = 'sans-serif';
Config.DEFAULT_STROKE_THICKNESS = 1;

// Calling WebGLRenderingContext.getError forces a CPU/GPU sync. It's very expensive.
Config.CHECK_WEB_GL_ERRORS_EVEN_ON_HOT_PATHS = false;
Config.SEMI_STABLE_RANDOM_VALUE_LIFETIME_MILLIS = 300;

Config.IGNORED_WEBGL_INFO_TERMS = [];

export {Config}

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

import {CachablePainting} from "../draw/CachablePainting.js"
import {CircuitStats} from "../circuit/CircuitStats.js"
import {Config} from "../Config.js"
import {GateDrawParams} from "../draw/GateDrawParams.js"
import {GatePainting} from "../draw/GatePainting.js"
import {Hand} from "../ui/Hand.js"
import {MysteryGateSymbol, MysteryGateMaker} from "../gates/Joke_MysteryGate.js"
import {Rect} from "../math/Rect.js"
import {Painter} from "../draw/Painter.js"
import {Point} from "../math/Point.js"
import {seq} from "../base/Seq.js"
import {WidgetPainter} from "../draw/WidgetPainter.js"

/** Groups are at most this many gates tall. Gates after the first rows of pairs go into extra columns. */
const GROUP_ROWS = 3;
const SCROLL_BUTTON_WIDTH = 32;

class DisplayedToolbox {
    /**
     * That thing showing gates you can grab.
     * @param {!string} name
     * @param {!number} top
     * @param {!Array<!{hint: !string, gates: !Array<undefined|!Gate>}>} toolboxGroups
     * @param {undefined|!Array<!{hint: !string, gates: !Array<undefined|!Gate>}>=} originalGroups
     * @param {undefined|!CachablePainting=undefined} standardAppearance
     * @param {!number=} scrollX How far the gates are scrolled to the left.
     * @param {!number=} viewWidth The width the toolbox is shown in. Gates beyond it are reached by scrolling.
     */
    constructor(
            name,
            top,
            toolboxGroups,
            originalGroups=undefined,
            standardAppearance=undefined,
            scrollX=0,
            viewWidth=Infinity) {
        /** @type {!String} */
        this.name = name;
        /** @type {!number} */
        this.top = top;
        /** @type {!Array<!{hint: !string, gates: !Array<undefined|!Gate>}>} */
        this.toolboxGroups = toolboxGroups;
        /** @type {!Array<!{hint: !string, gates: !Array<undefined|!Gate>}>} */
        this._originalGroups = originalGroups || this.toolboxGroups;
        /**
         * @type {!CachablePainting}
         * @private
         */
        this._standardApperance = standardAppearance || new CachablePainting(
            () => ({width: this.desiredWidth(), height: this.desiredHeight()}),
            painter => {
                painter.ctx.save();
                painter.ctx.translate(this.scrollX, -this.top);
                this._paintStandardContents(painter);
                painter.ctx.restore();
            });

        /** @type {!int} */
        this.groupHeight = 1;
        for (let group of toolboxGroups) {
            let h = Math.min(GROUP_ROWS, Math.ceil(group.gates.length / 2));
            this.groupHeight = Math.max(this.groupHeight, h);
        }

        /**
         * The left edge of each group, followed by where a group after the last one would start.
         * @type {!Array<!number>}
         * @private
         */
        this._groupLefts = [Config.TOOLBOX_MARGIN_X];
        for (let group of toolboxGroups) {
            let left = this._groupLefts[this._groupLefts.length - 1];
            this._groupLefts.push(
                left + DisplayedToolbox._columnCount(group) * Config.TOOLBOX_GATE_SPAN + Config.TOOLBOX_GROUP_SPACING);
        }

        /** @type {!number} */
        this.viewWidth = viewWidth;
        /** @type {!number} */
        this.scrollX = Math.max(0, Math.min(scrollX, this.desiredWidth() - viewWidth));
    }

    /**
     * @param {!number} viewWidth
     * @returns {!DisplayedToolbox}
     */
    withViewWidth(viewWidth) {
        return this._withScroll(this.scrollX, viewWidth);
    }

    /**
     * @param {!number} dx Positive to bring gates on the right into view.
     * @returns {!DisplayedToolbox}
     */
    withScrolledBy(dx) {
        return this._withScroll(this.scrollX + dx, this.viewWidth);
    }

    /**
     * @param {!number} scrollX
     * @param {!number} viewWidth
     * @returns {!DisplayedToolbox}
     * @private
     */
    _withScroll(scrollX, viewWidth) {
        if (scrollX === this.scrollX && viewWidth === this.viewWidth) {
            return this;
        }
        return new DisplayedToolbox(
            this.name,
            this.top,
            this.toolboxGroups,
            this._originalGroups,
            this._standardApperance,
            scrollX,
            viewWidth);
    }

    /**
     * @param {!int} direction -1 for the button that scrolls back to the left, +1 for the one that scrolls right.
     * @returns {undefined|!Rect} The button, when there are gates to see in that direction.
     */
    scrollButtonRect(direction) {
        let maxScroll = this.desiredWidth() - this.viewWidth;
        if (direction < 0 ? this.scrollX <= 0 : this.scrollX >= maxScroll) {
            return undefined;
        }
        let x = direction < 0 ? 0 : this.viewWidth - SCROLL_BUTTON_WIDTH;
        return new Rect(x, this.top, SCROLL_BUTTON_WIDTH, this.desiredHeight());
    }

    /**
     * @param {!{hint: !string, gates: !Array<undefined|!Gate>}} group
     * @returns {!int} Two columns for the pairs in the first rows, and more for any gates after them.
     * @private
     */
    static _columnCount(group) {
        let used = group.gates.length;
        while (used > 0 && group.gates[used - 1] === undefined) {
            used--;
        }
        return 2 + Math.ceil(Math.max(0, used - GROUP_ROWS * 2) / GROUP_ROWS);
    }

    /**
     * @param {!CustomGateSet} customGateSet
     */
    withCustomGatesInserted(customGateSet) {
        let groups = customGateSet.gates.length === 0 ? this._originalGroups : [...this._originalGroups];
        for (let i = 0; i < customGateSet.gates.length; i += this.groupHeight*2) {
            let group = {
                hint: 'Custom Gates',
                gates: [undefined, undefined, undefined, undefined, undefined, undefined]
            };
            for (let j = 0; j < this.groupHeight*2 && i + j < customGateSet.gates.length; j++) {
                group.gates[j] = customGateSet.gates[i + j];
            }
            groups.push(group);
        }
        return new DisplayedToolbox(
            this.name,
            this.top,
            groups,
            this._originalGroups,
            this._standardApperance,
            this.scrollX,
            this.viewWidth);
    }

    /**
     * @param {!int} groupIndex
     * @param {!int} gateIndex
     * @returns {!Rect}
     */
    gateDrawRect(groupIndex, gateIndex) {
        let pairSlots = GROUP_ROWS * 2;
        let dx = gateIndex < pairSlots ? gateIndex % 2 : 2 + Math.floor((gateIndex - pairSlots) / GROUP_ROWS);
        let dy = gateIndex < pairSlots ? Math.floor(gateIndex / 2) : (gateIndex - pairSlots) % GROUP_ROWS;

        let x = this._groupLefts[groupIndex] + dx * Config.TOOLBOX_GATE_SPAN - this.scrollX;
        let y = this.top + Config.TOOLBOX_MARGIN_Y + dy * Config.TOOLBOX_GATE_SPAN;

        return new Rect(
            Math.round(x - 0.5) + 0.5,
            Math.round(y - 0.5) + 0.5,
            Config.GATE_RADIUS * 2,
            Config.GATE_RADIUS * 2);
    }

    /**
     * @param {!int} groupIndex
     * @returns {!Rect}
     */
    groupLabelRect(groupIndex) {
        let r = this.gateDrawRect(groupIndex, 0);
        let width = this._groupLefts[groupIndex + 1] - this._groupLefts[groupIndex] - Config.TOOLBOX_GROUP_SPACING;
        return new Rect(r.x - Config.TOOLBOX_GATE_SPACING / 2, r.y - 18, width, 20);
    }

    /**
     *
     * @param {undefined|!Point} pt
     *
     * @returns {undefined|!{groupIndex: !int, gateIndex: !int, gate: !Gate, rect: !Rect}}
     */
    findGateAt(pt) {
        if (pt === undefined || this.scrollButtonAt(pt) !== 0) {
            return undefined;
        }
        for (let groupIndex = 0; groupIndex < this.toolboxGroups.length; groupIndex++) {
            let group = this.toolboxGroups[groupIndex];
            for (let gateIndex = 0; gateIndex < group.gates.length; gateIndex++) {
                let gate = group.gates[gateIndex];
                let rect = this.gateDrawRect(groupIndex, gateIndex);
                if (gate !== undefined && rect.containsPoint(pt)) {
                    return {groupIndex, gateIndex, gate, rect};
                }
            }
        }
        return undefined;
    }

    /**
     * @param {!Point} pt
     * @returns {!int} The direction of the scroll button at the point, or 0 when there isn't one.
     */
    scrollButtonAt(pt) {
        for (let direction of [-1, +1]) {
            let rect = this.scrollButtonRect(direction);
            if (rect !== undefined && rect.containsPoint(pt)) {
                return direction;
            }
        }
        return 0;
    }

    /**
     * @param {!DisplayedToolbox|*} other
     * @returns {!boolean}
     */
    isEqualTo(other) {
        return other instanceof DisplayedToolbox &&
            this.name === other.name &&
            this.top === other.top &&
            this.toolboxGroups === other.toolboxGroups &&
            this.scrollX === other.scrollX &&
            this.viewWidth === other.viewWidth;
    }

    /**
     * @param {!number} newTop
     * @returns {!DisplayedToolbox}
     */
    withTop(newTop) {
        return new DisplayedToolbox(
            this.name,
            newTop,
            this.toolboxGroups,
            this._originalGroups,
            this._standardApperance,
            this.scrollX,
            this.viewWidth);
    }

    /**
     * @param {!number} maxWidth
     * @returns {!Rect}
     */
    curArea(maxWidth) {
        return new Rect(0, this.top, maxWidth, this.desiredHeight());
    }

    /**
     * @param {!Painter} painter
     * @param {!CircuitStats} stats
     * @param {!Hand} hand
     */
    paint(painter, stats, hand) {
        painter.fillRect(this.curArea(painter.canvas.width), Config.BACKGROUND_COLOR_TOOLBOX);
        this._standardApperance.paint(-this.scrollX, this.top, painter);
        this._paintDeviations(painter, stats, hand);
        this._paintScrollButtons(painter, hand);
    }

    /**
     * @param {!Painter} painter
     * @param {!Hand} hand
     * @private
     */
    _paintScrollButtons(painter, hand) {
        for (let direction of [-1, +1]) {
            let rect = this.scrollButtonRect(direction);
            if (rect === undefined) {
                continue;
            }
            let hovered = hand.pos !== undefined && rect.containsPoint(hand.pos);
            painter.fillRect(rect, hovered ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.8)');
            painter.strokeLine(
                new Point(direction < 0 ? rect.right() : rect.x, rect.y),
                new Point(direction < 0 ? rect.right() : rect.x, rect.bottom()),
                '#999');
            painter.print(
                direction < 0 ? '‹' : '›',
                rect.center().x,
                rect.center().y,
                'center',
                'middle',
                'black',
                '32px sans-serif',
                rect.w,
                rect.h);
            painter.noteTouchBlocker({rect, cursor: 'pointer'});
        }
    }

    /**
     * @param {!Painter} painter
     */
    _paintStandardContents(painter) {
        // Gates. Custom gates change, so _paintDeviations draws them instead of the cached painting.
        for (let groupIndex = 0; groupIndex < this._originalGroups.length; groupIndex++) {
            this._paintGatesInGroup(painter, Hand.EMPTY, groupIndex);
        }

        // Title of toolbox.
        let r = this.curArea(Config.TOOLBOX_MARGIN_X);
        let {x, y} = r.center();
        painter.ctx.save();
        painter.ctx.translate(x, y);
        painter.ctx.rotate(-Math.PI/2);
        painter.printLine(this.name, new Rect(-r.h / 2, -r.w / 2, r.h, r.w), 0.5, 'black', 24);
        painter.ctx.restore();
    }

    /**
     * @param {!Painter} painter
     * @param {!CircuitStats} stats
     * @param {!Hand} hand
     */
    _paintDeviations(painter, stats, hand) {
        for (let groupIndex = 0; groupIndex < this.toolboxGroups.length; groupIndex++) {
            // Custom gates.
            if (groupIndex >= this._originalGroups.length) {
                this._paintGatesInGroup(painter, hand, groupIndex);
            }

            // Keep scroll blockers positioned over the visible parts of gates.
            let group = this.toolboxGroups[groupIndex];
            for (let gateIndex = 0; gateIndex < group.gates.length; gateIndex++) {
                if (group.gates[gateIndex] === undefined) {
                    continue;
                }
                let rect = this.gateDrawRect(groupIndex, gateIndex);
                let left = Math.max(0, rect.x);
                let right = Math.min(this.viewWidth, rect.right());
                if (right > left) {
                    painter.noteTouchBlocker({rect: new Rect(left, rect.y, right - left, rect.h), cursor: 'pointer'});
                }
            }
        }

        this._paintFocus(painter, stats, hand);
    }

    /**
     * @param {!Painter} painter
     * @param {!Hand} hand
     * @param {!int} groupIndex
     * @private
     */
    _paintGatesInGroup(painter, hand, groupIndex) {
        let group = this.toolboxGroups[groupIndex];
        let r = this.groupLabelRect(groupIndex);
        painter.print(
            group.hint,
            r.x + r.w/2,
            r.y + r.h/2,
            'center',
            'middle',
            'black',
            '16px sans-serif',
            r.w,
            r.h);

        for (let gateIndex = 0; gateIndex < group.gates.length; gateIndex++) {
            let gate = group.gates[gateIndex];
            if (gate === undefined) {
                continue;
            }
            let rect = this.gateDrawRect(groupIndex, gateIndex);
            DisplayedToolbox._paintGate(painter, hand, gate, rect, false, CircuitStats.EMPTY);
        }
    }

    /**
     * @param {!Painter} painter
     * @param {!Hand} hand
     * @param {!Gate} gate
     * @param {!Rect} rect
     * @param {!boolean} isHighlighted
     * @param {!CircuitStats} stats
     * @private
     */
    static _paintGate(painter, hand, gate, rect, isHighlighted, stats) {
        let drawer = gate.customDrawer || GatePainting.DEFAULT_DRAWER;
        painter.startIgnoringIncomingTouchBlockers();
        drawer(new GateDrawParams(
            painter,
            hand,
            true, // inToolbox
            isHighlighted,
            false, // isResizeShowing
            false, // isResizeHighlighted
            rect,
            gate,
            stats,
            undefined, // positionInCircuit
            [], // focusPoints
            undefined)); // customStatsForCircuitPos
        painter.stopIgnoringIncomingTouchBlockers();
    }

    /**
     * @param {!Painter} painter
     * @param {!CircuitStats} stats
     * @param {!Hand} hand
     * @private
     */
    _paintFocus(painter, stats, hand) {
        // Focus when hovering, but also when dragging a gate over its own toolbox spot.
        let f = this.findGateAt(hand.pos);
        if (f === undefined || (hand.heldGate !== undefined && f.gate.symbol !== hand.heldGate.symbol)) {
            return;
        }

        // Draw highlight.
        DisplayedToolbox._paintGate(painter, hand, f.gate, f.rect, true, stats);

        // Size tooltip.
        painter.ctx.save();
        painter.ctx.globalAlpha = 0;
        painter.ctx.translate(-10000, -10000);
        let {maxW, maxH} = WidgetPainter.paintGateTooltip(
            painter, new Rect(0, 0, 500, 300), f.gate, stats.time, true);
        let mayNeedToScale = maxW >= 500 || maxH >= 300;
        painter.ctx.restore();

        // Draw tooltip.
        let cx = f.rect.right() + 1;
        let hintRect = new Rect(cx, f.rect.center().y, maxW, maxH).
            snapInside(painter.paintableArea().skipRight(10).skipBottom(20));
        painter.defer(() => WidgetPainter.paintGateTooltip(painter, hintRect, f.gate, stats.time, mayNeedToScale));
    }

    /**
     * @returns {!number}
     */
    desiredWidth() {
        let end = this._groupLefts[this._groupLefts.length - 1];
        return end - Config.TOOLBOX_GROUP_SPACING - Config.TOOLBOX_GATE_SPACING + 5.5;
    }

    //noinspection JSMethodCanBeStatic
    /**
     * @returns {!number}
     */
    desiredHeight() {
        return (1 + this.groupHeight) * (Config.GATE_RADIUS * 2 + 2) - Config.GATE_RADIUS;
    }

    /**
     * @param {!Hand} hand
     * @returns {!Hand} newHand
     */
    tryGrab(hand) {
        if (hand.pos === undefined || hand.isBusy()) {
            return hand;
        }

        let f = this.findGateAt(hand.pos);
        if (f === undefined) {
            return hand;
        }

        if (f.gate.symbol === MysteryGateSymbol) {
            setTimeout(() => { this.toolboxGroups[f.groupIndex].gates[f.gateIndex] = MysteryGateMaker(); }, 0.1);
        }
        return hand.withHeldGate(f.gate, new Point(Config.GATE_RADIUS, Config.GATE_RADIUS));
    }

    /**
     * @param {!Hand} hand
     * @returns {Infinity|!number}
     */
    stableDuration(hand) {
        return seq(hand.hoverPoints()).
            map(p => this.findGateAt(p)).
            filter(e => e !== undefined).
            map(e => e.gate.stableDuration()).
            min(Infinity);
    }
}

export {DisplayedToolbox}

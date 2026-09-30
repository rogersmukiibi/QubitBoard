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

import {Suite, assertThat} from "../TestUtil.js"
import {ketArgs, ketShader, ketShaderPermute, ketShaderPhase} from "../../src/circuit/KetShaderUtil.js"
import {assertThatCircuitShaderActsLikeMatrix} from "../CircuitOperationTestUtil.js"
import {CircuitEvalContext} from "../../src/circuit/CircuitEvalContext.js"
import {CircuitShaders} from "../../src/circuit/CircuitShaders.js"
import {Complex} from "../../src/math/Complex.js"
import {Controls} from "../../src/circuit/Controls.js"
import {KetTextureUtil} from "../../src/circuit/KetTextureUtil.js"
import {Matrix} from "../../src/math/Matrix.js"
import {Shaders} from "../../src/webgl/Shaders.js"
import {WglArg} from "../../src/webgl/WglArg.js"
import {WglTextureTrader} from "../../src/webgl/WglTextureTrader.js"

let suite = new Suite("KetShaderUtil");

suite.testUsingWebGL("ketShader", () => {
    let shader = ketShader(
        'uniform vec2 a, b, c, d;',
        'return cmul(inp(0.0), a+(c-a)*out_id) + cmul(inp(1.0), b+(d-b)*out_id);',
        1);
    assertThatCircuitShaderActsLikeMatrix(
        ctx => shader.withArgs(
            ...ketArgs(ctx),
            WglArg.vec2("a", 2, 3),
            WglArg.vec2("b", 5, 7),
            WglArg.vec2("c", 11, 13),
            WglArg.vec2("d", 17, 19)),
        new Matrix(2, 2, new Float32Array([2, 3, 5, 7, 11, 13, 17, 19])));
});

suite.testUsingWebGL("ketShaderPermute", () => {
    let shader = ketShaderPermute(
        '',
        'return mod(out_id + 1.0, 4.0);',
        2);
    assertThatCircuitShaderActsLikeMatrix(
        ctx => shader.withArgs(...ketArgs(ctx)),
        Matrix.generateTransition(4, i => (i - 1) & 3));
});

suite.testUsingWebGL("ketShaderPhase", () => {
    let shader = ketShaderPhase(
        '',
        'return out_id/10.0;',
        3);
    assertThatCircuitShaderActsLikeMatrix(
        ctx => shader.withArgs(...ketArgs(ctx)),
        Matrix.generateDiagonal(8, i => Complex.polar(1, i/10)));
});

suite.testUsingWebGL("ketShaderPhase_preservesMagnitudes", () => {
    let wireCount = 8;
    let shader = ketShaderPhase('', 'return out_id*0.7;', wireCount);
    let inVec = Matrix.generate(1, 1 << wireCount, r => new Complex(5 - (r % 7), (r % 5) - 2.5));
    let trader = new WglTextureTrader(Shaders.vec2Data(inVec.rawBuffer()).toVec2Texture(wireCount));
    let controlsTexture = CircuitShaders.controlMask(Controls.NONE).toBoolTexture(wireCount);
    let ctx = new CircuitEvalContext(0, 0, wireCount, Controls.NONE, controlsTexture, Controls.NONE, trader, new Map());
    ctx.applyOperation(shader.withArgs(...ketArgs(ctx)));
    controlsTexture.deallocByDepositingInPool();
    let out = KetTextureUtil.tradeTextureForVec2Output(trader);
    let inp = inVec.rawBuffer();

    let worst = 0;
    for (let i = 0; i < out.length; i += 2) {
        let ratio = Math.hypot(out[i], out[i + 1]) / Math.hypot(inp[i], inp[i + 1]);
        worst = Math.max(worst, Math.abs(ratio - 1));
    }
    assertThat(worst).isLessThan(0.00001);
});

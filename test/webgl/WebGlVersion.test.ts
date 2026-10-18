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
import {
    createWebGlContext,
    enableFloatTextureExtensions,
    floatTextureInternalFormat,
    isWebGl2,
    maxWebGlVersion
} from "../../src/webgl/WebGlVersion.js"
import {initializedWglContext} from "../../src/webgl/WglContext.js"
import {canTestFloatShaders} from "../../src/webgl/ShaderCoders.js"

let suite = new Suite("WebGlVersion");

const RGBA32F = 0x8814;

/** A stand-in for a WebGL1 context that has exactly the given extensions. */
const fakeWebGl1 = (...extensions: string[]): WebGLRenderingContext => ({
    RGBA: WebGLRenderingContext.RGBA,
    getExtension: (name: string) => extensions.indexOf(name) === -1 ? null : {}
}) as unknown as WebGLRenderingContext;

/** Frees a context made by a test, so tests don't use up the browser's limit on live contexts. */
const loseContext = (gl: WebGLRenderingContext | WebGL2RenderingContext | null): void => {
    let extension = gl === null ? null : gl.getExtension('WEBGL_lose_context');
    if (extension !== null) {
        extension.loseContext();
    }
};

const webGl2IsAvailable = (): boolean => {
    let gl = document.createElement('canvas').getContext('webgl2');
    loseContext(gl);
    return gl !== null;
};

suite.test("maxWebGlVersion", () => {
    assertThat(maxWebGlVersion('')).isEqualTo(2);
    assertThat(maxWebGlVersion('?webgl=1')).isEqualTo(1);
    assertThat(maxWebGlVersion('?other=x&webgl=1')).isEqualTo(1);
    assertThat(maxWebGlVersion('?webgl=2')).isEqualTo(2);
    assertThat(maxWebGlVersion('?webgl=banana')).isEqualTo(2);
});

suite.test("createWebGlContext_prefersWebGl2", () => {
    let gl = createWebGlContext(document.createElement('canvas'), 2);
    assertThat(gl !== null && isWebGl2(gl)).isEqualTo(webGl2IsAvailable());
    loseContext(gl);
});

suite.test("createWebGlContext_limitedToWebGl1", () => {
    let gl = createWebGlContext(document.createElement('canvas'), 1);
    assertThat(gl instanceof WebGLRenderingContext).isEqualTo(true);
    assertThat(gl !== null && isWebGl2(gl)).isEqualTo(false);
    loseContext(gl);
});

suite.test("enableFloatTextureExtensions_reportsMissingOnes", () => {
    assertThat(enableFloatTextureExtensions(fakeWebGl1('OES_texture_float', 'WEBGL_color_buffer_float')))
        .isEqualTo([]);
    assertThat(enableFloatTextureExtensions(fakeWebGl1('OES_texture_float')))
        .isEqualTo(['WEBGL_color_buffer_float']);
    assertThat(enableFloatTextureExtensions(fakeWebGl1()))
        .isEqualTo(['OES_texture_float', 'WEBGL_color_buffer_float']);
});

suite.test("floatTextureInternalFormat", () => {
    assertThat(floatTextureInternalFormat(fakeWebGl1())).isEqualTo(WebGLRenderingContext.RGBA);
    if (webGl2IsAvailable()) {
        let gl = createWebGlContext(document.createElement('canvas'), 2);
        assertThat(gl === null ? undefined : floatTextureInternalFormat(gl)).isEqualTo(RGBA32F);
        loseContext(gl);
    }
});

suite.test("appContextFollowsTheUrl", () => {
    let expected = maxWebGlVersion(document.location.search) === 2 && webGl2IsAvailable() ? 2 : 1;
    assertThat(initializedWglContext().webGlVersion).isEqualTo(expected);
});

suite.test("floatTexturesWorkWhenTheExtensionsArePresent", () => {
    let gl = initializedWglContext().gl;
    if (enableFloatTextureExtensions(gl).length === 0) {
        assertThat(canTestFloatShaders()).isEqualTo(true);
    } else {
        assertThat(undefined); // Cancel 'no assertion' warning.
    }
});

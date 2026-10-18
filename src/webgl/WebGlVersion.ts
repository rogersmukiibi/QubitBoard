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

// The shaders are written in GLSL ES 1.0, which both WebGL versions compile. What differs between the versions is how
// floating point textures are made and rendered into.

export type WebGlContext = WebGLRenderingContext | WebGL2RenderingContext;

/**
 * @param search A URL's query string, such as document.location.search.
 * @returns 1 when the query has webgl=1, which keeps the page on WebGL1, and otherwise 2.
 */
export function maxWebGlVersion(search: string): 1 | 2 {
    return new URLSearchParams(search).get('webgl') === '1' ? 1 : 2;
}

/**
 * @returns A WebGL2 context when the browser has one and maxVersion allows it, otherwise a WebGL1 context, or null
 * when the browser has neither.
 */
export function createWebGlContext(canvas: HTMLCanvasElement, maxVersion: 1 | 2): WebGlContext | null {
    if (maxVersion === 2) {
        let gl = canvas.getContext('webgl2');
        if (gl !== null) {
            return gl;
        }
    }
    return canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
}

export function isWebGl2(gl: WebGlContext): gl is WebGL2RenderingContext {
    return typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
}

/**
 * Turns on the extensions needed to render into floating point textures and read them back.
 * @returns The names of the extensions that the context doesn't have.
 */
export function enableFloatTextureExtensions(gl: WebGlContext): string[] {
    let names = isWebGl2(gl) ? ['EXT_color_buffer_float'] : ['OES_texture_float', 'WEBGL_color_buffer_float'];
    return names.filter(name => gl.getExtension(name) === null);
}

/**
 * @returns The internal format for a floating point RGBA texture. WebGL2 needs a sized format.
 */
export function floatTextureInternalFormat(gl: WebGlContext): number {
    return isWebGl2(gl) ? gl.RGBA32F : gl.RGBA;
}

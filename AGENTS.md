# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project

QubitBoard is a browser-based, drag-and-drop quantum circuit simulator, forked from
[Quirk](https://github.com/Strilanc/Quirk). The whole app builds into a single self-contained file,
`out/qubitboard.html`, which is deployed to GitHub Pages as `index.html`. Simulation runs on the GPU through WebGL
shaders.

## Layout

| Path | Contents |
|------|----------|
| `src/main.js` | App entry point |
| `src/base/` | Generic utilities (`Seq`, `Obs`, `Util`, `DetailedError`, ...) |
| `src/math/` | Complex numbers, matrices, `Rect`, `Point` |
| `src/circuit/` | Circuit model, serialization, simulation shaders |
| `src/gates/` | Gate definitions; every gate is registered in `AllGates.js` |
| `src/draw/` | Canvas painting |
| `src/ui/` | Toolbox, circuit area, menu, export, URL and undo handling |
| `src/webgl/` | WebGL wrappers and shader coders |
| `src/browser/` | Browser glue (events, clipboard, polyfills) |
| `html/` | Page template and partials, which are injected at build time by `GruntFile.js` |
| `test/` | Unit tests; `test/**/*.test.js` mirrors `src/` |
| `test_perf/` | Performance tests (`*.perf.js`) |
| `doc/` | User guide and images |

## Toolchain

- Node 22 (as used in CI). Dev dependencies only: nothing is shipped from `node_modules`.
- The source is ES2015+ modules, compiled by **traceur** through `grunt-traceur`, then concatenated and minified by
  uglify. Both traceur packages are unmaintained. The `overrides` in `package.json` pin their vulnerable transitive
  dependencies (`lodash`, `semver`) to patched versions, so keep those overrides when changing dependencies.
- Imports use relative paths with the `.js` extension, e.g. `import {Rect} from "../math/Rect.js"`.
- Source files start with the Apache 2.0 license header. Copy it into any new file.

## Commands

```bash
npm ci                               # install
npm run build                        # production build -> out/qubitboard.html
npx grunt build-debug                # unminified build, easier to debug
npx grunt build-test-page            # build out/test.html
node PuppeteerRunTests.js            # run all unit tests in headless Chromium (what CI runs)
node PuppeteerScreenshotCircuit.js   # render a sample circuit to screenshot.png
npm run test-chrome                  # run unit tests through karma (needs a local Chrome, or CHROME_BIN)
npm run test-firefox                 # same, with Firefox
```

Set `PUPPETEER_NO_SANDBOX=1` when Chromium's sandbox is unavailable (containers, WSL, CI).

## Tests

- Tests use a small custom framework in `test/TestUtil.js` (`Suite`, `assertThat`, `assertTrue`, `assertThrows`).
  There is no Jest or Mocha.
- New `*.test.js` files under `test/` are discovered automatically by glob. No registration is needed.
- `suite.testUsingWebGL(...)` and `suite.canvasAppearanceTest(...)` depend on the browser. Text metrics and rendering vary
  between Chromium versions and installed fonts, so don't hard-code pixel-exact text positions.
- Before finishing a change, run `npx grunt build-test-page && node PuppeteerRunTests.js` and confirm that it prints
  `All N tests passed.` with exit code 0.

## CI

- `.github/workflows/ci.yml` builds, runs the Puppeteer test suite, and uploads a screenshot on every push and PR.
- `.github/workflows/pages.yml` builds and deploys to GitHub Pages on pushes to `master`.

## Conventions

- Match the style of the surrounding code: 4-space indentation, JSDoc type annotations on public methods, and
  immutable value classes with `isEqualTo` and `toString`.
- Keep comments sparse. Don't add comments that restate the code.
- Wire ordering: the top wire is the low bit, and kets are big-endian. See `doc/README.md` for the user-facing
  conventions.

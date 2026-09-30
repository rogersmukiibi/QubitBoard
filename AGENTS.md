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
| `src/ui/` | Toolbox, circuit area, menu, export, URL, undo handling and the code panel |
| `src/code/` | Code panel languages: each one converts circuit JSON to code and back (`Languages.ts` lists them) |
| `src/webgl/` | WebGL wrappers and shader coders |
| `src/browser/` | Browser glue (events, clipboard, polyfills) |
| `html/` | Page template and partials, which are injected at build time by `GruntFile.js` |
| `test/` | Unit tests; `test/**/*.test.{js,ts}` mirrors `src/` |
| `test_perf/` | Performance tests (`*.perf.js`) |
| `doc/` | User guide and images |

## Toolchain

- Node 22 (as used in CI). Dev dependencies only: nothing is shipped from `node_modules`.
- The source is ES2015+ modules, compiled by **traceur** through `grunt-traceur`, then concatenated and minified by
  uglify. Both traceur packages are unmaintained. The `overrides` in `package.json` pin their vulnerable transitive
  dependencies (`lodash`, `semver`) to patched versions, so keep those overrides when changing dependencies.
- New files are written in **TypeScript** (`.ts`); existing `.js` files stay JavaScript unless converting them is the
  task. `tsconfig.json` is strict. The `compile-ts` grunt step runs `tsc` first in every build, compiling `.ts` files
  from `src/` and `test/` into `out/tmp/tsc/` as ES2015. Traceur then treats that output like any other `.js` module.
  A type error fails the build. Run `npm run typecheck` for a quick check.
- TypeScript infers the types of `.js` modules from their JSDoc. If a `.ts` file gets a wrong type from an old module,
  fix that module's JSDoc (e.g. mark optional parameters `{*=}`) rather than adding casts.
- Imports use relative paths with the `.js` extension, including imports of `.ts` modules, e.g.
  `import {Rect} from "../math/Rect.js"`.
- Source files start with the Apache 2.0 license header. Copy it into any new file.

## Commands

```bash
npm ci                               # install
npm run typecheck                    # type-check the TypeScript files
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

- Write the unit tests first, then the code. Start each change by adding or updating tests that describe the
  intended behavior, check that they fail for the expected reason, and then implement until they pass. Don't write
  the implementation first and back-fill tests afterwards.
- Tests use a small custom framework in `test/TestUtil.js` (`Suite`, `assertThat`, `assertTrue`, `assertThrows`).
  There is no Jest or Mocha.
- New `*.test.ts` (or `*.test.js`) files under `test/` are discovered automatically by glob. No registration is needed.
- `suite.testUsingWebGL(...)` and `suite.canvasAppearanceTest(...)` depend on the browser. Text metrics and rendering vary
  between Chromium versions and installed fonts, so don't hard-code pixel-exact text positions.
- Before finishing a change, run `npx grunt build-test-page && node PuppeteerRunTests.js` and confirm that it prints
  `All N tests passed.` with exit code 0.

## CI

- `.github/workflows/ci.yml` builds, runs the Puppeteer test suite, and uploads a screenshot on every push and PR.
- `.github/workflows/pages.yml` builds and deploys to GitHub Pages on pushes to `master`.

## Git

- Don't commit or stage work unless explicitly told to. The maintainer reviews every change as an uncommitted diff
  before it is committed, so leave changes in the working tree and report what changed instead.

## Conventions

- Match the style of the surrounding code: 4-space indentation, type annotations on public methods (JSDoc in `.js`
  files, TypeScript types in `.ts` files), and immutable value classes with `isEqualTo` and `toString`.
- Keep comments sparse. Don't add comments that restate the code.
- Wire ordering: the top wire is the low bit, and kets are big-endian. See `doc/README.md` for the user-facing
  conventions.

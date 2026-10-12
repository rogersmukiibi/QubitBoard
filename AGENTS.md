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
| `html/` | Page template and partials, which are injected at build time by `build.mjs` |
| `test/` | Unit tests; `test/**/*.test.{js,ts}` mirrors `src/` |
| `test_perf/` | Performance tests (`*.perf.js`) |
| `doc/` | Quick reference (`doc/README.md`) and the guide's images |
| `doc/wiki/` | Source of the GitHub wiki pages, including the user guide; published by `.github/workflows/wiki.yml` |
| `build.mjs` | Build script behind the `npm run build*` commands |
| `CHANGELOG.md` | What changed in each version |
| `ROADMAP.md` | Planned work, known issues and past design decisions |

## Toolchain

- Node 22 (as used in CI). Dev dependencies only: nothing is shipped from `node_modules`.
- The source is ES modules, bundled by **esbuild** through `build.mjs`. It bundles `.js` and `.ts` files alike into one
  ES2015 script and injects it into the page template. Production builds are minified. Debug and test builds are not,
  and carry an inline source map.
- New files are written in **TypeScript** (`.ts`); existing `.js` files stay JavaScript unless converting them is the
  task. `tsconfig.json` is strict. esbuild strips types without checking them, so every build runs `tsc` first, which
  only type-checks (`noEmit`). A type error fails the build. Run `npm run typecheck` for a quick check.
- `TARGET` in `build.mjs` and `target` in `tsconfig.json` name the same ECMAScript version. Change them together.
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
npm run build-debug                  # unminified build with a source map, easier to debug
npm run build-test-page              # build out/test.html
node PuppeteerRunTests.js            # run all unit tests in headless Chromium (what CI runs)
npm test                             # the two commands above, in one
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
- Before finishing a change, run `npm test` and confirm that it prints `All N tests passed.` with exit code 0.

## CI

- `.github/workflows/ci.yml` builds, runs the Puppeteer test suite, and uploads a screenshot on every push and PR.
- `.github/workflows/pages.yml` builds and deploys to GitHub Pages on pushes to `main`.
- `.github/workflows/wiki.yml` mirrors `doc/wiki/` into the GitHub wiki on pushes to `main` that change it. Update the
  guide in `doc/wiki/Qubit-Board-Guide.md` when a change affects how QubitBoard is used; never edit the wiki directly.

## Changelog and roadmap

- When a change alters behavior, add an entry to the **Unreleased** section of `CHANGELOG.md` in the same change. Mark
  it **(breaking)** if existing circuit links behave differently.
- When work listed in `ROADMAP.md` is done, remove it there. When you defer something or find a limitation, add it
  there.
- Don't change `"version"` in `package.json` unless asked: the maintainer decides when to release. The minor number
  is for a new major feature area (2.4 added the code editor) or a change in supported browsers (2.5); changes inside
  a feature area are patch releases.

## Git

- Don't commit or stage work unless explicitly told to. The maintainer reviews every change as an uncommitted diff
  before it is committed, so leave changes in the working tree and report what changed instead.

## Conventions

- Match the style of the surrounding code: 4-space indentation, type annotations on public methods (JSDoc in `.js`
  files, TypeScript types in `.ts` files), and immutable value classes with `isEqualTo` and `toString`.
- Keep comments sparse. Don't add comments that restate the code.
- Wire ordering: the top wire is the low bit, and kets are big-endian. See `doc/README.md` for the user-facing
  conventions.

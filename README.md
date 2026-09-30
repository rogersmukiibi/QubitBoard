# <a href="https://rogersmukiibi.com/QubitBoard/">QubitBoard <img src="doc/favicon.ico" alt="Icon" title="Icon" /></a>

[![ci](https://github.com/rogersmukiibi/QubitBoard/actions/workflows/ci.yml/badge.svg)](https://github.com/rogersmukiibi/QubitBoard/actions/workflows/ci.yml)
[![deploy-pages](https://github.com/rogersmukiibi/QubitBoard/actions/workflows/pages.yml/badge.svg)](https://github.com/rogersmukiibi/QubitBoard/actions/workflows/pages.yml)

QubitBoard is a toy quantum circuit simulator, intended to help people in learning about quantum computing.
It is a fork of [Quirk](https://github.com/Strilanc/Quirk), an awesome tool created by Craig Gidney.

If you want to quickly explore the behavior of a small quantum circuit, QubitBoard is the tool for you.
There's no installing or configuring or scripting: just go to **[rogersmukiibi.com/QubitBoard](https://rogersmukiibi.com/QubitBoard/)**, drag gates onto the circuit, and the output displays will update in real time.

(If you're still trying to understand what a quantum circuit *even is*, the video series [Quantum Computing for the Determined](https://www.youtube.com/playlist?list=PL1826E60FD05B44E4) is a good starting point.
QubitBoard assumes you already know background facts like "each wire represents a qubit".)

**Defining features**:

- Runs in web browsers.
- Drag-and-drop circuit editing.
- Reacts, simulates, and animates in real time.
- Inline state displays.
- Bookmarkable / linkable circuits.
- Up to 16 qubits.

**Notable limitations**:

- Can't recohere measured qubits (because measurement is implemented as a hack based on the [deferred measurement principle](https://en.wikipedia.org/wiki/Deferred_Measurement_Principle)).

**Try it out**:

**[rogersmukiibi.com/QubitBoard](https://rogersmukiibi.com/QubitBoard/)**

**Learn it**: the [Qubit Board Guide](https://github.com/rogersmukiibi/QubitBoard/wiki/Qubit-Board-Guide),
the [tutorial video](https://youtu.be/hiMqqOVrBg0), and the [controls and conventions reference](doc/README.md).

# Examples

**Basic usage demo**:

![Demo](/doc/README_Demo.gif)

**Grover search circuit** with chance and sample displays (showing that the chance of success increases):

![Grover search](/doc/README_Grover.gif)

**Quantum teleportation circuit** with Bloch sphere displays (showing that the qubit at the top has ended up at the bottom):

![Quantum teleportation](/doc/README_Teleportation.gif)

# Building

If you want to modify QubitBoard, this is how you get the code and turn your changes into working html/javascript.

1. Have [git](https://git-scm.com/) and [Node.js](https://nodejs.org/en/download/) 22.12 or newer installed.

    On Ubuntu 26.04 (including under WSL), the packaged Node.js is recent enough:

    `sudo apt-get update`

    `sudo apt-get install --yes git nodejs npm`

    On older distributions, install Node.js 22 with [nvm](https://github.com/nvm-sh/nvm) or from [nodejs.org](https://nodejs.org/en/download/).

2. Clone the repository.

    `git clone https://github.com/rogersmukiibi/QubitBoard.git`

3. Install the dev dependencies.

    `cd QubitBoard`

    `npm ci`

4. (*Optional*) Make your changes. Type-check them, then run the tests.

    `npm run typecheck`

    `npx grunt build-test-page && node PuppeteerRunTests.js`

    This uses the Chromium that Puppeteer downloads during `npm ci`, so no browser needs to be installed.
    Under WSL or in a container, prefix it with `PUPPETEER_NO_SANDBOX=1`.
    To use a locally installed browser through karma instead, run `npm run test-chrome` or `npm run test-firefox`.

5. Build the output.

    `npm run build`

    For an unminified build that is easier to debug, run `npx grunt build-debug` instead.

6. Confirm the output works by opening `out/qubitboard.html` with a web browser.

    On Linux: `xdg-open out/qubitboard.html`

    Under WSL, to open it in your default Windows browser: `explorer.exe "$(wslpath -w out/qubitboard.html)"`

7. Copy `out/qubitboard.html` to wherever you want. It is a single self-contained file.

Contributors and AI coding agents can find the project layout and conventions in [AGENTS.md](AGENTS.md).

## TypeScript

QubitBoard is moving from JavaScript to TypeScript one file at a time:

- **Write new files in TypeScript** (`.ts`), in `src/` and in `test/` alike.
- **Leave existing `.js` files as JavaScript** when you only change a few lines. Convert a file only as a deliberate
  change of its own.
- **Import with the `.js` extension**, even when the module is a `.ts` file:
  `import {CodeError} from "../code/CodeError.js"`. That path works from both languages and doesn't have to change
  when a file is converted.

The build handles the mix. Every build task first runs `tsc` (configured by [`tsconfig.json`](tsconfig.json)), which
type-checks the `.ts` files and compiles them to ES2015 JavaScript. That output then goes through the same traceur
and uglify steps as the `.js` files. A type error stops the build, so `npm run typecheck` is a quick way to check
your changes before running the tests.

TypeScript reads the types of existing `.js` modules from their JSDoc comments. When a `.ts` file gets a wrong type
from an old module, fixing that module's JSDoc is usually the smallest fix.

# Deployment

Every push and pull request is tested by [`.github/workflows/ci.yml`](.github/workflows/ci.yml).
Pushes to `master` are also built and published to GitHub Pages by
[`.github/workflows/pages.yml`](.github/workflows/pages.yml), which runs the same build as `npm run build` and publishes
`out/qubitboard.html` as the site's `index.html`.

# Credits

QubitBoard is a fork of [Quirk](https://github.com/Strilanc/Quirk), originally created by Craig Gidney at Google
and released under the Apache License 2.0. This fork is independently maintained and is not affiliated with or
endorsed by the original authors. See [LICENSE](LICENSE) for the full license text.

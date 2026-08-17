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

# Examples

**Basic usage demo**:

![Demo](/doc/README_Demo.gif)

**Grover search circuit** with chance and sample displays (showing that the chance of success increases):

![Grover search](/doc/README_Grover.gif)

**Quantum teleportation circuit** with Bloch sphere displays (showing that the qubit at the top has ended up at the bottom):

![Quantum teleportation](/doc/README_Teleportation.gif)

# Building

If you want to modify QubitBoard, this is how you get the code and turn your changes into working html/javascript.

1. Have [git](https://git-scm.com/) and [Node.js](https://nodejs.org/en/download/) installed.

    `sudo add-apt-repository universe`

    `sudo apt-get update`

    `sudo apt-get install --yes git npm nodejs build-essential`

2. Clone the repository.

    `git clone https://github.com/rogersmukiibi/QubitBoard.git`

3. Install the dev dependencies.

    `cd QubitBoard`

    `npm install`

4. (*Optional*) Make your changes. Run the tests.

    `npm run test-firefox`

5. Build the output.

    `npm run build`

6. Confirm the output works by opening `out/qubitboard.html` with a web browser.

    `firefox out/qubitboard.html`

7. Copy `out/qubitboard.html` to wherever you want.

# Deployment

Pushes to `master` are built and published to GitHub Pages automatically by
[`.github/workflows/pages.yml`](.github/workflows/pages.yml). The workflow runs the same `npm run build` as above and publishes `out/qubitboard.html` as the site's `index.html`.



# Credits

QubitBoard is a fork of [Quirk](https://github.com/Strilanc/Quirk), originally created by Craig Gidney at Google
and released under the Apache License 2.0. This fork is independently maintained and is not affiliated with or
endorsed by the original authors. See [LICENSE](LICENSE) for the full license text.

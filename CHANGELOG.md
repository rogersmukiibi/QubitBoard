# Changelog

What changed in each version of QubitBoard, newest first. Planned work is in [ROADMAP.md](ROADMAP.md).

Add an entry under **Unreleased** in the same change that alters behavior. When releasing, rename **Unreleased** to the
new version and date, set `"version"` in `package.json` and `package-lock.json`, and start a new empty **Unreleased**
section.

Version numbers: the minor number changes when a major feature area is added (2.4 added the code editor) or when the
supported browsers change (2.5). Changes inside an existing feature area, such as a new code language or a different
default, are patch releases. The page header shows only `major.minor`, so 2.4.0 and 2.4.1 both show "2.4".

Entries are grouped as **Added**, **Changed**, **Fixed** and **Removed**. Anything that makes an existing circuit link
behave differently is marked **(breaking)**.

## Unreleased

### Added

- **Gate reference** in the documentation: every gate in the toolbox, with a section per toolbox group, showing each
  gate's picture, name, id, sizes and effect. A unit test fails when the page and the toolbox in
  `src/gates/AllGates.js` disagree, and `npm run screenshot-gates` retakes the pictures from the app.
- `?webgl=1` in the page URL, before the `#`, makes QubitBoard use WebGL1. It is for computers where the WebGL2
  simulation goes wrong. The circuit links page in the documentation describes it.

### Changed

- **One toolbox above the circuit** in place of a toolbox above it and another below it. The groups of the old bottom
  toolbox follow those of the top one in a single row, each group at most three gates tall (groups with seven or eight
  gates get a third column). When the window is too narrow, the mouse wheel or the arrows at the toolbox's edges
  scroll the toolbox on its own, so the circuit stays in place and gates are dragged as short a way as before. The
  red hints on a new circuit follow the gates they point at, and fade out once the toolbox is scrolled. The
  **Custom Gates** group only appears once the circuit has a custom gate. Circuit links and gate ids are unchanged.
- **The code panel can be closed** with its ✕ button, and the new **Code** button at the top of the page opens it
  again. Whether it was closed is remembered, like whether it was minimised.
- **Circuits are simulated with WebGL2** when the browser has it, and with WebGL1 otherwise. The shaders are
  unchanged, and the simulation was as fast with either version in the performance tests. The unit tests run under
  both versions.
- **The user guide is now a documentation site** at <https://rogersmukiibi.com/QubitBoard/docs/>, with a sidebar,
  search and a page per topic in place of the single wiki page. It is built from `doc/` by VitePress
  (`npm run build-docs`) and published next to the app by the Pages workflow. The menu's **User Guide** link opens it,
  and the wiki guide is now a pointer to it.
- The screenshots and GIFs in `doc/` moved to `doc/images/`, and the favicon to `doc/public/`.

### Fixed

- The browser console now says when a floating point texture extension is missing. The check compared against
  `undefined`, but a missing extension is `null`, so the warning never appeared.
- **Gate tooltips.** Only the text changed; the gates behave as before.
  - The Hadamard gate's tooltip had its two cases the wrong way round. It now says that H maps OFF to OFF + ON and ON
    to OFF - ON.
  - The Y-axis controls and Y-axis postselection gates named the opposite state to the one they use. The X and Y axis
    tooltips now write every state with OFF first: OFF+ON, OFF-ON, OFF+iON and OFF-iON.
  - "Principle" is now "principal" in the tooltips of the root gates, such as √X and Z^¼.
  - The phase gradient tooltips say "proportional to its value", Postselect On writes ON and OFF in capitals like the
    other gates, and Postselect Y-Off says "discards/retries".

## 2.5.0 (2026-10-12)

### Changed

- **The build uses esbuild** instead of traceur, grunt and uglify. The `npx grunt ...` commands are now npm scripts:
  `npm run build`, `npm run build-debug`, `npm run build-test-page` and `npm test`, which builds the test page and runs
  it. A build takes under a second instead of about seven, debug and test builds have source maps, and the page is
  424 kB instead of 672 kB.
- The page is ES2015 code instead of ES5, so it no longer runs in browsers without ES2015 support, such as Internet
  Explorer 11.
- The `lodash` and `semver` overrides are gone from `package.json`, along with the packages that needed them.

### Fixed

- Running unedited code no longer moves gates. When a wide gate (such as an amplitude display or a formula gate)
  covered an otherwise empty column, the code left that column out, so pressing Run shifted the following gates left
  into it. The empty column is now written as a `skip` line (`# @qb skip` in Cirq, `// @qb skip` in OpenQASM).

## 2.4.1 (2026-10-03)

### Added

- **Cirq is a code panel language, and the default.** The circuit is written as runnable Cirq (Python), one line per
  column, and Cirq code can be pasted in and run. Written as Cirq: H, X, Y, Z, swap, measurement, S and T, all fixed
  fractional powers, controls and anti-controls, formula gates, spinning gates, QFT and its inverse, the phase gradient
  gates, scalar gates, and custom gates defined by a unitary matrix. Everything else stays on `# @qb` comment lines in
  the QubitBoard language, so round trips lose nothing. The emitted code was checked against Cirq 1.7.0: the unitaries
  match QubitBoard's simulation, global phase included.
- The guide has a Cirq section describing the mapping and what can be read back.

### Changed

- **(breaking) Formulas follow standard precedence, the same as Python.** A sign now binds looser than a power, and
  powers group from the right: `-t^2` is -(t²), not (-t)², and `2^3^2` is 2^(3²) = 512, not 64. This applies to formula
  gates, custom gate matrices and the rotation-axis box. Saved links whose formulas relied on the old reading now
  evaluate differently. Functions without parentheses are unchanged (`√4^2` is still (√4)²).
- The language drop-down lists Cirq, OpenQASM 3, QubitBoard, in that order. A browser that already chose a language
  keeps it.

### Fixed

- A sign directly after an operator was misread: `3*2^-1` gave 9 instead of 1.5, and `1+2*-3` was also wrong.
- OpenQASM export of formulas such as `-pi^2/3` produced `-pi**2/3`, which other QASM tools read as a different angle
  than QubitBoard used. The precedence change makes the two agree.

## 2.4.0 (2026-09-30)

The first QubitBoard version, forked from [Quirk](https://github.com/Strilanc/Quirk) 2.3.

### Added

- **Code panel.** A panel docked at the bottom of the page shows the circuit as code and applies typed code on Run
  (Ctrl+Enter). It has its own dependency-free editor with syntax highlighting, line numbers and error marking.
- **QubitBoard language.** A one-line-per-column language that mirrors the circuit JSON exactly, covering every gate,
  display, custom gate and initial state.
- **OpenQASM 3 language.** Standard gates are written as QASM; everything else goes on `// @qb` comment lines.
  OpenQASM 2 can also be read.
- **User guide**, kept in `doc/wiki/` and published to the GitHub wiki by a workflow.
- TypeScript for new files, compiled by `tsc` ahead of the existing traceur build.
- Deployment to GitHub Pages.

### Changed

- Renamed from Quirk to QubitBoard throughout, with new homepage, guide and tutorial links.
- Updated development dependencies, and pinned the vulnerable transitive dependencies of the unmaintained traceur
  packages (`lodash`, `semver`) to patched versions.

### Fixed

- Phase-only gate shaders normalize their phase factor, so they preserve each amplitude's magnitude.
- The test runner fails when the browser dies before the tests finish, instead of reporting success.

## 2.3 and earlier

Upstream Quirk. See the [Quirk repository](https://github.com/Strilanc/Quirk) for its history.

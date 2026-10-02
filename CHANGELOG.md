# Changelog

What changed in each version of QubitBoard, newest first. Planned work is in [ROADMAP.md](ROADMAP.md).

Add an entry under **Unreleased** in the same change that alters behavior. When releasing, rename **Unreleased** to the
new version and date, set `"version"` in `package.json` and `package-lock.json`, and start a new empty **Unreleased**
section.

Version numbers: the minor number changes when a major feature area is added (2.4 added the code editor). Changes
inside an existing feature area, such as a new code language or a different default, are patch releases. The page
header shows only `major.minor`, so 2.4.0 and 2.4.1 both show "2.4".

Entries are grouped as **Added**, **Changed**, **Fixed** and **Removed**. Anything that makes an existing circuit link
behave differently is marked **(breaking)**.

## Unreleased

Nothing yet.

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

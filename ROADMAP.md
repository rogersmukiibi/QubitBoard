# Roadmap

Proposed work and known issues, for maintainers and contributors. What has already shipped is in
[CHANGELOG.md](CHANGELOG.md).

When an item is done, delete it here and add it to the changelog's **Unreleased** section. When a new idea or
limitation comes up, add it here with enough context that someone else could pick it up.

## Planned

### Cirq language

Each of these gates currently stays on a `# @qb` comment line. They are listed in the order they were agreed.

- **X/Y-axis controls, parity controls and detector gates.** In Cirq each is several operations (a basis change around
  an ordinary control or measurement), so writing them breaks the one-line-per-column rule. Needs a decision on how a
  multi-operation column is written and recognized when read back.
- **Arithmetic, bit-reordering and input-rotation gates.** Cirq ships classes for these in `cirq.interop.quirk`
  (`QuirkArithmeticGate`, `QuirkQubitPermutationGate`, `QuirkInputRotationOperation`). The open design question: Cirq
  binds the inputs A, B and R into the gate, while QubitBoard uses separate `inputA` and `setA` gates that can sit in
  an earlier column.
- **Custom gates defined by a circuit.** Only custom gates defined by a unitary matrix are written as Cirq.
  `cirq.CircuitOperation` is the likely form.
- **Time-varying phase gradient gates** (`grad^t`, `grad^-t`).
- **Scalar gates on any wire.** Cirq's global phase has no qubit, so a scalar gate is only written as Cirq when it is
  on the column's first free wire.
- **Reading `cirq.qft(*q)`** with qubits in ascending order. It is rejected today because it is a bit-reversed QFT in
  QubitBoard's wire order; it could be read as a reversal, a QFT and another reversal.

### Other languages

- **OpenQASM 3: `pow @`, `gphase`, `U` and gate definitions.** The reader rejects them today. Supporting them would let
  fractional powers be written as QASM.

### Documentation

- Retake `doc/images/code-panel.png`: it shows the QubitBoard language as the default.
- **Move VitePress to a stable release.** `vitepress` is pinned to `2.0.0-alpha.20`, because the latest stable version
  (1.6.4) depends on a Vite and an esbuild that `npm audit` reports. Move to 2.0 once it is released.
- **Developer documentation on the site.** Building, the TypeScript migration and deployment are still described in
  `README.md` and `AGENTS.md` only.

### Simulator

- **More than 16 qubits: measure on a real GPU first.** See the 2026-10-18 decision below for the software-rendering
  numbers. With `Config.MAX_WIRE_COUNT` set to 20, every unit test passes except `QubitBoardDsl parse_errors`, which
  expects `q16` to be out of range, but no test uses a circuit wider than 16 wires. What raising it involves:
  - The constant is unrolled into shader loops (`CircuitShaders.js` and the arithmetic gates) that always run
    `MAX_WIRE_COUNT` times, so raising it slows every circuit. Giving the loops a `break` at the circuit's real wire
    count would avoid that.
  - Shader index arithmetic uses floats, so it is exact up to 2^24 amplitudes, and the measurement masks are 32-bit
    integers.
  - Older QubitBoard versions and Quirk open a wider circuit with 16 wires and silently drop the gates on the others.
  - Add perf goals for the wider circuits next to the 16-qubit ones in `test_perf/`.

### Tooling

- **Replace or remove karma.** It is deprecated, and its dependencies (`braces`, through `chokidar`) are the three
  findings `npm audit` still reports. Only `npm run test-chrome`, `test-firefox` and `test-perf-chrome` use it. CI runs
  the tests with Puppeteer, and `out/test.html` can be opened in any browser.
- **Source map for the production build.** Only debug and test builds have one, inline. The deployed page would need
  it as a separate file published next to `index.html`.

## Known issues

- `npm run screenshot-gates` fails with `ERR_NO_TYPESCRIPT` on Node builds compiled without TypeScript support, such
  as Ubuntu's `nodejs` 22.22. It runs `PuppeteerScreenshotGates.mts` with `--experimental-strip-types`. Writing it as
  `.mjs`, like `PuppeteerCheckApp.mjs`, would remove the dependency.

- `sqrt` of a negated real number picks the lower branch: the formula `sqrt -4` gives -2i, not 2i. Negating a real
  number leaves it with an imaginary part of -0, which the square root reads as an angle of -180°.

## Not possible in any external language

Displays, postselection, initial states, detect-and-reset gates and the discrete-time gates (`X^⌈t⌉`, counting,
`<<t`) have no equivalent in Cirq, Qiskit, CUDA-Q or OpenQASM. They will stay on `@qb` comment lines, which is why the
QubitBoard language is kept.

## Decisions

- **2026-10-02: Cirq is the default code language.** Cirq, Qiskit, CUDA-Q and OpenQASM 3 were compared against the gate
  set. Cirq was the only one covering fractional powers, time-dependent gates, custom matrices, QFT and columns
  (`cirq.Moment`). CUDA-Q has no fractional powers, QFT or arithmetic, and was not pursued.
- **2026-10-03: Formulas use standard (Python) precedence** instead of translating around the difference. See the
  changelog for what this changes in old links.
- **2026-10-12: Qiskit is not planned for now.** It is the most widely used framework, but a poor match for the gate
  set: fractional powers become opaque unitaries, and there are no columns.
- **2026-10-18: The qubit limit stays at 16 until it is measured on a GPU.** In headless Chromium's software renderer
  (SwiftShader), one simulation of a QFT circuit like the `test_perf` ones took about 0.6 s at 16 qubits, 1.4 s at 18
  and 6.2 s at 20, against the 75 ms goal at 16 qubits. Painting took 0.1-0.3 s. Raising the limit to 20 made the
  16-qubit perf tests about 10-20% slower. Mesa's llvmpipe, a faster software renderer, took 50 ms at 16 qubits,
  0.2 s at 18 and 0.9 s at 20, and the limit of 20 cost it only about 2.5% at 16 qubits. A GPU could change the
  picture, but none was available to measure.
- **2026-10-18: WebGL2 is used when the browser has it,** with WebGL1 as the fallback and `?webgl=1` to force it. The
  perf tests ran as fast on either version, and the unit tests run on both.
- **Exactness over coverage.** A gate is written in an external language only when the matrices are identical,
  including global phase, and the line reads back as the same column. Otherwise it stays a `@qb` comment.

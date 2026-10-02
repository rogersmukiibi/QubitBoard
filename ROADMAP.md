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

- **Qiskit**, mainly for export. It is the most widely used framework, but a poor match for the gate set (fractional
  powers become opaque unitaries, and there are no columns).
- **OpenQASM 3: `pow @`, `gphase`, `U` and gate definitions.** The reader rejects them today. Supporting them would let
  fractional powers be written as QASM.

### Documentation

- Retake `doc/MANUAL_code-panel.png`: it shows the QubitBoard language as the default.

## Known issues

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
- **Exactness over coverage.** A gate is written in an external language only when the matrices are identical,
  including global phase, and the line reads back as the same column. Otherwise it stays a `@qb` comment.

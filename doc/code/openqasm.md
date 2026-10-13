# OpenQASM 3

OpenQASM is the standard text format for quantum circuits, used by Qiskit and many other tools.
Choosing **OpenQASM 3** in the [code panel](index.md) writes the circuit as QASM, and you can also paste in QASM (OpenQASM 2 works too) and run it.

## How gates are written

When writing a circuit as QASM, QubitBoard only uses a QASM gate when it matches QubitBoard's gate *exactly*, including global phase, since that matters once a gate is controlled (see [Gate powers](../reference/conventions.md#gate-powers)):

| QubitBoard | OpenQASM |
|------------|----------|
| H, X, Y, Z | `h`, `x`, `y`, `z` |
| Z^½, Z^-½, Z^¼, Z^-¼ (S, S⁻¹, T, T⁻¹) | `s`, `sdg`, `t`, `tdg` |
| X^½, X^-½ | `sx`, `inv @ sx` |
| Rx, Ry, Rz formula gates with a constant angle | `rx(θ)`, `ry(θ)`, `rz(θ)` |
| Z^f(t) formula gate with a constant exponent | `p(θ)` |
| Swap | `swap` |
| Controls and anti-controls | `cx`, `ccx`, `cz`, ..., or `ctrl @` and `negctrl @` |
| Measurement | `measure` |

## QubitBoard-only gates

Everything else (displays, arithmetic, postselection, X/Y-axis controls, time-varying gates, and so on) is written on a `// @qb` comment line in [the QubitBoard language](qubitboard-language.md), e.g. `// @qb Chance2 q[0]`.
Other QASM tools ignore these lines, but QubitBoard reads them back, so nothing is lost when you run the code.

## Reading QASM

When reading QASM, QubitBoard understands:

- `qubit[n] q;` and `qreg q[n];` (several registers are fine; if you leave out the declaration, a register called `q` is assumed);
- the gates in the table above, plus `id`, `phase`, `u1`, `cy`, `ch`, `crx`, `cry`, `crz`, `cp`, `cphase` and `cswap`;
- the `ctrl @`, `negctrl @` and `inv @` modifiers, including counts like `ctrl(2) @`;
- `measure q[0];`, `c[0] = measure q[0];` and `measure q[0] -> c[0];`, and whole registers like `h q;` or `measure q -> c;`;
- angles using `pi` (or `π`), numbers, `+ - * / **` and `sin`, `cos`, `tan`, `exp`, `ln`, `sqrt`.

`OPENQASM`, `include`, `bit`/`creg` declarations and `barrier` are accepted and ignored.
Classical control (`if`), loops, `reset`, gate definitions, `U`/`u3`-style gates and the `pow @` modifier aren't supported.

### Columns

**Each line is one column.**
Statements on separate lines always go in separate columns.
Statements on the same line share a column when they don't touch the same qubits and have the same controls; otherwise they are split into consecutive columns.

# Cirq

[Cirq](https://quantumai.google/cirq) is Google's Python library for quantum circuits, and it is the default language of the [code panel](index.md).
The code is ordinary Cirq: copy it into a Python file or notebook and it runs as it is.
You can also paste Cirq code into the panel and run it.

Each line of the circuit is one column:

```python
import cirq
import sympy

# One line per column. "# @qb" lines hold QubitBoard-only gates; Cirq ignores them.
t = sympy.Symbol('t')  # QubitBoard's time, which runs from -1 to 1
q = cirq.LineQubit.range(3)

circuit = cirq.Circuit([
    cirq.Moment(cirq.H(q[0]), cirq.X(q[2])**0.25),
    cirq.Moment(cirq.X(q[1]).controlled_by(q[0])),
    [cirq.X(q[1]).controlled_by(q[0]), cirq.Z(q[2]).controlled_by(q[0])],
    cirq.Moment(cirq.rz(sympy.pi * t**2)(q[2])),
    # @qb Chance3 q[0]
])
```

- `q[0]` is the top wire.
- A column is a `cirq.Moment`. The exception is a column where several gates share the same controls: Cirq doesn't allow a control qubit to be used twice in one moment, so that column is written as a bracketed list of operations, as in the third line above.

## How gates are written

QubitBoard only uses a Cirq gate when it matches QubitBoard's gate *exactly*, including global phase (see [Gate powers](../reference/conventions.md#gate-powers)):

| QubitBoard | Cirq |
|------------|------|
| H, X, Y, Z, Swap, Measure | `cirq.H`, `cirq.X`, `cirq.Y`, `cirq.Z`, `cirq.SWAP`, `cirq.measure` |
| Z^½, Z^-½, Z^¼, Z^-¼ (S, S⁻¹, T, T⁻¹) | `cirq.S`, `cirq.S**-1`, `cirq.T`, `cirq.T**-1` |
| Other fixed powers, such as X^½, Y^-¼, Z^⅓ | `cirq.X(q)**0.5`, `cirq.Y(q)**-0.25`, `cirq.Z(q)**(1/3)` |
| Controls and anti-controls | `.controlled_by(q[0], q[1], control_values=[1, 0])` |
| Formula gates X^f(t), Y^f(t), Z^f(t) | `cirq.X(q)**(formula)` |
| Formula gates Rx(f(t)), Ry(f(t)), Rz(f(t)) | `cirq.rx(formula)(q)`, `cirq.ry(...)`, `cirq.rz(...)` |
| Spinning gates X^t, X^-t, ... | `cirq.X(q)**(t + 1)`, `cirq.X(q)**(-(t + 1))` |
| Spinning gates e^-iXt, e^iXt, ... | `cirq.rx(2*sympy.pi*(t + 1))(q)`, `cirq.rx(-2*sympy.pi*(t + 1))(q)` |
| QFT, QFT† | `cirq.qft(*reversed(q[0:3]))`, with `inverse=True` for QFT† |
| Grad^½, Grad^-½ | `cirq.PhaseGradientGate(num_qubits=3, exponent=0.5)(*reversed(q[0:3]))` |
| i, -i, -1, √i, √-i | `cirq.global_phase_operation(1j)`, and so on |
| Custom gates made from a unitary matrix | `gate_name = cirq.MatrixGate(np.array([[...]]), name='...')`, used as `gate_name(q[0])` |

### Time

`t` is the time variable of QubitBoard's formula gates, which runs from -1 to 1.
The spinning gates make a full turn over that range, which is why X^t is written `cirq.X(q)**(t + 1)`.
To run the code in Cirq, give `t` a value with `cirq.resolve_parameters(circuit, {'t': 0.5})`.

### Qubit order

Cirq's multi-qubit gates treat their first qubit as the high bit, while QubitBoard's top wire is the low bit.
That is why gates covering several wires list their qubits from the bottom up, with `*reversed(q[0:3])`.
For the same reason, Cirq prints a state as `|q0 q1 q2⟩` while QubitBoard's kets read `|q2 q1 q0⟩`.

### Formulas

Formulas follow the same rules as Python: `-t^2` means -(t²) and `2^3^2` means 2^(3²).
A formula is kept on a `# @qb` line only when it uses something Python doesn't have, such as `2pi` without a space, `sin pi` without parentheses, or the imaginary unit `i`.

## QubitBoard-only gates

Everything else is written on a `# @qb` comment line in [the QubitBoard language](qubitboard-language.md), e.g. `# @qb Chance3 q[0]`.
Cirq ignores these lines, but QubitBoard reads them back, so nothing is lost when you run the code.
This covers displays, postselection, arithmetic and input gates, bit-reordering gates, initial states, custom gates made from a circuit, and the following, which are planned for a later version: X/Y-axis controls, parity controls and the detector gates.

## Reading Cirq

When reading Cirq, QubitBoard understands a flat program: qubit declarations, custom gate definitions and one circuit.

- Qubits: `q = cirq.LineQubit.range(n)`, `a, b = cirq.LineQubit.range(2)` and `cirq.LineQubit(i)`. If you leave out the declaration, qubits called `q` are assumed.
- The circuit: `cirq.Circuit([...])` or `cirq.Circuit(...)` on one line or many, holding moments, lists or plain operations, and `circuit.append(...)`.
- Gates: everything in the table above, plus `cirq.CNOT`, `cirq.CX`, `cirq.CZ`, `cirq.CCX`, `cirq.TOFFOLI`, `cirq.CCZ`, `cirq.CSWAP`, `cirq.FREDKIN`, `gate.on(...)`, `gate.on_each(...)`, `cirq.XPowGate(exponent=...)` and `cirq.Rx(rads=...)`.
- Angles and exponents: numbers, `t`, `+ - * / **`, and `pi`, `E`, `sin`, `cos`, `tan`, `asin`, `acos`, `atan`, `sqrt`, `exp` and `log` from `sympy`, `np` or `math`.

`import` and `print(...)` lines are accepted and ignored.
Loops, functions, `if` and other Python statements aren't supported, and neither are other Cirq gates (such as `cirq.ISWAP`) or qubit types (such as `cirq.GridQubit`).

### Columns

Statements on separate lines always go in separate columns.
Operations on the same line share a column when they don't touch the same qubits and have the same controls; otherwise they are split into consecutive columns.

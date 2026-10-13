---
pageClass: gate-reference
---

# Top toolbox

The top toolbox holds the gates you will use most: probes, displays and single-qubit rotations.
The sections below are its groups, from left to right.
[Gates](index.md) explains the table columns.

![The top toolbox](../images/top-toolbox.png)

## Probes

Gates that examine a qubit or condition on it, instead of rotating it.

| Gate | Name | Id | What it does |
|------|------|----|--------------|
| ![Measurement Gate](../images/gates/measure.png) | Measurement Gate | `Measure` | Measures whether a qubit is ON or OFF, without conditioning on the result. |
| ![Postselect Off](../images/gates/postoff.png) | Postselect Off | `\|0⟩⟨0\|` or `postoff` | Keeps OFF states, discards/retries ON states. |
| ![Postselect On](../images/gates/poston.png) | Postselect On | `\|1⟩⟨1\|` or `poston` | Keeps ON states, discards/retries OFF states. |
| ![Anti-Control](../images/gates/negctrl.png) | Anti-Control | `◦` or `negctrl` | Conditions on a qubit being OFF. Gates in the same column only apply to states meeting the condition. |
| ![Control](../images/gates/ctrl.png) | Control | `•` or `ctrl` | Conditions on a qubit being ON. Gates in the same column only apply to states meeting the condition. |

- **Measurement.** A measured qubit can't be unmeasured. [Measurement and detectors](../guide/measurement.md) explains how this gate differs from a detector.
- **Postselection.** A postselection gate keeps only the part of the state where the qubit has the given value, as if the experiment were repeated until that outcome came up. Its matrix is a projector: `{{1, 0}, {0, 0}}` for Postselect Off and `{{0, 0}, {0, 1}}` for Postselect On.
- **Controls.** A column can hold any number of controls, and they apply to every other gate in the column, displays included. To make a CNOT, put a control and an X gate in the same column. Controls along the X and Y axes are in the bottom toolbox, under [X/Y Probes](bottom-toolbox.md#x-y-probes).

## Displays

Displays show the state at the point where you place them. They don't change it.
[Displays](../guide/displays.md) describes each one, with pictures.

| Gate | Name | Id | Sizes | What it does |
|------|------|----|-------|--------------|
| ![Density Matrix Display](../images/gates/density.png) | Density Matrix Display | `Density` | 1–8 | Shows the density matrix of the local mixed state of some wires. |
| ![Bloch Sphere Display](../images/gates/bloch.png) | Bloch Sphere Display | `Bloch` | 1 | Shows a wire's local state as a point on the Bloch sphere. |
| ![Probability Display](../images/gates/chance.png) | Probability Display | `Chance` | 1–16 | Shows chances of outcomes if a measurement was performed. |
| ![Amplitude Display](../images/gates/amps2.png) | Amplitude Display | `Amps2` | 1–16 | Shows the amplitudes of some wires, if separable. |

- Put controls in the same column as a display to see conditional states, probabilities or amplitudes.
- The Probability Display is the one the guide calls the chance display.
- A one-wire density or probability display has no number in its id; larger ones do, such as `Density2` and `Chance3`. Amplitude displays always have one, from `Amps1` to `Amps16`.

## Half Turns

The Pauli gates, the Hadamard gate and Swap. Each of these is its own inverse.

| Gate | Name | Id | Matrix | What it does |
|------|------|----|--------|--------------|
| ![Pauli Z Gate](../images/gates/z.png) | Pauli Z Gate | `Z` | `{{1, 0}, {0, -1}}` | The phase flip gate. Negates phases when the qubit is ON. |
| ![Swap Gate (Half)](../images/gates/swap.png) | Swap Gate [Half] | `Swap` | | Swaps the values of two qubits. |
| ![Pauli Y Gate](../images/gates/y.png) | Pauli Y Gate | `Y` | `{{0, -i}, {i, 0}}` | A combination of the X and Z gates. |
| ![Pauli X Gate](../images/gates/x.png) | Pauli X Gate | `X` | `{{0, 1}, {1, 0}}` | The NOT gate. Toggles between ON and OFF. |
| ![Hadamard Gate](../images/gates/h.png) | Hadamard Gate | `H` | `{{√½, √½}, {√½, -√½}}` | Creates simple superpositions. Maps OFF to OFF + ON and ON to OFF − ON, each divided by √2. |

- **Swap** comes in halves: place two in the same column, one on each of the wires to exchange.
- **X** is drawn as ⊕, the usual symbol for the target of a CNOT.

## Quarter Turns

Square roots of the Pauli gates. The two gates in each row of the toolbox are inverses of each other.

| Gate | Name | Id | Matrix | What it does |
|------|------|----|--------|--------------|
| ![√Z Gate](../images/gates/z-1-over-2.png) | √Z Gate | `Z^½` or `Z^1/2` | `{{1, 0}, {0, i}}` | Principal square root of Z. Also known as the S gate. |
| ![Z^-½ Gate](../images/gates/z-minus-1-over-2.png) | Z^-½ Gate | `Z^-½` or `Z^-1/2` | `{{1, 0}, {0, -i}}` | Adjoint square root of Z. |
| ![√Y Gate](../images/gates/y-1-over-2.png) | √Y Gate | `Y^½` or `Y^1/2` | `{{½+½i, -½-½i}, {½+½i, ½+½i}}` | Principal square root of Y. |
| ![Y^-½ Gate](../images/gates/y-minus-1-over-2.png) | Y^-½ Gate | `Y^-½` or `Y^-1/2` | `{{½-½i, ½-½i}, {-½+½i, ½-½i}}` | Adjoint square root of Y. |
| ![√X Gate](../images/gates/x-1-over-2.png) | √X Gate | `X^½` or `X^1/2` | `{{½+½i, ½-½i}, {½-½i, ½+½i}}` | Principal square root of NOT. |
| ![X^-½ Gate](../images/gates/x-minus-1-over-2.png) | X^-½ Gate | `X^-½` or `X^-1/2` | `{{½-½i, ½+½i}, {½+½i, ½-½i}}` | Adjoint square root of NOT. |

- These are powers of the Pauli gates, not exponentials: S is `{{1, 0}, {0, i}}`, which differs from Rz(π/2) by a global phase. The difference matters once the gate is controlled. See [Gate powers](../reference/conventions.md#gate-powers).

## Eighth Turns

Fourth roots of the Pauli gates. As with the quarter turns, each row of the toolbox is a gate and its inverse.

| Gate | Name | Id | What it does |
|------|------|----|--------------|
| ![Z^¼ Gate](../images/gates/z-1-over-4.png) | Z^¼ Gate | `Z^¼` or `Z^1/4` | Principal fourth root of Z. Also known as the T gate. |
| ![Z^-¼ Gate](../images/gates/z-minus-1-over-4.png) | Z^-¼ Gate | `Z^-¼` or `Z^-1/4` | Adjoint fourth root of Z. |
| ![Y^¼ Gate](../images/gates/y-1-over-4.png) | Y^¼ Gate | `Y^¼` or `Y^1/4` | Principal fourth root of Y. |
| ![Y^-¼ Gate](../images/gates/y-minus-1-over-4.png) | Y^-¼ Gate | `Y^-¼` or `Y^-1/4` | Adjoint fourth root of Y. |
| ![X^¼ Gate](../images/gates/x-1-over-4.png) | X^¼ Gate | `X^¼` or `X^1/4` | Principal fourth root of X. |
| ![X^-¼ Gate](../images/gates/x-minus-1-over-4.png) | X^-¼ Gate | `X^-¼` or `X^-1/4` | Adjoint fourth root of X. |

- The T gate's matrix is `{{1, 0}, {0, √½+√½i}}`: it multiplies the ON amplitude by e^(iπ/4).
- Smaller fixed turns, such as `X^⅛`, exist but aren't in the toolbox. See [Unlisted gates](unlisted-gates.md).

## Spinning

Rotations whose amount changes with time, so the circuit animates.
Over one cycle of [time](index.md#time) each gate goes from doing nothing, through the full Pauli gate halfway, and back to doing nothing.

| Gate | Name | Id | What it does |
|------|------|----|--------------|
| ![Z-Raising Gate (forward)](../images/gates/z-t.png) | Z-Raising Gate (forward) | `Z^t` | Right-handed cycle from no-op to Z. |
| ![Z-Raising Gate (backward)](../images/gates/z-minus-t.png) | Z-Raising Gate (backward) | `Z^-t` | Left-handed cycle from no-op to Z. |
| ![Y-Raising Gate (forward)](../images/gates/y-t.png) | Y-Raising Gate (forward) | `Y^t` | Right-handed cycle from no-op to Y. |
| ![Y-Raising Gate (backward)](../images/gates/y-minus-t.png) | Y-Raising Gate (backward) | `Y^-t` | Left-handed cycle from no-op to Y. |
| ![X-Raising Gate (forward)](../images/gates/x-t.png) | X-Raising Gate (forward) | `X^t` | Right-handed cycle from no-op to X. |
| ![X-Raising Gate (backward)](../images/gates/x-minus-t.png) | X-Raising Gate (backward) | `X^-t` | Left-handed cycle from no-op to X. |

- With `t` running from -1 to 1, the forward gates are the Pauli gate raised to the power `t + 1`, and the backward gates raise it to `-(t + 1)`.
- For a rotation that follows your own formula instead, use the [Formulaic](#formulaic) gates.

## Formulaic

Rotations by an amount that you type as a formula.
Click one of these gates in the circuit to change its formula.

| Gate | Name | Id | Starting formula | What it does |
|------|------|----|------------------|--------------|
| ![Formula Z Rotation](../images/gates/z-ft.png) | Formula Z Rotation | `Z^ft` | `sin(pi t)` | Raises Z to the power given by the formula. |
| ![Formula Rz Gate](../images/gates/rzft.png) | Formula Rz Gate | `Rzft` | `pi t^2` | Rotates around Z by an angle in radians given by the formula. |
| ![Formula Y Rotation](../images/gates/y-ft.png) | Formula Y Rotation | `Y^ft` | `sin(pi t)` | Raises Y to the power given by the formula. |
| ![Formula Ry Gate](../images/gates/ryft.png) | Formula Ry Gate | `Ryft` | `pi t^2` | Rotates around Y by an angle in radians given by the formula. |
| ![Formula X Rotation](../images/gates/x-ft.png) | Formula X Rotation | `X^ft` | `sin(pi t)` | Raises X to the power given by the formula. |
| ![Formula Rx Gate](../images/gates/rxft.png) | Formula Rx Gate | `Rxft` | `pi t^2` | Rotates around X by an angle in radians given by the formula. |

- **What a formula can use.** The constants `e` and `pi`, the functions `cos`, `sin`, `acos`, `asin`, `tan`, `atan`, `ln`, `sqrt` and `exp`, the operators `+ - * / ^`, and the [time](index.md#time) variable `t`.
- **Constant gates.** A formula without `t` gives a fixed gate. `Rzft` with the formula `pi/2` is Rz(π/2).
- **Mistakes.** A formula that can't be read, or that doesn't give a real number, marks the gate "bad formula" until it is fixed.
- **In code.** The formula goes in square brackets after the id, as in `Rzft[pi/2] q2`.
- **Size.** The gate grows wider as the formula gets longer, and takes up that many columns.
- **Alternate.** Dragging with *alt* held gives the same gate with the formula negated.
- **Power or angle.** The `^f(t)` gates and the `R` gates differ by a global phase, which matters once they are controlled. See [Gate powers](../reference/conventions.md#gate-powers).

## Parametrized

Rotations by an amount read from other qubits.
Each one needs [input A](bottom-toolbox.md#inputs): put an **input A** gate in the same column, or a **Set Default A** gate earlier in the circuit.

| Gate | Name | Id | What it does |
|------|------|----|--------------|
| ![Parametrized Z Gate](../images/gates/z-a-over-2-n.png) | Parametrized Z Gate | `Z^(A/2^n)` | Rotates the target by input A / 2ⁿ'th of a half turn around the Z axis. |
| ![Parametrized -Z Gate](../images/gates/z-minus-a-over-2-n.png) | Parametrized -Z Gate | `Z^(-A/2^n)` | Counter-rotates the target by input A / 2ⁿ'th of a half turn around the Z axis. |
| ![Parametrized Y Gate](../images/gates/y-a-over-2-n.png) | Parametrized Y Gate | `Y^(A/2^n)` | Rotates the target by input A / 2ⁿ'th of a half turn around the Y axis. |
| ![Parametrized -Y Gate](../images/gates/y-minus-a-over-2-n.png) | Parametrized -Y Gate | `Y^(-A/2^n)` | Counter-rotates the target by input A / 2ⁿ'th of a half turn around the Y axis. |
| ![Parametrized X Gate](../images/gates/x-a-over-2-n.png) | Parametrized X Gate | `X^(A/2^n)` | Rotates the target by input A / 2ⁿ'th of a half turn around the X axis. |
| ![Parametrized -X Gate](../images/gates/x-minus-a-over-2-n.png) | Parametrized -X Gate | `X^(-A/2^n)` | Counter-rotates the target by input A / 2ⁿ'th of a half turn around the X axis. |

- n is the number of qubits in input A, so the rotation is always less than a half turn.

## Sampling

Detectors measure by sampling: each time the circuit runs they collapse the qubit and report one result.
[Measurement and detectors](../guide/measurement.md#detectors) compares them with the Measurement Gate.

| Gate | Name | Id | What it does |
|------|------|----|--------------|
| ![Z Axis Detector](../images/gates/zdetector.png) | Z Axis Detector | `ZDetector` | Sampled Z-axis measurement. Shows *click* when the target qubit is \|1⟩ and controls are satisfied. |
| ![Z Detect-Control-Reset](../images/gates/zdetectcontrolreset.png) | Z Detect-Control-Reset | `ZDetectControlReset` | Does a sampled Z-axis measurement, controls operations with the result, then resets the target to \|0⟩. |
| ![Y Axis Detector](../images/gates/ydetector.png) | Y Axis Detector | `YDetector` | Sampled Y-axis measurement. Shows *click* when the target qubit is \|0⟩-i\|1⟩ and controls are satisfied. |
| ![Y Detect-Control-Reset](../images/gates/ydetectcontrolreset.png) | Y Detect-Control-Reset | `YDetectControlReset` | Does a sampled Y-axis measurement, controls operations with the result, then resets the target to \|0⟩. |
| ![X Axis Detector](../images/gates/xdetector.png) | X Axis Detector | `XDetector` | Sampled X-axis measurement. Shows *click* when the target qubit is \|0⟩-\|1⟩ and controls are satisfied. |
| ![X Detect-Control-Reset](../images/gates/xdetectcontrolreset.png) | X Detect-Control-Reset | `XDetectControlReset` | Does a sampled X-axis measurement, controls operations with the result, then resets the target to \|0⟩. |

- A detect-control-reset gate acts as a control for the other gates in its column, using the result it sampled.
- Detectors can be controlled and used as often as you like, but the circuit has to be simulated again for every sample.

## Parity

Controls that condition on several qubits at once.

| Gate | Name | Id | What it does |
|------|------|----|--------------|
| ![Parity Control (Z)](../images/gates/zpar.png) | Parity Control (Z) | `zpar` | Includes a qubit's Z observable in the column parity control. |
| ![Parity Control (Y)](../images/gates/ypar.png) | Parity Control (Y) | `ypar` | Includes a qubit's Y observable in the column parity control. |
| ![Parity Control (X)](../images/gates/xpar.png) | Parity Control (X) | `xpar` | Includes a qubit's X observable in the column parity control. |

- Gates in the same column only apply if an odd number of the column's parity controls are satisfied.

---
pageClass: gate-reference
---

# Bottom toolbox

The bottom toolbox holds the more specialized gates: X and Y axis probes, gates that act on several qubits as a number, and global phases.
The sections below are its groups, from left to right.
[Gates](index.md) explains the table columns.

![The bottom toolbox](../images/bottom-toolbox.png)

## X/Y Probes

The controls and postselection gates of the [Probes](top-toolbox.md#probes) group, along the X and Y axes instead of the Z axis.

| Gate | Name | Id | What it does |
|------|------|----|--------------|
| ![X-Axis Anti-Control](../images/gates/xnegctrl.png) | X-Axis Anti-Control | `⊕` or `xnegctrl` | Conditions on a qubit being \|+⟩. |
| ![X-Axis Control](../images/gates/xctrl.png) | X-Axis Control | `⊖` or `xctrl` | Conditions on a qubit being \|-⟩. |
| ![Y-Axis Anti-Control](../images/gates/ynegctrl.png) | Y-Axis Anti-Control | `⊗` or `ynegctrl` | Conditions on a qubit being \|i⟩. |
| ![Y-Axis Control](../images/gates/yctrl.png) | Y-Axis Control | `(/)` or `yctrl` | Conditions on a qubit being \|-i⟩. |
| ![Postselect X-Off](../images/gates/postxoff.png) | Postselect X-Off | `\|+⟩⟨+\|` or `postxoff` | Keeps \|+⟩ states, discards/retries \|-⟩ states. |
| ![Postselect X-On](../images/gates/postxon.png) | Postselect X-On | `\|-⟩⟨-\|` or `postxon` | Keeps \|-⟩ states, discards/retries \|+⟩ states. |
| ![Postselect Y-Off](../images/gates/postyoff.png) | Postselect Y-Off | `\|X⟩⟨X\|` or `postyoff` | Keeps \|i⟩ states, discards/retries \|-i⟩ states. |
| ![Postselect Y-On](../images/gates/postyon.png) | Postselect Y-On | `\|/⟩⟨/\|` or `postyon` | Keeps \|-i⟩ states, discards/retries \|i⟩ states. |

- As with the Z-axis controls, gates in the same column only apply to states meeting the condition.
- An X-axis control is a Z-axis control with a Hadamard gate before and after it.
- **The ids of the four controls don't match their labels.** Each control's id is the symbol drawn on its opposite: the X-axis control is drawn as ⊕ but its id is `⊖`. The plain-text names avoid the confusion.
- These controls aren't common in papers or textbooks. See [XYZ controls](../reference/conventions.md#xyz-controls).

## Order

Gates that treat a block of qubits as a number to count with, or that move qubits around.

| Gate | Name | Id | Sizes | What it does |
|------|------|----|-------|--------------|
| ![Counting Gate](../images/gates/counting3.png) | Counting Gate | `Counting3` | 1–16 | Adds an increasing little-endian count into a block of qubits. |
| ![Down Counting Gate](../images/gates/uncounting3.png) | Down Counting Gate | `Uncounting3` | 1–16 | Subtracts an increasing little-endian count from a block of qubits. |
| ![Reverse Order](../images/gates/rev2.png) | Reverse Order | `rev2` | 2–16 | Swaps bits into the opposite order. |
| ![Left Rotate](../images/gates/shl-3.png) | Left Rotate | `<<3` | 2–16 | Rotates bits downward. |
| ![Right Rotate](../images/gates/shr-3.png) | Right Rotate | `>>3` | 2–16 | Rotates bits upward. |
| ![Interleave](../images/gates/weave6.png) | Interleave | `weave6` | 4–16 | Re-orders blocks of bits into stripes of bits. |
| ![Deinterleave](../images/gates/split6.png) | Deinterleave | `split6` | 4–16 | Re-orders stripes of bits into blocks of bits. |

- **Counting.** The count grows with [time](index.md#time): over one cycle an n-qubit counting gate adds 0, then 1, and so on up to 2ⁿ − 1.
- **Rotating.** Left Rotate moves each qubit's value one wire down, and the bottom wire's value wraps around to the top. Right Rotate is its inverse.
- **Interleaving.** Interleave takes the top half and the bottom half of its wires and alternates them. Deinterleave is its inverse.
## Frequency

The quantum Fourier transform and the phase gradient gates.

| Gate | Name | Id | Sizes | What it does |
|------|------|----|-------|--------------|
| ![Fourier Transform Gate](../images/gates/qft2.png) | Fourier Transform Gate | `QFT2` | 1–16 | Transforms to/from phase frequency space. |
| ![Inverse Fourier Transform Gate](../images/gates/qftdag2.png) | Inverse Fourier Transform Gate | `QFT†2` or `QFTdag2` | 1–16 | Transforms from/to phase frequency space. |
| ![Half Gradient Gate](../images/gates/phasegradient2.png) | Half Gradient Gate | `PhaseGradient2` | 1–16 | Phases the target by an amount proportional to its value. |
| ![Inverse Half Gradient Gate](../images/gates/phaseungradient2.png) | Inverse Half Gradient Gate | `PhaseUngradient2` | 1–16 | Counter-phases the target by an amount proportional to its value. |
| ![Cycling Gradient Gate](../images/gates/grad-t2.png) | Cycling Gradient Gate | `grad^t2` | 1–16 | Phases the target by a cycling amount proportional to its value. |
| ![Inverse Cycling Gradient Gate](../images/gates/grad-minus-t2.png) | Inverse Cycling Gradient Gate | `grad^-t2` | 1–16 | Counter-phases the target by a cycling amount proportional to its value. |

- **Half gradient.** On n qubits, the state with value k is multiplied by e^(iπk/2ⁿ). For two qubits that is the diagonal matrix with entries 1, e^(iπ/4), i and e^(3iπ/4).
- **Cycling gradient.** The same idea, with a phase that grows with [time](index.md#time) instead of being fixed.
- The values are read with the top wire as the low bit. See [Qubit order](../reference/conventions.md#qubit-order).

## Inputs

Gates that supply the values A, B and R to gates in the other groups.
They have no effect of their own.

| Gate | Name | Id | Sizes | What it does |
|------|------|----|-------|--------------|
| ![Input Gate (A)](../images/gates/inputa2.png) | Input Gate [A] | `inputA2` | 1–16 | Temporarily uses some qubits as input A. |
| ![Set Default A](../images/gates/seta.png) | Set Default A | `setA` | | Sets a default value for input A, for when an inline input isn't given. |
| ![Input Gate (B)](../images/gates/inputb2.png) | Input Gate [B] | `inputB2` | 1–16 | Temporarily uses some qubits as input B. |
| ![Set Default B](../images/gates/setb.png) | Set Default B | `setB` | | Sets a default value for input B, for when an inline input isn't given. |
| ![Input Gate (R)](../images/gates/inputr2.png) | Input Gate [R] | `inputR2` | 1–16 | Temporarily uses some qubits as input R. |
| ![Set Default R](../images/gates/setr.png) | Set Default R | `setR` | | Sets a default value for input R, for when an inline input isn't given. |

- **Input gates** mark the qubits they cover as a value for the other gates in the same column.
- **Set Default gates** give a fixed number instead, which applies to the columns after them. Click the gate in the circuit to enter a whole number from 0 to 65535. In code the number goes in square brackets, as in `setA[5]`.
- **Which gates use them.** [Parametrized](top-toolbox.md#parametrized) rotations use A. [Arithmetic](#arithmetic) uses A and B. [Compare](#compare) uses A and B. [Modular](#modular) uses A, B and R.
- A gate that is missing one of its inputs is disabled until the input is supplied.
- Inputs are read with the top wire as the low bit. Input gates with the opposite order exist but aren't in the toolbox. See [Unlisted gates](unlisted-gates.md).

## Arithmetic

Gates that treat the qubits they cover as a little-endian number and do arithmetic on it.
Results wrap around: an n-qubit gate works modulo 2ⁿ.
[Arithmetic](../guide/arithmetic.md) in the guide gives a worked description.

| Gate | Name | Id | Sizes | What it does |
|------|------|----|-------|--------------|
| ![Increment Gate](../images/gates/inc2.png) | Increment Gate | `inc2` | 1–16 | Adds 1 to the little-endian number represented by a block of qubits. |
| ![Decrement Gate](../images/gates/dec2.png) | Decrement Gate | `dec2` | 1–16 | Subtracts 1 from the little-endian number represented by a block of qubits. |
| ![Addition Gate (input A)](../images/gates/plus-a2.png) | Addition Gate [input A] | `+=A2` | 1–16 | Adds input A into the qubits covered by this gate. |
| ![Subtraction Gate (input A)](../images/gates/minus-a2.png) | Subtraction Gate [input A] | `-=A2` | 1–16 | Subtracts input A out of the qubits covered by this gate. |
| ![Multiply-Add Gate (Inputs A, B)](../images/gates/plus-ab2.png) | Multiply-Add Gate [Inputs A, B] | `+=AB2` | 1–16 | Adds the product of inputs A and B into the qubits covered by this gate. |
| ![Multiply-Subtract Gate (Inputs A, B)](../images/gates/minus-ab2.png) | Multiply-Subtract Gate [Inputs A, B] | `-=AB2` | 1–16 | Subtracts the product of inputs A and B out of the qubits covered by this gate. |
| ![Multiplication Gate](../images/gates/times-a2.png) | Multiplication Gate | `*A2` | 1–16 | Multiplies the target by input A. |
| ![Inverse Multiplication Gate](../images/gates/over-a2.png) | Inverse Multiplication Gate | `/A2` | 1–16 | Inverse-multiplies the target by input A (modulo 2ⁿ). |

- The two multiplication gates have no effect when input A is even, because multiplying by an even number modulo 2ⁿ can't be undone.
- More arithmetic gates, such as XOR and square-accumulate, are listed under [Unlisted gates](unlisted-gates.md).

## Compare

Single-qubit gates that toggle their qubit when a comparison between [inputs](#inputs) A and B holds.

| Gate | Name | Id | What it does |
|------|------|----|--------------|
| ![Less-Than Gate](../images/gates/a-lt-b.png) | Less-Than Gate | `^A<B` | Toggles a qubit if input A is less than input B. |
| ![Greater-Than Gate](../images/gates/a-gt-b.png) | Greater-Than Gate | `^A>B` | Toggles a qubit if input A is greater than input B. |
| ![At-Most Gate](../images/gates/a-le-b.png) | At-Most Gate | `^A<=B` | Toggles a qubit if input A is at most input B. |
| ![At-Least Gate](../images/gates/a-ge-b.png) | At-Least Gate | `^A>=B` | Toggles a qubit if input A is at least input B. |
| ![Equality Gate](../images/gates/a-eq-b.png) | Equality Gate | `^A=B` | Toggles a qubit if input A is equal to input B. |
| ![Inequality Gate](../images/gates/a-ne-b.png) | Inequality Gate | `^A!=B` | Toggles a qubit if input A isn't equal to input B. |

- The alternate of each gate is its opposite: Less-Than and At-Least, Greater-Than and At-Most, Equality and Inequality.

## Modular

Arithmetic modulo [input R](#inputs) instead of modulo a power of two.
These gates only affect values less than R; larger values are left as they are, which keeps the operation reversible.

| Gate | Name | Id | Sizes | What it does |
|------|------|----|-------|--------------|
| ![Modular Increment Gate](../images/gates/incmodr2.png) | Modular Increment Gate | `incmodR2` | 1–16 | Adds 1 into the target, but wraps R-1 to 0. |
| ![Modular Decrement Gate](../images/gates/decmodr2.png) | Modular Decrement Gate | `decmodR2` | 1–16 | Subtracts 1 out of the target, but wraps 0 to R-1. |
| ![Modular Addition Gate](../images/gates/plus-amodr2.png) | Modular Addition Gate | `+AmodR2` | 1–16 | Adds input A into the target, mod input R. |
| ![Modular Subtraction Gate](../images/gates/minus-amodr2.png) | Modular Subtraction Gate | `-AmodR2` | 1–16 | Subtracts input A out of the target, mod input R. |
| ![Modular Multiplication Gate](../images/gates/times-amodr2.png) | Modular Multiplication Gate | `*AmodR2` | 1–16 | Multiplies the target by input A mod input R. |
| ![Modular Division Gate](../images/gates/over-amodr2.png) | Modular Division Gate | `/AmodR2` | 1–16 | Inverse-multiplies the target by input A mod input R. |
| ![Modular Power Multiplication Gate](../images/gates/times-btoamodr2.png) | Modular Power Multiplication Gate | `*BToAmodR2` | 1–16 | Multiplies the target by input B raised to the input A mod input R. |
| ![Modular Power Division Gate](../images/gates/over-btoamodr2.png) | Modular Power Division Gate | `/BToAmodR2` | 1–16 | Inverse-multiplies the target by input B raised to the input A mod input R. |

- The four multiplication and division gates have no effect when the multiplication would be irreversible, which happens when the multiplier shares a factor with R.

## Scalar

Gates that multiply the whole state by a number, plus the spacer.
A global phase has no visible effect on its own, but it becomes a relative phase once the gate is controlled.

| Gate | Name | Id | What it does |
|------|------|----|--------------|
| ![Spacer](../images/gates/spacer.png) | Spacer | `…` or `spacer` | A gate with no effect. |
| ![Nothing Gate](../images/gates/0.png) | Nothing Gate | `0` | Destroys the universe. |
| ![Ne-Gate](../images/gates/negate.png) | Ne-Gate | `NeGate` | Negates all amplitudes. |
| ![Imaginary Gate](../images/gates/i.png) | Imaginary Gate | `i` | Phases everything by i. |
| ![Anti-Imaginary Gate](../images/gates/minus-i.png) | Anti-Imaginary Gate | `-i` | Phases everything by -i. |
| ![Half Imaginary Gate](../images/gates/sqrti.png) | Half Imaginary Gate | `√i` or `sqrti` | Phases everything by √i. |
| ![Half Anti-Imaginary Gate](../images/gates/sqrt-minus-i.png) | Half Anti-Imaginary Gate | `√-i` or `sqrt-i` | Phases everything by √-i. |

- **Spacer.** Use it to hold a position in a column without doing anything there.
- **Nothing Gate.** A joke gate. Its matrix is all zeros, so every amplitude becomes 0.
- **Ne-Gate.** Multiplies the state by -1.

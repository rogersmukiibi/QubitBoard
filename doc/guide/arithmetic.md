# Arithmetic

QubitBoard includes several gates for performing arithmetic.
For example, the **+1** gate will increment a group of qubits.
More specifically, it will permute the computational basis states such that |0..00⟩ goes to |0..01⟩ which goes to |0..10⟩ which goes to |0..11⟩ and so forth until |1..11⟩ which goes to |0..00⟩.

## Inputs and effects

For flexibility, many arithmetic gates are split into two parts: the *input* and the *effect*.
For example, the **+A** gate is the effect part of an addition.
It must be accompanied by an **Input A** gate in the same column.
Together they form an operation that sends each computational basis state |A⟩|E⟩ to |A⟩|E+A (mod 2^len(E))⟩.
The input value A can also be a classical constant specified by a **Set Default A** gate.

## See also

- [Qubit order](../reference/conventions.md#qubit-order) explains which wire is the low bit of a number.
- The [Inputs](../gates/toolbox.md#inputs), [Arithmetic](../gates/toolbox.md#arithmetic), [Compare](../gates/toolbox.md#compare) and [Modular](../gates/toolbox.md#modular) groups of the toolbox list every arithmetic gate.
- [Unlisted gates](../gates/unlisted-gates.md) lists more arithmetic gates that aren't in the toolbox.

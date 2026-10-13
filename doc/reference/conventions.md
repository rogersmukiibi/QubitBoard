# Conventions

## Gate powers

QubitBoard prefers to use Pauli gates that have been raised to a power instead of exponentiated.
For example, QubitBoard's toolbox uses S = Z^(1/2) = diag(1, i) instead of Rz(pi/2) = exp(-i Z pi/2) = diag((1-i)/√2, (1+i)/√2).
These gates are equivalent up to global phase, but have different effects when controlled.
Raising to a power is more natural when performing circuit decompositions, and has the benefit of passing through the usual Pauli gates instead of the Pauli gates times i.
In the world beyond QubitBoard, exponentiation is more common (presumably because that is how you compute the unitary effect of applying a Hamiltonian to a physical system for a certain amount of time).

## XYZ controls

QubitBoard has X and Y basis controls in addition to the usual Z basis controls.
For example, the ⊕ control conditions on the control qubit being in the |-⟩ state.
It is equivalent to a Z control conjugated by Hadamards (i.e. H●H).
These controls were introduced by QubitBoard and are not common in papers or textbooks.

## Qubit order

When doing arithmetic or converting bits to integers, QubitBoard orders the qubits from least significant at the top to most significant at the bottom.
If the top qubit is ON and the next qubit is OFF, then as a pair they represent the state |01⟩ (the number 1) instead of the state |10⟩ (the number 2).
This is the opposite of the convention used in Mike and Ike.

- Top wire is the low bit. Bottom wire is the high bit.
- Kets are big-endian. |00101⟩ is 5, not 20.
- Listed/grided values are in ascending row-major order from top left to bottom right.

## Coordinates

- Right-handed
- X is +right/-left
- Y is +forward/-backward
- Z is +up/-down

## Colors

| Color | Meaning |
|-------|---------|
| Blue | amplitudes |
| Green | probabilities / densities |
| Yellow | change / varying |
| Orange | focused |
| Red | error / attention |

# Unlisted gates

QubitBoard has gates that aren't included in the [toolbox](toolbox.md).
You can only access these gates by typing their ID, either in the [code panel](../code/index.md) with the [QubitBoard language](../code/qubitboard-language.md) selected (e.g. `+cntA2 q0`) or into the [URL](../reference/circuit-links.md).
These gates include, but are not limited to:

| Gate id | What it is |
|---------|------------|
| `"^=A2"` | The XOR gate. |
| `"+=AA2"` | The square-accumulate gate. |
| `"+cntA2"` | The Hamming-weight-accumulate gate. Adds the number of 1s in input A into the target register. |
| `"+ABmodR2"` | The modular multiply-accumulate gate. |
| `"revinputA2"` and `"revinputB2"` | Input gates with reversed qubit order. |
| `"Flip<A2"` | Pivot-flip gate. Reverses the order of computational basis states less than the pivot A. |
| `"__unstable__UniversalNot"` | The non-physical single qubit "universal not" gate that inverts through the origin of the Bloch sphere instead of through one its axes. See if you can figure out how it would allow FTL communication if it existed in reality! |
| `"__error__"` | A gate that purposefully causes an error inside the simulator for testing purposes. |
| `"X^⅛"`, `"Z^⅟₁₆"`, and similar | Fixed-angle rotations obsoleted by the custom formula gates. Many of these gates appear in the example QFT circuit. |
| `"Sample2"` | A display that showed probabilistic samples. Obsoleted by detectors, which actually sample. |

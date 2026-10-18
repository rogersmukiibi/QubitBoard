# The QubitBoard language

This is QubitBoard's own language.
It can describe everything QubitBoard can simulate (displays, arithmetic, inputs, postselection, custom gates and initial states included), so converting between a circuit and its code never loses anything.

Each line is one column of the circuit, and the gates listed on a line act at the same time:

```
# Anything after a '#' is a comment.
qubits 3            # the number of qubits (optional)
init q2 = +         # start q2 in |+⟩ instead of |0⟩: 0, 1, +, -, i or -i
H q0
ctrl q0, X q1       # a CNOT: controls apply to every gate on the same line
Rzft[pi/2] q2       # arguments go in square brackets
QFT3 q0             # a multi-qubit gate is placed by its top qubit, so this covers q0..q2
Chance3 q0          # a chance display over q0..q2
```

## Qubits

Qubits are written `q0`, `q1`, ... (or `q[0]`, `q[1]`, ...), with `q0` at the top.

## Gate names

Gate names are QubitBoard's gate ids, which are also used in [circuit links](../reference/circuit-links.md).
Upper and lower case can usually be mixed, so `h q0` works too.

Ids with special characters have plain-text names, and either form works:

| Gate id | Name in code |
|---------|--------------|
| `•`, `◦` | `ctrl`, `negctrl` |
| `⊖`, `⊕`, `(/)`, `⊗` | `xctrl`, `xnegctrl`, `yctrl`, `ynegctrl` |
| `Z^½`, `X^-¼`, `Z^⅟₁₆` | `Z^1/2`, `X^-1/4`, `Z^1/16` |
| `QFT†3` | `QFTdag3` |
| `\|0⟩⟨0\|`, `\|1⟩⟨1\|` | `postoff`, `poston` |
| `…` | `spacer` |

The id of every toolbox gate is listed under [Gates](../gates/index.md).
Gates that aren't in the toolbox can be used by their id too. See [Unlisted gates](../gates/unlisted-gates.md).

## Arguments

Gates that take a value have it in square brackets: formulas for formula gates, such as `Rxft[pi t^2]`, and numbers for the input-setting gates, such as `setA[5]`.

## Custom gates

A custom gate is defined on a `gate` line holding its JSON before it's used:

```
gate ~inv = {"id":"~inv","name":"Inv","matrix":"{{0,1},{1,0}}"}
~inv q0
```

These lines appear automatically for custom gates made with **Make Gate**.

## Columns

- A line holding just `skip` is an empty column. It only appears, and only has an effect, under a wide gate such as an amplitude display or a formula gate, where it keeps the next gates from moving left into the space beside it. Anywhere else an empty column is removed.
- Two gates on one line can't overlap. For example, `QFT3 q0, H q1` is an error, because QFT3 on q0 already covers q1.
- Circuits typed in code are tidied up the same way as dragged ones. For example, a gate typed right after a wide gate (such as a formula gate) moves over to make room, exactly as it would if you dropped it there.

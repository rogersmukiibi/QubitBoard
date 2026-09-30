QubitBoard is a drag and drop quantum circuit simulator, great for manipulating and exploring small quantum circuits.
QubitBoard's visual style gives a reasonably intuitive feel of what is happening, state displays update in real time as you change the circuit, and the general experience is fast and interactive.

Using QubitBoard mostly amounts to dragging gates from the toolboxes, dropping those gates into the circuit, and looking at the state displays inside and to the right of the circuit.
If you prefer, you can also write the circuit as code in the [code panel](#the-code-panel).
A live version of QubitBoard is available at [rogersmukiibi.com/QubitBoard](https://rogersmukiibi.com/QubitBoard/), but you can also get the code from [github.com/rogersmukiibi/QubitBoard](https://github.com/rogersmukiibi/QubitBoard) and build your own version.

QubitBoard is free and open source software. The source code is available under a permissive Apache license that allows anyone to make and distribute their own modified version.
QubitBoard is a fork of [Quirk](https://github.com/Strilanc/Quirk).

# The Main Menu

When you open QubitBoard with an empty circuit, the following overlay is shown:

![QubitBoard main menu](https://github.com/rogersmukiibi/QubitBoard/blob/master/doc/MANUAL_menu.png)

This is QubitBoard's main menu.
It provides links to a tutorial video, the source code, and this manual.
It also includes several example circuits that demonstrate common quantum algorithms, experiments, and circuits.

You can dismiss this overlay by clicking "Edit Circuit", pressing the Escape key, or clicking anywhere outside of the overlay.

# The Circuit Editing Area

Almost all the time you spend in QubitBoard will be spent staring at the circuit editing area:

![QubitBoard circuit editing area](https://github.com/rogersmukiibi/QubitBoard/blob/master/doc/MANUAL_circuit-editing-area.png)

Along the top and bottom are the toolboxes, which contain a variety of quantum gates.
The middle area is showing the circuit.
Each of the long horizontal lines through this area represents a qubit, and objects placed on these lines represent operations to apply to the qubits, working from left to right.
In the very center of the circuit area there are several state displays showing final state of the quantum system.
Docked at the bottom of the window is the [code panel](#the-code-panel), which shows the circuit as code.

# Basic Circuit Editing

QubitBoard tries to make it easy to edit circuits.
Here are the basic available actions:

- **Saving a Circuit**
    Bookmark the page.
    As you edit the circuit, QubitBoard actively rewrites the URL in the address bar so that it points at the current circuit.
    You can also save the circuit by using the Export button above the circuit editing area.
    You can export an escaped link, an offline copy of QubitBoard defaulting to the current circuit, a JSON representation of the current circuit, or a JSON representation of the entire simulator output.
- **Gate Dragging**
    Gates can be added to the circuit by dragging them out of the toolbox and into the circuit.
    Gates can be removed from the circuit by dragging them outside of the circuit area.
- **Adding a Qubit**
    Whenever you are dragging a gate, an extra qubit line will appear at the bottom of the circuit.
    If you drop the gate on this new qubit line, it will become permanently added.
    To add more qubits, keep picking up a gate and dropping it on the new qubit line that appears.
    To reduce the number of qubits, remove all gates from the bottom-most qubit line.
    The maximum number of qubits is 16.
- **Gate Duplicating**
    You can make a copy of a gate in the circuit by holding *shift* before dragging the gate.
- **Gate Deleting**
    You can remove a gate by dragging it out of the circuit, but you can also simply middle-click the gate.
- **Column Dragging**
    You can drag entire columns of gates by holding the *control* key before dragging a gate in that column.
- **Column Duplicating**
    You can duplicate entire columns of gates by holding both the *shift* key and the *control* key before dragging a gate in that column.
- **Row Dragging**
    You can drag entire rows of gates by holding the *control* key and then dragging the initial state indicator at the left of a qubit's wire.
- **Gate Alternation**:
    Hold the *alt* key when starting to drag a gate, column, or wire to replace the affected gates with their alternates. The alternate of most (but not all) gates is their inverse.
- **Change Initial State**
    You can change the initial state of a qubit by clicking on the initial state indicator at the left of the qubit's wire. This will cycle through the six available states: |0⟩, |1⟩, |+⟩, |-⟩, |i⟩, and |-i⟩. Middle click the state indicator to quickly return to |0⟩.
- **Gate Resizing**
    Some gates, such as the arithmetic gates and the QFT gate, are resizable.
    When these gates are in the circuit area there is a "resize" tab at their bottom.
    You can see this tab when hovering over the gate and when dragging the gate.
    Dragging the resize tab up and down will modify the number of qubits the gate applies to.
- **Undo / Redo**
    Edits you have made to the circuit can be reverted by hitting the "Undo" button above the editing area, or by hitting Control+Z.
    If you undo too many times, you can redo edits by hitting the "Redo" button, or by hitting Control+Shift+Z or by hitting Control+Y.
- **Making Controlled Gates**
    In QubitBoard, controlled gates are made up of two parts: the control part and the gate part.
    To make a controlled gate, you just need a control to be in the same column as that gate.
    The basic "qubit must be on" control is in the leftmost group of the top toolbox.
- **Writing Circuits as Code**
    You can also build a circuit by typing it into the code panel at the bottom of the page.
    See [The Code Panel](#the-code-panel).

# The Code Panel

The code panel at the bottom of the page shows the current circuit as code, and lets you build or edit a circuit by typing instead of dragging.

![QubitBoard code panel](https://github.com/rogersmukiibi/QubitBoard/blob/master/doc/MANUAL_code-panel.png)

The panel and the circuit stay in sync in both directions, but in different ways:

- **Circuit → code, instantly.**
    Every change you make to the circuit (dropping a gate, clicking, undo, redo, opening a link) rewrites the code straight away.
    If you had typed changes that you hadn't run yet, they are replaced.
- **Code → circuit, when you run it.**
    Typing doesn't touch the circuit, like a notebook cell.
    Click **▶ Run** or press **Ctrl+Enter** to apply the code.
    A run is a single undo step, so the **Undo** button reverts it.
    If the code has a mistake, the status bar says what's wrong, the line is marked in red, and the circuit is left unchanged.

A few more details:

- Choose the language from the drop-down next to the **Code** button. The code is rewritten in the new language right away.
- While you're typing in the panel, Ctrl+Z and Ctrl+Y undo and redo your typing, not the circuit.
- **Copy** copies the code. **▾ Code** collapses the panel to a thin bar, and you can drag the panel's top edge to resize it.
- Tab indents. Press Escape to move focus out of the editor.

## The QubitBoard language

This is QubitBoard's own language, and the default.
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

- Qubits are written `q0`, `q1`, ... (or `q[0]`, `q[1]`, ...), with `q0` at the top.
- Gate names are QubitBoard's gate ids, which are also used in circuit links (see [URL Circuit Editing](#url-circuit-editing)). Upper and lower case can usually be mixed, so `h q0` works too.
- Ids with special characters have plain-text names, and either form works:

    | Gate id | Name in code |
    |---------|--------------|
    | `•`, `◦` | `ctrl`, `negctrl` |
    | `⊖`, `⊕`, `(/)`, `⊗` | `xctrl`, `xnegctrl`, `yctrl`, `ynegctrl` |
    | `Z^½`, `X^-¼`, `Z^⅟₁₆` | `Z^1/2`, `X^-1/4`, `Z^1/16` |
    | `QFT†3` | `QFTdag3` |
    | `\|0⟩⟨0\|`, `\|1⟩⟨1\|` | `postoff`, `poston` |
    | `…` | `spacer` |

- Gates that take a value have it in square brackets: formulas for formula gates, such as `Rxft[pi t^2]`, and numbers for the input-setting gates, such as `setA[5]`.
- A custom gate is defined on a `gate` line holding its JSON before it's used, e.g. `gate ~inv = {"id":"~inv","name":"Inv","matrix":"{{0,1},{1,0}}"}` followed by `~inv q0`. These lines appear automatically for custom gates made with **Make Gate**.
- Two gates on one line can't overlap. For example, `QFT3 q0, H q1` is an error, because QFT3 on q0 already covers q1.
- Circuits typed in code are tidied up the same way as dragged ones. For example, a gate typed right after a wide gate (such as a formula gate) moves over to make room, exactly as it would if you dropped it there.

## OpenQASM 3

OpenQASM is the standard text format for quantum circuits, used by Qiskit and many other tools.
Choosing **OpenQASM 3** writes the circuit as QASM, and you can also paste in QASM (OpenQASM 2 works too) and run it.

When writing a circuit as QASM, QubitBoard only uses a QASM gate when it matches QubitBoard's gate *exactly*, including global phase, since that matters once a gate is controlled (see [Conventions](#conventions)):

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

Everything else (displays, arithmetic, postselection, X/Y-axis controls, time-varying gates, and so on) is written on a `// @qb` comment line in the QubitBoard language, e.g. `// @qb Chance2 q[0]`.
Other QASM tools ignore these lines, but QubitBoard reads them back, so nothing is lost when you run the code.

When reading QASM, QubitBoard understands:

- `qubit[n] q;` and `qreg q[n];` (several registers are fine; if you leave out the declaration, a register called `q` is assumed);
- the gates in the table above, plus `id`, `phase`, `u1`, `cy`, `ch`, `crx`, `cry`, `crz`, `cp`, `cphase` and `cswap`;
- the `ctrl @`, `negctrl @` and `inv @` modifiers, including counts like `ctrl(2) @`;
- `measure q[0];`, `c[0] = measure q[0];` and `measure q[0] -> c[0];`, and whole registers like `h q;` or `measure q -> c;`;
- angles using `pi` (or `π`), numbers, `+ - * / **` and `sin`, `cos`, `tan`, `exp`, `ln`, `sqrt`.

`OPENQASM`, `include`, `bit`/`creg` declarations and `barrier` are accepted and ignored.
Classical control (`if`), loops, `reset`, gate definitions, `U`/`u3`-style gates and the `pow @` modifier aren't supported.

**Each line is one column.**
Statements on separate lines always go in separate columns.
Statements on the same line share a column when they don't touch the same qubits and have the same controls; otherwise they are split into consecutive columns.


# Conventions

- **Gate powers**: QubitBoard prefers to use Pauli gates that have been raised to a power instead of exponentiated.
For example, QubitBoard's toolbox uses S = Z^(1/2) = diag(1, i) instead of Rz(pi/2) = exp(-i Z pi/2) = diag((1-i)/√2, (1+i)/√2).
These gates are equivalent up to global phase, but have different effects when controlled.
Raising to a power is more natural when performing circuit decompositions, and has the benefit of passing through the usual Pauli gates instead of the Pauli gates times i.
In the world beyond QubitBoard, exponentiation is more common (presumably because that is how you compute the unitary effect of applying a Hamiltonian to a physical system for a certain amount of time).

- **XYZ controls**: QubitBoard has X and Y basis controls in addition to the usual Z basis controls.
For example, the ⊕ control conditions on the control qubit being in the |-⟩ state.
It is equivalent to a Z control conjugated by Hadamards (i.e. H●H).
These controls were introduced by QubitBoard and are not common in papers or textbooks.

- **Qubit order**: When doing arithmetic or converting bits to integers, QubitBoard orders the qubits from least significant at the top to most significant at the bottom.
If the top qubit is ON and the next qubit is OFF, then as a pair they represent the state |01⟩ (the number 1) instead of the state |10⟩ (the number 2).
This is the opposite of the convention used in Mike and Ike.

# Displays

A *display* is an object that you place into a circuit in order to view information about the quantum state at particular places and times.
In the real world, it isn't possible to directly access the quantum state of a physical system in this way.
But QubitBoard is a simulator, so it doesn't have to play by those rules.

For example, here is a circuit using (from left to right) Bloch sphere displays, an amplitude display, a chance display, and a density matrix display:

![Displays](https://github.com/rogersmukiibi/QubitBoard/blob/master/doc/MANUAL_various-displays.png)

A big part of using QubitBoard effectively amounts to putting the right kind of display in the right place.
In fact, it's often beneficial to perform additional quantum gates purely to make the information shown in the displays more useful.

Here are the four important kinds of displays.

- **Chance Display**

    ![chance display](https://github.com/rogersmukiibi/QubitBoard/blob/master/doc/MANUAL_chance-display.png)

    This resizable display shows the probability of computational basis states.
    To be more concrete, if you were planning to measure the qubits covered by a chance display in the computation basis (the Z basis), then the chance display shows the probability of each possible measurement result.

    You can view the exact probability of a state by hovering your cursor over the chance display.
    Visually, the length of each dark green bar is proportional to the probability of one of the states.
    Also, because the relevant probabilities get very small in larger systems and the dark green bar gets too small to see, larger chance displays include a logarithmic indicator (the thin gray line).

- **Bloch Sphere Display**

    ![bloch sphere display](https://github.com/rogersmukiibi/QubitBoard/blob/master/doc/MANUAL_bloch-display.png)

    This display shows the [Bloch vector representation](https://en.wikipedia.org/wiki/Bloch_sphere) of a single qubit's state.
    You can view the exact coordinates by hovering over the display, or just look at the pseudo-3d indicator to get a sense of where it is.

- **Amplitude Display**

    The amplitude display is like the chance display, except it shows amplitudes instead of probabilities.
    It tells you the quantum amplitude of each computation basis state of the qubits covered by the display.

    ![amplitude display](https://github.com/rogersmukiibi/QubitBoard/blob/master/doc/MANUAL_amp-display.png)

    Each square section in an amplitude display represents one of the amplitudes.
    The radius of the light blue circle is the amplitude's magnitude, and the angle of the black line indicator is the amplitude's phase.
    The height of the dark blue filling is the squared magnitude of the amplitude; its probability.
    Because the global phase of a subsystem is not well defined, QubitBoard will arbitrarily pick one of the amplitudes to use as a phase reference.
    This is indicated by the red "fixed" text on one of the phase indicators.
    Finally, because amplitudes are often very small, there is a light grey circle whose radius is proportional to the logarithm of the magnitude of the amplitude.

    When the qubits covered by the display are entangled with qubits not covered by the display, the amplitude display is not able to show phase information (because there is no well defined phase information in this situation).
    When this occurs, the amplitude display will show red warning text ("incoherent") and not show any phase indicator lines.

    For convenience reasons, QubitBoard will still show phase information in amplitude displays that are covering measured qubits.
    The information is always equivalent to what the state would have been [if the measurements were deferred](https://en.wikipedia.org/wiki/Deferred_Measurement_Principle).

- **Density Matrix Display**

    The density matrix display is like the amplitude display, except it shows the components of the density matrix of covered qubits instead of the components of the superposition.

    ![density matrix display](https://github.com/rogersmukiibi/QubitBoard/blob/master/doc/MANUAL_density-display.png)

    The advantage of the density matrix display over the amplitude display is that it works even if there is entanglement between the covered qubits and other qubits.
    The downside is that it contains significantly more information; it's harder to read.
    As with the amplitude display, the density matrix display shows complex numbers using circles with phase indicators.

## Conditioning Displays

An important aspect of using displays effectively is *conditioning* them on other qubits.
For example, suppose you are making a magic state distillation circuit and want to verify that the output is correct *if there are no errors detected*.
You can achieve this goal by placing a display over the output, and placing controls on the error-indicating qubits in the same column.

For example, in the following circuit, we want a T state to be produced on the first qubit when the second and third qubits are off.
If we just put an amplitude display on the first qubit, we aren't able to tell what's going on.
But if we condition on the other two qubits being off, we can see the state we care about.

![control displays example](https://github.com/rogersmukiibi/QubitBoard/blob/master/doc/MANUAL_controlled-display.png)

We can also use controlled displays to get insight into entangled states, by seeing how one qubit's state depends on another along various axes:

![epr conditioning](https://github.com/rogersmukiibi/QubitBoard/blob/master/doc/MANUAL_controlled-epr-display.png)

# Measurement and Detectors

QubitBoard has a Measurement Gate, but it also has "detectors".
Although these two things represent the same concept, they have significantly different behavior.

Consider the question: if a qubit is in the |+⟩ and you measure it, what is the new state of the qubit?
The answer to this question depends on whether or not you condition on the measurement result.
If you don't condition on the measurement result, the state of the qubit is described by a 2x2 maximally mixed density matrix.
If you do condition on the result, then half of the time the post-measurement state will be |0⟩ and the other half of the time it will be |1⟩.

![measurement types](https://github.com/rogersmukiibi/QubitBoard/blob/master/doc/MANUAL_measurement-types.png)

When you are attempting to explore all the possible outcomes in a structured way, the first type of measurement is more useful.
The simulation will explore all of the measurement results, and then you can use controlled displays to look at the individual cases at your leisure.
The downside of this approach is that the number of measurements you can do is limited, because the simulation cost becomes unreasonable.
QubitBoard limits the number of measurements of this type by not allowing measured qubits to be unmeasured.

For users who prefer the other type of measurement, QubitBoard has Detectors in its toolbox.
Detectors perform a collapsing measurement, and show a *CLICK* (or not) depending on the result.
Detectors are more flexible than the normal Measurement Gate (e.g. you can control them, you can use lots and lots of them, and they don't lock down a qubit into a bit).
The downside of using Detectors is that they force the circuit to constantly be re-simulated and also QubitBoard doesn't have a mechanism to accumulate statistics over time.
If you want to know information such as "how often is this state correct when the measurement result is ON", you have to use the Measurement Gate and a controlled display instead.

# Arithmetic

QubitBoard includes several gates for performing arithmetic.
For example, the **+1** gate will increment a group of qubits.
More specifically, it will permute the computational basis states such that |0..00⟩ goes to |0..01⟩ which goes to |0..10⟩ which goes to |0..11⟩ and so forth until |1..11⟩ which goes to |0..00⟩.

For flexibility, many arithmetic gates are split into two parts: the *input* and the *effect*.
For example, the **+A** gate is the effect part of an addition.
It must be accompanied by an **Input A** gate in the same column.
Together they form an operation that sends each computational basis state |A⟩|E⟩ to |A⟩|E+A (mod 2^len(E))⟩.
The input value A can also be a classical constant specified by a **Set Default A** gate.

# Advanced Techniques

## View the unitary matrix of a circuit via the state channel duality

QubitBoard happens to lay out amplitude displays in a grid, instead of a long thin column.
A happy coincidence of this layout is that, when applying an operation to one half of a set of EPR pairs, the state display shows the matrix of the operation.
(Or rather, amplitudes that are proportional to the entries of the matrix.)

For example, note how the output display of this circuit is showing the matrix of a Fourier transform:

![qft matrix](https://github.com/rogersmukiibi/QubitBoard/blob/master/doc/MANUAL_state-channel-duality.png)

## URL Circuit Editing

QubitBoard encodes the current circuit into the URL shown in your browser's address bar.
The encoding is a JSON dictionary containing a list of the columns in the circuit, where each column is a list of gate ids.
A gate id is either a string (such as `"H"` for Hadamard) or the number 1 meaning empty / identity.
For example, `#circuit={"cols":[[1,"H"],["X","•"]]}` describes a circuit with a Hadamard on the second qubit and then a CNOT from the second qubit to the first qubit.

You can edit the circuit by manually rewriting the JSON in the URL.
This makes it easy to do some tasks that would otherwise be tedious.
For example, suppose you have a circuit with a few dozen Hadamards and you want to replace those Hadamards with Y gates.
You can do this slowly with a lot of mouse dragging, or quickly by copying the URL into a text editor then using the text editor's replace-all functionality to replace `"H"` with `"Y"` then pasting back into the address bar and hitting enter.

The [code panel](#the-code-panel) is usually an easier way to make this kind of edit, since it shows the same gate ids one column per line and applies your changes when you press Ctrl+Enter.

To delete or edit a custom gate, change or remove its `gate` line in the code panel (along with any lines that use it), or edit the `gates` list in the URL.

## Unlisted Gates

QubitBoard has gates that aren't included in the toolboxes.
You can only access these gates by typing their ID, either in the [code panel](#the-code-panel) (e.g. `+cntA2 q0`) or into the URL.
These gates include, but are not limited to:

- `"^=A2"`: The XOR gate.
- `"+=AA2"`: The square-accumulate gate.
- `"+cntA2"`: The Hamming-weight-accumulate gate. Adds the number of 1s in input A into the target register.
- `"+ABmodR2"`: The modular multiply-accumulate gate.
- `"revinputA2"` and `"revinputB2"`: Input gates with reversed qubit order.
- `"Flip<A2"`: Pivot-flip gate. Reverses the order of computational basis states less than the pivot A.
- `"__unstable__UniversalNot"`: The non-physical single qubit "universal not" gate that inverts through the origin of the Bloch sphere instead of through one its axes. See if you can figure out how it would allow FTL communication if it existed in reality!
- `"__error__"`: A gate that purposefully causes an error inside the simulator for testing purposes.
- `"X^⅛"`, `"Z^⅟₁₆"`, and similar: fixed-angle rotations obsoleted by the custom formula gates. Many of these gates appear in the example QFT circuit.
- `"Sample2"`: A display that showed probabilistic samples. Obsoleted by detectors, which actually sample.
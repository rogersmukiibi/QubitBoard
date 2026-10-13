# Editing circuits

QubitBoard tries to make it easy to edit circuits.
This page describes the available actions. For a one-page summary, see [Controls](../reference/controls.md).

## Saving a circuit

Bookmark the page.
As you edit the circuit, QubitBoard actively rewrites the URL in the address bar so that it points at the current circuit.
You can also save the circuit by using the Export button above the circuit editing area.
You can export an escaped link, an offline copy of QubitBoard defaulting to the current circuit, a JSON representation of the current circuit, or a JSON representation of the entire simulator output.

## Gates

### Gate dragging

Gates can be added to the circuit by dragging them out of the toolbox and into the circuit.
Gates can be removed from the circuit by dragging them outside of the circuit area.

### Gate duplicating

You can make a copy of a gate in the circuit by holding *shift* before dragging the gate.

### Gate deleting

You can remove a gate by dragging it out of the circuit, but you can also simply middle-click the gate.

### Gate alternation

Hold the *alt* key when starting to drag a gate, column, or wire to replace the affected gates with their alternates.
The alternate of most (but not all) gates is their inverse.

### Gate resizing

Some gates, such as the arithmetic gates and the QFT gate, are resizable.
When these gates are in the circuit area there is a "resize" tab at their bottom.
You can see this tab when hovering over the gate and when dragging the gate.
Dragging the resize tab up and down will modify the number of qubits the gate applies to.

### Making controlled gates

In QubitBoard, controlled gates are made up of two parts: the control part and the gate part.
To make a controlled gate, you just need a control to be in the same column as that gate.
The basic "qubit must be on" control is in the leftmost group of the top toolbox.

## Qubits

### Adding a qubit

Whenever you are dragging a gate, an extra qubit line will appear at the bottom of the circuit.
If you drop the gate on this new qubit line, it will become permanently added.
To add more qubits, keep picking up a gate and dropping it on the new qubit line that appears.
To reduce the number of qubits, remove all gates from the bottom-most qubit line.
The maximum number of qubits is 16.

### Changing the initial state

You can change the initial state of a qubit by clicking on the initial state indicator at the left of the qubit's wire.
This will cycle through the six available states: |0⟩, |1⟩, |+⟩, |-⟩, |i⟩, and |-i⟩.
Middle click the state indicator to quickly return to |0⟩.

## Columns and rows

### Column dragging

You can drag entire columns of gates by holding the *control* key before dragging a gate in that column.

### Column duplicating

You can duplicate entire columns of gates by holding both the *shift* key and the *control* key before dragging a gate in that column.

### Row dragging

You can drag entire rows of gates by holding the *control* key and then dragging the initial state indicator at the left of a qubit's wire.

## Undo and redo

Edits you have made to the circuit can be reverted by hitting the "Undo" button above the editing area, or by hitting Control+Z.
If you undo too many times, you can redo edits by hitting the "Redo" button, or by hitting Control+Shift+Z or by hitting Control+Y.

## Writing circuits as code

You can also build a circuit by typing it into the code panel at the bottom of the page.
See [The code panel](../code/index.md).

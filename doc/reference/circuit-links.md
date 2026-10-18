# Circuit links

QubitBoard encodes the current circuit into the URL shown in your browser's address bar.
That is why bookmarking the page saves the circuit, and why sending someone the link shares it.

## The format

The encoding is a JSON dictionary containing a list of the columns in the circuit, where each column is a list of gate ids.
A gate id is either a string (such as `"H"` for Hadamard) or the number 1 meaning empty / identity.
For example, `#circuit={"cols":[[1,"H"],["X","•"]]}` describes a circuit with a Hadamard on the second qubit and then a CNOT from the second qubit to the first qubit.

## URL circuit editing

You can edit the circuit by manually rewriting the JSON in the URL.
This makes it easy to do some tasks that would otherwise be tedious.
For example, suppose you have a circuit with a few dozen Hadamards and you want to replace those Hadamards with Y gates.
You can do this slowly with a lot of mouse dragging, or quickly by copying the URL into a text editor then using the text editor's replace-all functionality to replace `"H"` with `"Y"` then pasting back into the address bar and hitting enter.

The [code panel](../code/index.md) is usually an easier way to make this kind of edit.
With the [QubitBoard language](../code/qubitboard-language.md) selected, it shows the same gate ids one column per line and applies your changes when you press Ctrl+Enter.

## Using WebGL1

QubitBoard simulates circuits on your graphics card, with WebGL2, or with WebGL1 in browsers that don't have WebGL2.
If the displays look wrong on your computer, add `?webgl=1` before the `#` to make QubitBoard use WebGL1, for example
`https://rogersmukiibi.com/QubitBoard/?webgl=1#circuit={"cols":[["H"]]}`.
Editing the circuit keeps the option in the URL.
If WebGL1 fixes the problem, please [report it](https://github.com/rogersmukiibi/QubitBoard/issues) with your browser and graphics card.

## Custom gates

To delete or edit a custom gate, change or remove its definition line in the code panel (along with any lines that use it), or edit the `gates` list in the URL.

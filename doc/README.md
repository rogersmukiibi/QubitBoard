# QubitBoard documentation

This folder is the source of the documentation site at <https://rogersmukiibi.com/QubitBoard/docs/>.
The site is built with [VitePress](https://vitepress.dev/) and published next to the app by
[`.github/workflows/pages.yml`](../.github/workflows/pages.yml) on every push to `main`.

## Layout

| Path | Contents |
|------|----------|
| `index.md` | The site's home page |
| `guide/` | How to use QubitBoard, in reading order |
| `gates/` | Every gate, with a page per toolbox and a section per toolbox group |
| `code/` | The code panel and its languages |
| `reference/` | Pages to look things up in: controls, conventions, circuit links |
| `images/` | Screenshots used by the pages, and the GIFs used by the repository's README |
| `public/` | Files copied to the site as they are (the favicon) |
| `.vitepress/config.ts` | The site's title, navigation bar and sidebar |
| `.vitepress/theme/` | Additions to the default theme's styles |
| `wiki/` | The page left on the GitHub wiki to point old links at the site. It is not part of the site |

## Previewing

```bash
npm run serve-docs   # live preview at http://localhost:5173/QubitBoard/docs/
npm run build-docs   # build the site into out/docs/
```

`npm run build-docs` fails when a page links to a page that doesn't exist. CI runs it on every push and pull request.

## Adding a page

1. Create a `.md` file in the folder that fits, starting with a `# Title` line.
2. Add the page to `sidebar` in `.vitepress/config.ts`. A page that isn't listed there is still built, but nobody
   will find it by browsing.
3. Link to other pages by relative path with the `.md` extension, e.g. `[Displays](../guide/displays.md)`. Put
   screenshots in `images/` and reference them the same way.

Text in double curly braces is read as a Vue expression unless it is in inline code or a fenced code block, so write
a matrix such as `{{0,1},{1,0}}` as code.

## Adding or moving a gate

`gates/top-toolbox.md` and `gates/bottom-toolbox.md` mirror the toolboxes defined in `src/gates/AllGates.js`: a `##`
section per group, named and ordered like the groups, with a table row for each gate. A row starts with the gate's
picture and has the gate's id in backticks:

```
| ![Hadamard Gate](../images/gates/h.png) | Hadamard Gate | `H` | ... |
```

The pictures in `images/gates/` are taken from the running app. After changing a toolbox, regenerate them all:

```bash
npm run build              # the pictures are taken from out/qubitboard.html
npm run screenshot-gates   # prints each picture's file name next to its gate id
```

`test/doc/ToolboxGatesDoc.test.ts` checks the pages against the toolboxes, so `npm test` fails when the sections don't
match the groups, a gate has no row, or a row has no picture of its own. Keep other `##` headings off those two pages.

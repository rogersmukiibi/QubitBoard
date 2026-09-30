# How to Contribute

Thanks for your interest in improving QubitBoard! Bug reports, fixes and new features are all welcome.

## Reporting bugs and suggesting features

Open an issue at <https://github.com/rogersmukiibi/QubitBoard/issues>. For bugs, include:

- what you did and what you expected to happen;
- a link to the circuit (use **Export** → **Escaped Link**), if the problem involves one;
- your browser and operating system.

## Making changes

1. Set up the project by following the [Building](README.md#building) steps in the README.
2. Create a branch for your change.
3. **Write the tests first.** Add or update unit tests under `test/` that describe the behavior you want, check that
   they fail for the expected reason, and then write the code until they pass.
4. **Write new files in TypeScript.** New source and test files are `.ts`. Existing `.js` files stay JavaScript when
   you only change a few lines; convert a file only as a deliberate change of its own. See the
   [TypeScript](README.md#typescript) section of the README for how the build handles the mix.
5. Before opening a pull request, check that everything type-checks and all tests pass:

    ```bash
    npm run typecheck
    npx grunt build-test-page && node PuppeteerRunTests.js
    ```

    Under WSL or in a container, prefix the test command with `PUPPETEER_NO_SANDBOX=1`.
6. Build the app with `npm run build` and try your change in `out/qubitboard.html`.

The project layout, coding conventions and more detailed build notes are in [AGENTS.md](AGENTS.md). They apply to
human contributors as well as AI coding agents.

## Style

- Match the surrounding code: 4-space indentation, and types on public functions and methods (TypeScript types in
  `.ts` files, JSDoc in `.js` files).
- Import modules by relative path with the `.js` extension, even when the module is a `.ts` file.
- Start new files with the Apache 2.0 license header used by the other new files, e.g. `src/code/CodeError.ts`.
- Keep comments for things the code can't say on its own.

## Pull requests

Open pull requests against the `master` branch of
[rogersmukiibi/QubitBoard](https://github.com/rogersmukiibi/QubitBoard). Every pull request is built and tested by
CI, and is reviewed by the maintainer before it's merged. Keep each pull request focused on one change, and describe
what it changes and how you tested it.

## License

QubitBoard is released under the [Apache License 2.0](LICENSE). By contributing, you agree that your contributions
are licensed under the same terms.

# tree-sitter-zup

[Tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammars for the
[zup programming language](https://github.com/hent0/zup):

- **zup** — the language itself (`*.zup`)
- **zupt** — zup's PHP-style sectioned test files (`*.zupt`, in `zupt/`):
  `--SECTION--` headers with raw bodies, where injection queries highlight
  the `--FILE--` body as zup and `--PREPARE--`/`--CLEANUP--` as bash

The grammar is a **permissive superset** of what the zup compiler accepts:
it is meant for editors, so it parses half-typed and slightly-invalid code
gracefully rather than enforcing the compiler's semantic rules. Outright syntax
errors, though, stay errors. Structure and operator precedence mirror the
reference implementation's `src/parser.zup` (the compiler is self-hosted).

Last validated against zup commit
[`9567df5`](https://github.com/hent0/zup/commit/9567df5)
(2026-08-14): all of `examples/` and `std/`, plus 628 of the 681 `--FILE--`
bodies in `tests/`, parse with zero `ERROR` nodes. The 53 exclusions are
tests asserting a parse error, `tests/lexer/` token-stream fixtures, and the
known gaps listed in `test/upstream-skip.txt`. A weekly CI job re-checks
against zup `HEAD`.

## Neovim (nvf)

The flake exposes three packages:

- `tree-sitter-zup` — the compiled zup grammar (via `pkgs.tree-sitter.buildGrammar`)
- `tree-sitter-zupt` — the compiled zupt grammar
- `tree-sitter-zup-queries` — the repo as a Neovim plugin, putting
  `queries/{zup,zupt}/*.scm` (highlights, indents, folds, injections) on the
  runtimepath

```nix
# flake inputs:
inputs.tree-sitter-zup.url = "github:okihus/tree-sitter-zup";
# while hacking on the grammar locally, point at your checkout instead:
# inputs.tree-sitter-zup.url = "path:/home/you/Projects/tree-sitter-zup";
```

```nix
# nvf configuration:
{ inputs, pkgs, ... }:
{
  vim.treesitter.grammars = [
    inputs.tree-sitter-zup.packages.${pkgs.system}.tree-sitter-zup
    inputs.tree-sitter-zup.packages.${pkgs.system}.tree-sitter-zupt
  ];

  vim.startPlugins = [
    inputs.tree-sitter-zup.packages.${pkgs.system}.tree-sitter-zup-queries
  ];

  vim.luaConfigRC.zup-filetype = ''
    vim.filetype.add({ extension = { zup = "zup", zupt = "zupt" } })
  '';
}
```

The zupt injections assume the `zup` and `bash` grammars are installed
(`bash` ships in nvf's defaults).

Other Neovim setups can use nvim-treesitter's custom parser mechanism with
this repo's URL; the `queries/zup → .` symlink makes the repo double as a
query runtimepath entry.

## VS Code

VS Code can't consume tree-sitter grammars directly; `vscode/` contains an
extension that compiles both grammars to WASM and serves the highlight-query
captures through VS Code's semantic tokens API, including the zup injection
into `.zupt` `--FILE--` bodies. See [vscode/README.md](vscode/README.md) for
build and install instructions.

## Development

The dev shell is a [devenv](https://devenv.sh) environment (`direnv allow`
or `devenv shell`) providing the tree-sitter CLI, Node.js, and a C compiler.

```sh
tree-sitter generate   # grammar.js -> src/ (commit the result)
tree-sitter test       # corpus tests in test/corpus/
check-zup-corpus [dir] # parse a zup checkout's examples/ and std/, the *.zupt
                       # section structure, and the zup inside each --FILE--
                       # body; fail on ERROR nodes (defaults to ~/Projects/zup)
```

The zupt grammar lives in `zupt/`; run `tree-sitter generate`/`test` from
inside that directory to work on it.

`src/` is generated but committed, like other tree-sitter grammars, so
consumers don't need the CLI. Regenerate and commit together with any
`grammar.js` change — CI enforces they stay in sync.

## License

MIT

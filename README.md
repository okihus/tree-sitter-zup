# tree-sitter-zup

[Tree-sitter](https://tree-sitter.github.io/tree-sitter/) grammar for the
[zup programming language](https://github.com/hent0/zup).

The grammar is a **permissive superset** of what the zup compiler accepts:
it is meant for editors, so it parses half-typed and slightly-invalid code
gracefully rather than enforcing the compiler's semantic rules. Structure and
operator precedence mirror the reference implementation's `src/parser.c`.

Last validated against zup commit
[`31a0523`](https://github.com/hent0/zup/commit/31a0523038a3165ff397b04125427db008a1ce50)
(2026-07-13): all of `examples/`, `std/`, and the valid `tests/parse/` sources
parse with zero `ERROR` nodes. A weekly CI job re-checks against zup `HEAD`.

## Neovim (nvf)

The flake exposes two packages:

- `tree-sitter-zup` — the compiled grammar (via `pkgs.tree-sitter.buildGrammar`)
- `tree-sitter-zup-queries` — the repo as a Neovim plugin, putting
  `queries/zup/{highlights,indents,folds}.scm` on the runtimepath

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
  ];

  vim.startPlugins = [
    inputs.tree-sitter-zup.packages.${pkgs.system}.tree-sitter-zup-queries
  ];

  vim.luaConfigRC.zup-filetype = ''
    vim.filetype.add({ extension = { zup = "zup" } })
  '';
}
```

Other Neovim setups can use nvim-treesitter's custom parser mechanism with
this repo's URL; the `queries/zup → .` symlink makes the repo double as a
query runtimepath entry.

## Development

The dev shell is a [devenv](https://devenv.sh) environment (`direnv allow`
or `devenv shell`) providing the tree-sitter CLI, Node.js, and a C compiler.

```sh
tree-sitter generate   # grammar.js -> src/ (commit the result)
tree-sitter test       # corpus tests in test/corpus/
check-zup-corpus       # parse ../zup's examples/ and std/, fail on ERROR nodes
```

`src/` is generated but committed, like other tree-sitter grammars, so
consumers don't need the CLI. Regenerate and commit together with any
`grammar.js` change — CI enforces they stay in sync.

## License

MIT

# Zup for VS Code

VS Code extension providing syntax highlighting for [zup](https://github.com/hent0/zup)
(`.zup`) and its sectioned test files (`.zupt`).

VS Code cannot consume tree-sitter grammars directly, so this extension
bridges them: the grammars from the parent repo are compiled to WASM, parsed
with [web-tree-sitter](https://www.npmjs.com/package/web-tree-sitter), and the
captures from `queries/highlights.scm` are served through VS Code's semantic
tokens API. In `.zupt` files the `--FILE--` section body is highlighted as zup
(mirroring `zupt/queries/injections.scm`); `--PREPARE--`/`--CLEANUP--` would
need a bundled bash grammar and are left unhighlighted.

There is deliberately no TextMate grammar: files are plain-colored for the
instant before the semantic provider first runs.

## Build and install

Prebuilt `.vsix` files are attached to the repo's
[GitHub releases](https://github.com/okihus/tree-sitter-zup/releases)
(published by CI on `v*` tags, where the tag must match this package's
version): download and `code --install-extension zup-language-<version>.vsix`.

To build from source instead: requires the tree-sitter CLI and Node.js — both provided by the repo's devenv
shell. From this directory:

```sh
npm install
npm run build-assets   # compiles both grammars to assets/*.wasm, copies queries
npx @vscode/vsce package
code --install-extension zup-language-0.1.0.vsix
```

Re-run `npm run build-assets` (and reinstall) after changing the grammars or
highlight queries.

## Development

Open this directory in VS Code and press F5 ("Run Extension") to launch an
Extension Development Host with the extension loaded.

`highlighting.js` is the editor-agnostic core (parse → query → flatten into
non-overlapping spans); `extension.js` is the VS Code glue. The core can be
smoke-tested without VS Code:

```sh
node test.js path/to/file.zup   # or .zupt
```

## Troubleshooting

- No colors: semantic highlighting must be enabled — most built-in themes
  enable it, otherwise set `"editor.semanticHighlighting.enabled": true`.
- To inspect what a token resolved to, use
  `Developer: Inspect Editor Tokens and Scopes`.

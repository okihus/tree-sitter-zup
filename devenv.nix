{ pkgs, ... }:

{
  # Toolchain for developing the grammar:
  #  - tree-sitter CLI (generate / test / parse / highlight)
  #  - nodejs, required by `tree-sitter generate` to evaluate grammar.js
  #  - a C compiler for building the parser
  packages = [
    pkgs.tree-sitter
    pkgs.nodejs
    pkgs.gcc
  ];

  # Thin wrapper so the check has one implementation, shared with CI — see
  # scripts/check-zup-corpus.sh for what it parses and what it skips.
  scripts.check-zup-corpus.exec = ''
    exec "$DEVENV_ROOT/scripts/check-zup-corpus.sh" "$@"
  '';
}

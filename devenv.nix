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

  scripts.check-zup-corpus.exec = ''
    # Parse the zup compiler repo's examples/ and std/ — fails on any ERROR node.
    set -euo pipefail
    zup_repo="''${1:-$HOME/Projects/zup}"
    find "$zup_repo/examples" "$zup_repo/std" -name '*.zup' -print0 \
      | xargs -0 tree-sitter parse --quiet --stat all
  '';
}

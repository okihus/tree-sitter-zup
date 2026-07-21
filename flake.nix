{
  description = "Tree-sitter grammar for the zup programming language";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      packages = forAllSystems (pkgs: rec {
        # The compiled grammar, for e.g. nvf's `vim.treesitter.grammars`.
        tree-sitter-zup = pkgs.tree-sitter.buildGrammar {
          language = "zup";
          version = "0.1.0";
          src = self;
        };

        # The repo as a Neovim plugin: puts queries/zup/*.scm on the
        # runtimepath so highlights/indents/folds resolve.
        tree-sitter-zup-queries = pkgs.vimUtils.buildVimPlugin {
          pname = "tree-sitter-zup-queries";
          version = "0.1.0";
          src = self;
        };

        default = tree-sitter-zup;
      });

      overlays.default = final: prev: {
        tree-sitter-grammars = prev.tree-sitter-grammars // {
          tree-sitter-zup = self.packages.${final.system}.tree-sitter-zup;
        };
      };
    };
}

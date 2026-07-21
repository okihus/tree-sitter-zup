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

        # Grammar for zup's sectioned test files (*.zupt); the injection
        # queries light up --FILE-- bodies as zup and --PREPARE--/--CLEANUP--
        # as bash.
        tree-sitter-zupt = pkgs.tree-sitter.buildGrammar {
          language = "zupt";
          version = "0.1.0";
          src = self;
          location = "zupt";
        };

        # The repo as a Neovim plugin: puts queries/{zup,zupt}/*.scm on the
        # runtimepath so highlights/indents/folds/injections resolve.
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
          tree-sitter-zupt = self.packages.${final.system}.tree-sitter-zupt;
        };
      };
    };
}

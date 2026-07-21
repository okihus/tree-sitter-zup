package tree_sitter_zup_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_zup "github.com/okihus/tree-sitter-zup/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_zup.Language())
	if language == nil {
		t.Errorf("Error loading Zup grammar")
	}
}

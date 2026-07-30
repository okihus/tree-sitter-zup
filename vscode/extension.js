"use strict";

const path = require("path");
const vscode = require("vscode");
const { createHighlighter } = require("./highlighting");

// Must stay in sync with the token types used in CAPTURE_TOKENS
// (highlighting.js) and the custom types declared in package.json.
const TOKEN_TYPES = [
  "namespace",
  "type",
  "interface",
  "parameter",
  "variable",
  "property",
  "function",
  "method",
  "keyword",
  "comment",
  "string",
  "number",
  "operator",
  "boolean",
  "constantBuiltin",
  "escapeSequence",
  "directive",
];
const TOKEN_MODIFIERS = ["declaration", "readonly", "defaultLibrary", "documentation"];
const LEGEND = new vscode.SemanticTokensLegend(TOKEN_TYPES, TOKEN_MODIFIERS);

class ZupSemanticTokensProvider {
  constructor(highlighter) {
    this.highlighter = highlighter;
  }

  provideDocumentSemanticTokens(document) {
    const builder = new vscode.SemanticTokensBuilder(LEGEND);
    for (const token of this.highlighter.tokens(document.languageId, document.getText())) {
      const start = document.positionAt(token.start);
      const end = document.positionAt(token.end);
      // Semantic tokens cannot span lines; split multi-line captures per line.
      for (let line = start.line; line <= end.line; line++) {
        const from = line === start.line ? start.character : 0;
        const to = line === end.line ? end.character : document.lineAt(line).text.length;
        if (to > from) {
          builder.push(new vscode.Range(line, from, line, to), token.type, token.modifiers);
        }
      }
    }
    return builder.build();
  }
}

async function activate(context) {
  const highlighter = await createHighlighter(path.join(__dirname, "assets"));
  const provider = new ZupSemanticTokensProvider(highlighter);
  for (const language of ["zup", "zupt"]) {
    context.subscriptions.push(
      vscode.languages.registerDocumentSemanticTokensProvider({ language }, provider, LEGEND)
    );
  }
}

module.exports = { activate };

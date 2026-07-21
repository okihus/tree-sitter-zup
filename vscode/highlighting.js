"use strict";

// Editor-agnostic core: parses zup/zupt text with the wasm grammars, runs the
// highlight queries, and resolves the captures into flat, non-overlapping,
// sorted token spans. Kept free of any `vscode` import so it can be exercised
// from plain node (see extension.js for the VS Code glue).

const fs = require("fs");
const path = require("path");
const { Parser, Language, Query } = require("web-tree-sitter");

// Capture-name → semantic token mapping. Lookup tries the full capture name,
// then strips trailing `.segment`s, so e.g. `keyword.repeat` falls back to
// `keyword`. Captures that resolve to null (punctuation) are not emitted.
const CAPTURE_TOKENS = {
  variable: { type: "variable" },
  constant: { type: "variable", modifiers: ["readonly"] },
  "constant.builtin": { type: "constantBuiltin" },
  module: { type: "namespace" },
  type: { type: "type" },
  "type.builtin": { type: "type", modifiers: ["defaultLibrary"] },
  function: { type: "function", modifiers: ["declaration"] },
  "function.call": { type: "function" },
  "function.method.call": { type: "method" },
  "variable.parameter": { type: "parameter" },
  "variable.builtin": { type: "variable", modifiers: ["defaultLibrary"] },
  "variable.member": { type: "property" },
  number: { type: "number" },
  character: { type: "string" },
  "character.special": { type: "keyword" },
  string: { type: "string" },
  "string.escape": { type: "escapeSequence" },
  boolean: { type: "boolean" },
  keyword: { type: "keyword" },
  "keyword.directive": { type: "directive" },
  operator: { type: "operator" },
  punctuation: null,
  comment: { type: "comment" },
  "comment.documentation": { type: "comment", modifiers: ["documentation"] },
};

function tokenForCapture(name) {
  let key = name;
  for (;;) {
    if (key in CAPTURE_TOKENS) return CAPTURE_TOKENS[key];
    const dot = key.lastIndexOf(".");
    if (dot === -1) return null;
    key = key.slice(0, dot);
  }
}

// Resolve overlapping captures into non-overlapping spans: identical ranges
// keep the last capture (the queries are ordered general → specific), and
// nested captures win over their containers, splitting them (escape sequences
// inside strings, injected zup inside zupt section bodies).
function flatten(tokens) {
  const byRange = new Map();
  tokens.forEach((t, order) => byRange.set(`${t.start}:${t.end}`, { ...t, order }));
  const toks = [...byRange.values()];
  const bounds = [...new Set(toks.flatMap((t) => [t.start, t.end]))].sort((a, b) => a - b);
  const slot = new Map(bounds.map((b, i) => [b, i]));
  const segments = new Array(Math.max(bounds.length - 1, 0)).fill(null);
  // Paint longest spans first so shorter (inner) spans overwrite them.
  toks.sort((a, b) => b.end - b.start - (a.end - a.start) || a.order - b.order);
  for (const t of toks) {
    for (let i = slot.get(t.start); i < slot.get(t.end); i++) segments[i] = t;
  }
  const out = [];
  for (let i = 0; i < segments.length; i++) {
    const t = segments[i];
    if (!t) continue;
    let end = i + 1;
    while (end < segments.length && segments[end] === t) end++;
    out.push({ start: bounds[i], end: bounds[end], type: t.type, modifiers: t.modifiers ?? [] });
    i = end - 1;
  }
  return out;
}

class Highlighter {
  constructor(grammars) {
    this.grammars = grammars;
    this.parser = new Parser();
  }

  // Flat, sorted, non-overlapping {start, end, type, modifiers} spans for the
  // whole document, with start/end as UTF-16 offsets into `text`.
  tokens(languageId, text) {
    const raw =
      languageId === "zupt"
        ? this._zuptTokens(text)
        : this._captureTokens("zup", text, 0);
    return flatten(raw);
  }

  _parse(grammarName, text) {
    this.parser.setLanguage(this.grammars[grammarName].language);
    return this.parser.parse(text);
  }

  _queryTokens(grammarName, rootNode, offset) {
    const out = [];
    for (const capture of this.grammars[grammarName].query.captures(rootNode)) {
      const token = tokenForCapture(capture.name);
      if (!token) continue;
      const { startIndex, endIndex } = capture.node;
      if (endIndex > startIndex) {
        out.push({ start: offset + startIndex, end: offset + endIndex, ...token });
      }
    }
    return out;
  }

  _captureTokens(grammarName, text, offset) {
    const tree = this._parse(grammarName, text);
    if (!tree) return [];
    try {
      return this._queryTokens(grammarName, tree.rootNode, offset);
    } finally {
      tree.delete();
    }
  }

  _zuptTokens(text) {
    const tree = this._parse("zupt", text);
    if (!tree) return [];
    try {
      let out = this._queryTokens("zupt", tree.rootNode, 0);
      // Injections, mirroring zupt/queries/injections.scm: --FILE-- bodies are
      // zup. (--PREPARE--/--CLEANUP-- are bash; no bash grammar is shipped, so
      // those bodies stay unhighlighted.)
      for (const section of tree.rootNode.namedChildren) {
        if (!section || section.type !== "section") continue;
        const name = section.childForFieldName("name");
        const body = section.childForFieldName("body");
        if (!name || !body) continue;
        if (name.text.startsWith("--FILE--")) {
          out = out.concat(this._captureTokens("zup", body.text, body.startIndex));
        }
      }
      return out;
    } finally {
      tree.delete();
    }
  }
}

async function createHighlighter(assetsDir) {
  await Parser.init();
  const load = async (name) => {
    const language = await Language.load(
      path.join(assetsDir, `tree-sitter-${name}.wasm`)
    );
    const source = fs.readFileSync(
      path.join(assetsDir, `${name}-highlights.scm`),
      "utf8"
    );
    return { language, query: new Query(language, source) };
  };
  const [zup, zupt] = await Promise.all([load("zup"), load("zupt")]);
  return new Highlighter({ zup, zupt });
}

module.exports = { createHighlighter, tokenForCapture, flatten };

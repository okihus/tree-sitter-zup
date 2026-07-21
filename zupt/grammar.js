/**
 * @file Zupt grammar for tree-sitter
 * @author Oki Husso <oki.husso@hurja.fi>
 * @license MIT
 *
 * Grammar for zup's PHP-style sectioned test files (*.zupt): a sequence of
 * `--NAME--` headers, each followed by raw body lines. The bodies are left
 * uninterpreted here; injection queries light them up (--FILE-- as zup,
 * --PREPARE--/--CLEANUP-- as bash).
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

export default grammar({
  name: "zupt",

  extras: (_) => [/\s/],

  rules: {
    source_file: ($) => repeat($.section),

    section: ($) =>
      seq(
        field("name", $.section_header),
        optional(field("body", $.section_body)),
      ),

    // A header owns its whole line. A body line that merely starts with
    // header-like text stays a body line: with equal lexical precedence the
    // longer match wins, and on an exact header line (equal length) the
    // earlier-declared rule — this one — wins.
    section_header: (_) => token(/--[A-Z][A-Z0-9_]*--[ \t]*/),

    section_body: ($) => repeat1($.body_line),

    body_line: (_) => /[^\n]+/,
  },
});

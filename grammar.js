/**
 * @file Zup grammar for tree-sitter
 * @author Oki Husso <oki.husso@hurja.fi>
 * @license MIT
 *
 * A permissive superset of the zup language as implemented by the reference
 * compiler (https://github.com/hent0/zup, src/parser.c). Semantic
 * restrictions (valid assignment targets, where variadics may appear, etc.)
 * are intentionally not enforced — the compiler owns those.
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

// Expression precedence, lowest to highest, mirroring parser.c's
// recursive-descent ladder (parse_expr .. parse_postfix).
const PREC = {
  coalesce: 1, // ??
  ternary: 2, // ?: and postfix ? (propagate)
  or: 3, // ||
  and: 4, // &&
  bitor: 5, // |
  bitxor: 6, // ^
  bitand: 7, // &
  compare: 8, // == != < <= > >=
  shift: 9, // << >>
  additive: 10, // + -
  multiplicative: 11, // * / %
  cast: 12, // as
  unary: 13, // ! - & (prefix)
  postfix: 14, // call, field, index, slice, unwrap !, struct literal
};

export default grammar({
  name: "zup",

  word: ($) => $.identifier,

  extras: ($) => [/\s/, $.line_comment, $.block_comment],

  supertypes: ($) => [$._declaration, $._statement, $._expression, $._type],

  conflicts: ($) => [
    // `expr ?` may close as a propagate expression or continue into a
    // ternary; GLR resolves by what follows (parser.c peeks the same way).
    [$.propagate_expression, $.conditional_expression],
    // `name {` in condition position: struct literal vs. block. The
    // struct literal carries negative dynamic precedence, so blocks win
    // when both parses survive — matching the compiler, which forbids
    // struct literals in conditions.
    [$.struct_literal, $._expression],
    // `=> {}` in a match arm: empty block vs. empty anonymous struct
    // literal. The literal's negative dynamic precedence makes the block win.
    [$.struct_literal, $.block],
  ],

  rules: {
    source_file: ($) => repeat($._declaration),

    // ---------------------------------------------------------------
    // Declarations
    // ---------------------------------------------------------------

    _declaration: ($) =>
      choice(
        $.function_declaration,
        $.extern_function_declaration,
        $.struct_declaration,
        $.enum_declaration,
        $.variable_declaration,
      ),

    visibility_modifier: (_) => "pub",

    function_declaration: ($) =>
      seq(
        optional($.visibility_modifier),
        "fn",
        field("name", $.identifier),
        field("parameters", $.parameter_list),
        optional(seq(":", field("return_type", $._type))),
        field("body", $.block),
      ),

    extern_function_declaration: ($) =>
      seq(
        optional($.visibility_modifier),
        choice("extern", "builtin"),
        "fn",
        field("name", $.identifier),
        field("parameters", $.parameter_list),
        optional(seq(":", field("return_type", $._type))),
        ";",
      ),

    parameter_list: ($) =>
      seq("(", commaSep(choice($.parameter, $.variadic_parameter)), ")"),

    parameter: ($) =>
      seq(
        optional("const"),
        field("name", $.identifier),
        optional(seq(":", field("type", choice($._type, "...")))),
        optional(seq("=", field("default", $._expression))),
      ),

    variadic_parameter: (_) => "...",

    struct_declaration: ($) =>
      seq(
        optional($.visibility_modifier),
        "struct",
        field("name", $.identifier),
        "{",
        repeat(choice($.field_declaration, $.function_declaration)),
        "}",
      ),

    // Commas between struct fields are optional in parser.c.
    field_declaration: ($) =>
      seq(
        optional($.visibility_modifier),
        field("name", $.identifier),
        ":",
        field("type", $._type),
        optional(seq("=", field("default", $._expression))),
        optional(","),
      ),

    enum_declaration: ($) =>
      seq(
        optional($.visibility_modifier),
        "enum",
        field("name", $.identifier),
        "{",
        repeat(choice($.enum_member, $.function_declaration)),
        "}",
      ),

    enum_member: ($) =>
      seq(
        field("name", $.identifier),
        optional(seq(":", field("type", $._type))),
        optional(seq("=", field("value", seq(optional("-"), $.number_literal)))),
        optional(","),
      ),

    variable_declaration: ($) =>
      seq(
        optional($.visibility_modifier),
        choice("let", "const"),
        field("name", $.identifier),
        optional(seq(":", field("type", $._type))),
        optional(seq("=", field("value", $._expression))),
        ";",
      ),

    // ---------------------------------------------------------------
    // Types
    // ---------------------------------------------------------------

    _type: ($) =>
      choice(
        $.primitive_type,
        $.optional_type,
        $.pointer_type,
        $.slice_type,
        $.array_type,
        $.qualified_type,
        alias($.identifier, $.type_identifier),
      ),

    primitive_type: (_) =>
      choice(
        "void",
        "bool",
        "i8",
        "u8",
        "i16",
        "u16",
        "i32",
        "u32",
        "i64",
        "u64",
        "f32",
        "f64",
        "cstr",
        "str",
      ),

    optional_type: ($) => seq("?", field("element", $._type)),

    pointer_type: ($) => seq("*", field("element", $._type)),

    slice_type: ($) => seq("[", "]", field("element", $._type)),

    array_type: ($) =>
      seq(
        "[",
        field("size", choice($.number_literal, "_")),
        "]",
        field("element", $._type),
      ),

    qualified_type: ($) =>
      seq(
        repeat1(prec(1, seq(field("module", $.identifier), "."))),
        field("name", alias($.identifier, $.type_identifier)),
      ),

    // ---------------------------------------------------------------
    // Statements
    // ---------------------------------------------------------------

    block: ($) => seq("{", repeat($._statement), "}"),

    _statement: ($) =>
      choice(
        $.return_statement,
        $.if_statement,
        $.while_statement,
        $.for_statement,
        $.break_statement,
        $.continue_statement,
        $.defer_statement,
        $.variable_declaration,
        $.assignment_statement,
        $.update_statement,
        $.expression_statement,
      ),

    return_statement: ($) => seq("return", optional($._expression), ";"),

    if_statement: ($) =>
      seq(
        "if",
        field("condition", $._expression),
        field("consequence", $.block),
        optional(
          seq("else", field("alternative", choice($.if_statement, $.block))),
        ),
      ),

    while_statement: ($) =>
      seq("while", field("condition", $._expression), field("body", $.block)),

    for_statement: ($) =>
      seq(
        "for",
        field("item", $.identifier),
        "in",
        field("iterable", $._expression),
        optional(seq("..", field("end", $._expression))),
        field("body", $.block),
      ),

    break_statement: (_) => seq("break", ";"),

    continue_statement: (_) => seq("continue", ";"),

    defer_statement: ($) => seq("defer", $._expression, ";"),

    assignment_statement: ($) =>
      seq(
        field("left", $._expression),
        field(
          "operator",
          choice(
            "=",
            "+=",
            "-=",
            "*=",
            "/=",
            "%=",
            "&=",
            "|=",
            "^=",
            "<<=",
            ">>=",
            "??=",
          ),
        ),
        field("right", $._expression),
        ";",
      ),

    update_statement: ($) =>
      seq($._expression, field("operator", choice("++", "--")), ";"),

    // A match used as a statement may omit the trailing semicolon.
    expression_statement: ($) =>
      choice(seq($._expression, ";"), prec(1, $.match_expression)),

    // ---------------------------------------------------------------
    // Expressions
    // ---------------------------------------------------------------

    _expression: ($) =>
      choice(
        $.identifier,
        $.number_literal,
        $.char_literal,
        $.string_literal,
        $.boolean_literal,
        $.null_literal,
        $.array_literal,
        $.struct_literal,
        $.enum_literal,
        $.import_expression,
        $.sizeof_expression,
        $.match_expression,
        $.call_expression,
        $.field_expression,
        $.index_expression,
        $.slice_expression,
        $.unwrap_expression,
        $.propagate_expression,
        $.unary_expression,
        $.cast_expression,
        $.binary_expression,
        $.conditional_expression,
        $.parenthesized_expression,
      ),

    parenthesized_expression: ($) => seq("(", $._expression, ")"),

    import_expression: ($) =>
      seq("import", "(", field("path", $.string_literal), ")"),

    sizeof_expression: ($) => seq("sizeof", "(", field("type", $._type), ")"),

    call_expression: ($) =>
      prec(
        PREC.postfix,
        seq(field("function", $._expression), field("arguments", $.argument_list)),
      ),

    argument_list: ($) => seq("(", commaSep($._expression), ")"),

    field_expression: ($) =>
      prec(
        PREC.postfix,
        seq(field("value", $._expression), ".", field("field", $.identifier)),
      ),

    index_expression: ($) =>
      prec(
        PREC.postfix,
        seq(field("value", $._expression), "[", field("index", $._expression), "]"),
      ),

    slice_expression: ($) =>
      prec(
        PREC.postfix,
        seq(
          field("value", $._expression),
          "[",
          field("start", $._expression),
          "..",
          field("end", $._expression),
          "]",
        ),
      ),

    unwrap_expression: ($) =>
      prec(PREC.postfix, seq(field("value", $._expression), "!")),

    propagate_expression: ($) =>
      prec(PREC.ternary, seq(field("value", $._expression), "?")),

    unary_expression: ($) =>
      prec.right(
        PREC.unary,
        seq(field("operator", choice("!", "-", "&")), field("operand", $._expression)),
      ),

    cast_expression: ($) =>
      prec.left(
        PREC.cast,
        seq(field("value", $._expression), "as", field("type", $._type)),
      ),

    binary_expression: ($) => {
      const table = [
        [PREC.coalesce, "??", prec.right],
        [PREC.or, "||", prec.left],
        [PREC.and, "&&", prec.left],
        [PREC.bitor, "|", prec.left],
        [PREC.bitxor, "^", prec.left],
        [PREC.bitand, "&", prec.left],
        [PREC.compare, "==", prec.left],
        [PREC.compare, "!=", prec.left],
        [PREC.compare, "<", prec.left],
        [PREC.compare, "<=", prec.left],
        [PREC.compare, ">", prec.left],
        [PREC.compare, ">=", prec.left],
        [PREC.shift, "<<", prec.left],
        [PREC.shift, ">>", prec.left],
        [PREC.additive, "+", prec.left],
        [PREC.additive, "-", prec.left],
        [PREC.multiplicative, "*", prec.left],
        [PREC.multiplicative, "/", prec.left],
        [PREC.multiplicative, "%", prec.left],
      ];
      return choice(
        ...table.map(([precedence, operator, assoc]) =>
          assoc(
            precedence,
            seq(
              field("left", $._expression),
              field("operator", operator),
              field("right", $._expression),
            ),
          ),
        ),
      );
    },

    conditional_expression: ($) =>
      prec.right(
        PREC.ternary,
        seq(
          field("condition", $._expression),
          "?",
          field("consequence", $._expression),
          ":",
          field("alternative", $._expression),
        ),
      ),

    // ---------------------------------------------------------------
    // Composite literals
    // ---------------------------------------------------------------

    // Trailing commas are allowed (parser.c breaks on '}' inside the loop).
    // Negative dynamic precedence: when `name {` is ambiguous with a block
    // (if/while/for/match headers), prefer the block.
    struct_literal: ($) =>
      prec.dynamic(
        -1,
        seq(
          optional(field("type", choice($.identifier, $.field_expression))),
          "{",
          commaSep($.field_initializer),
          optional(","),
          "}",
        ),
      ),

    field_initializer: ($) =>
      seq(field("name", $.identifier), ":", field("value", $._expression)),

    array_literal: ($) =>
      seq("[", commaSep($._expression), optional(","), "]"),

    enum_literal: ($) =>
      prec.right(
        PREC.postfix,
        seq(
          ".",
          field("name", $.identifier),
          optional(seq("(", field("payload", $._expression), ")")),
        ),
      ),

    // ---------------------------------------------------------------
    // Match
    // ---------------------------------------------------------------

    match_expression: ($) =>
      seq(
        "match",
        field("value", $._expression),
        "{",
        repeat($.match_arm),
        "}",
      ),

    match_arm: ($) =>
      seq(
        field("pattern", choice("_", commaSep1($.match_pattern))),
        "=>",
        field("value", choice($.block, $._expression)),
        optional(","),
      ),

    match_pattern: ($) =>
      seq($._expression, optional(seq("...", field("end", $._expression)))),

    // ---------------------------------------------------------------
    // Terminals
    // ---------------------------------------------------------------

    identifier: (_) => /[a-zA-Z_][a-zA-Z0-9_]*/,

    number_literal: (_) =>
      token(
        choice(
          /0[xX][0-9a-fA-F]+/,
          /[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?/,
        ),
      ),

    char_literal: (_) => token(seq("'", choice(/[^'\\\n]/, /\\./), "'")),

    string_literal: ($) =>
      seq('"', repeat(choice($.escape_sequence, /[^"\\]+/)), '"'),

    escape_sequence: (_) => token.immediate(/\\./),

    boolean_literal: (_) => choice("true", "false"),

    null_literal: (_) => "null",

    line_comment: (_) => token(seq("//", /[^\n]*/)),

    block_comment: (_) => token(seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/")),
  },
});

function commaSep(rule) {
  return optional(commaSep1(rule));
}

function commaSep1(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

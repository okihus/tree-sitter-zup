; Zup highlight queries.
; Ordered general → specific: in Neovim, later patterns override earlier ones.

; --- Identifiers -----------------------------------------------------------

(identifier) @variable

((identifier) @constant
  (#match? @constant "^[A-Z][A-Z0-9_]*$"))

; --- Types -----------------------------------------------------------------

(primitive_type) @type.builtin

(type_identifier) @type

(qualified_type
  module: (identifier) @module)

(struct_declaration
  name: (identifier) @type)

(enum_declaration
  name: (identifier) @type)

(struct_literal
  type: (identifier) @type)

(struct_literal
  type: (field_expression
    field: (identifier) @type))

; The two positions where the grammar knows a name is an interface. Uses in
; type position (`fn run(w: Writer)`) are indistinguishable from a struct, so
; those stay plain @type. Editors that don't know @type.interface fall back to
; @type by truncating at the last dot.
(interface_declaration
  name: (identifier) @type.interface)

(implements_list
  (type_identifier) @type.interface)

(implements_list
  (qualified_type
    name: (type_identifier) @type.interface))

; --- Functions and parameters ----------------------------------------------

(function_declaration
  name: (identifier) @function)

(extern_function_declaration
  name: (identifier) @function)

(method_signature
  name: (identifier) @function)

(call_expression
  function: (identifier) @function.call)

(call_expression
  function: (field_expression
    field: (identifier) @function.method.call))

(parameter
  name: (identifier) @variable.parameter)

((identifier) @variable.builtin
  (#eq? @variable.builtin "self"))

; --- Members ---------------------------------------------------------------

(field_declaration
  name: (identifier) @variable.member)

(field_initializer
  name: (identifier) @variable.member)

(field_expression
  field: (identifier) @variable.member)

(enum_member
  name: (identifier) @constant)

(enum_literal
  name: (identifier) @constant)

; --- Literals --------------------------------------------------------------

(number_literal) @number

; Decimal digits, separators included, followed by '.' or an exponent — never
; hex (0xFEED).
((number_literal) @number.float
  (#match? @number.float "^[0-9][0-9_]*(\\.|[eE])"))

(char_literal) @character

(string_literal) @string

(escape_sequence) @string.escape

(boolean_literal) @boolean

(null_literal) @constant.builtin

; --- Keywords --------------------------------------------------------------

[
  "let"
  "const"
  "struct"
  "enum"
  "interface"
  "defer"
] @keyword

"fn" @keyword.function

"return" @keyword.return

[
  "if"
  "else"
  "match"
] @keyword.conditional

[
  "while"
  "for"
  "in"
  "break"
  "continue"
] @keyword.repeat

"import" @keyword.import

(visibility_modifier) @keyword.modifier

[
  "extern"
  "builtin"
] @keyword.modifier

[
  "as"
  "sizeof"
] @keyword.operator

; --- Operators and punctuation ---------------------------------------------

[
  "+" "-" "*" "/" "%"
  "==" "!=" "<" "<=" ">" ">="
  "&&" "||" "!"
  "&" "|" "^" "<<" ">>"
  "=" "+=" "-=" "*=" "/=" "%="
  "&=" "|=" "^=" "<<=" ">>="
  "++" "--"
  "?" "??" "??="
  ".." "..." "=>"
] @operator

[
  "(" ")"
  "[" "]"
  "{" "}"
] @punctuation.bracket

[
  ","
  ";"
  ":"
  "."
] @punctuation.delimiter

(match_arm
  "_" @character.special)

; --- Comments --------------------------------------------------------------

[
  (line_comment)
  (block_comment)
] @comment

((block_comment) @comment.documentation
  (#match? @comment.documentation "^/[*][*]"))

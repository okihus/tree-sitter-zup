; Zupt (sectioned test file) highlight queries.

(section_header) @keyword.directive

; The --TEST-- body is a prose description.
((section
  name: (section_header) @_name
  body: (section_body) @comment)
  (#match? @_name "^--TEST--"))

; Expected output sections read as opaque fixture data.
((section
  name: (section_header) @_name
  body: (section_body) @string)
  (#match? @_name "^--(EXPECT|EXPECTERR|EXPECT_ERR)--"))

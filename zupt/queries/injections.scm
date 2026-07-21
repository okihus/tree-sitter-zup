; The --FILE-- section body is zup source.
((section
  name: (section_header) @_name
  body: (section_body) @injection.content)
  (#match? @_name "^--FILE--")
  (#set! injection.language "zup")
  (#set! injection.include-children))

; --PREPARE-- and --CLEANUP-- bodies are shell.
((section
  name: (section_header) @_name
  body: (section_body) @injection.content)
  (#match? @_name "^--(PREPARE|CLEANUP)--")
  (#set! injection.language "bash")
  (#set! injection.include-children))

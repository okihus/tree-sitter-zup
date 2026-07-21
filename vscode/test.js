"use strict";

// Smoke test for highlighting.js outside VS Code:
//   node test.js <file.zup|file.zupt>
// Prints each token span with its text, type, and modifiers.

const fs = require("fs");
const path = require("path");
const { createHighlighter } = require("./highlighting");

async function main() {
  const file = process.argv[2];
  const text = fs.readFileSync(file, "utf8");
  const languageId = file.endsWith(".zupt") ? "zupt" : "zup";
  const highlighter = await createHighlighter(path.join(__dirname, "assets"));
  let prevEnd = -1;
  for (const t of highlighter.tokens(languageId, text)) {
    if (t.start < prevEnd) throw new Error(`overlap at ${t.start}`);
    prevEnd = t.end;
    const snippet = JSON.stringify(text.slice(t.start, t.end)).slice(0, 40);
    console.log(
      `${String(t.start).padStart(5)}-${String(t.end).padEnd(5)} ${t.type.padEnd(16)} ${(t.modifiers || []).join(",").padEnd(14)} ${snippet}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

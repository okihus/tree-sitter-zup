#!/usr/bin/env bash
#
# Parse a zup compiler checkout against this grammar; fail on any ERROR or
# MISSING node. Usage: check-zup-corpus.sh [zup-checkout]  (default ~/Projects/zup)
#
# Three passes:
#   1. examples/, std/ and src/ *.zup -> zup grammar
#   2. tests/ *.zupt                  -> zupt grammar (section structure only)
#   3. tests/ --FILE-- section bodies -> zup grammar
#
# Pass 1 includes src/, the self-hosted compiler itself, because it is both the
# largest body of real zup upstream has (twice examples/ and std/ combined) and
# the first place new syntax gets used — zig-style multiline strings landed
# there, and only there, and so stayed invisible to a pass 1 that only read
# examples/ and std/.
#
# Pass 3 exists because `tree-sitter parse` does not resolve injections: the zup
# inside a --FILE-- body is completely invisible to pass 2. Without it the
# tripwire cannot see the language it exists to guard — interfaces landed
# upstream and shipped for weeks without turning CI red.
#
# Some bodies are *meant* to be unparseable, and are skipped by two rules:
#
#   * The file contains "(got TOKEN_", the shape of the reference parser's own
#     parse diagnostics (parser.zup's expect()/parseError()). A test asserting
#     one is asserting that the syntax is invalid, so we must not parse it. This
#     keys off the compiler's message format rather than a directory name, so it
#     keeps working as upstream moves tests around, and it deliberately leaves
#     the ~160 sema/ tests in scope: those assert *semantic* errors over
#     syntactically valid zup, which is exactly the coverage we want.
#   * The file is under tests/lexer/, whose bodies are bare token streams
#     ("3.14 1e9 2.5e-3 1..10 42") rather than programs.
#
# Anything else that should not be parsed goes in test/upstream-skip.txt, one
# checkout-relative path per line, with a reason; the list covers passes 1 and
# 3 alike. A new upstream parse-error test that matches neither rule will fail
# loudly here for a human to triage — for a tripwire that is the correct
# behaviour.

set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
zup_repo="$(realpath "${1:-$HOME/Projects/zup}")"
skip_file="$repo_root/test/upstream-skip.txt"

if [ ! -d "$zup_repo/tests" ]; then
  echo "not a zup checkout: $zup_repo" >&2
  exit 1
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

# Explicit skips, comments and blank lines stripped. awk rather than a
# `grep -v '^$'` pipeline: grep exits 1 when it matches nothing, which under
# pipefail would abort the run once the skip list is finally emptied.
skips="$work/.skips"
awk '{ sub(/#.*/, ""); sub(/[[:space:]]+$/, ""); if ($0 != "") print }' \
  "$skip_file" | sort > "$skips"

# --- pass 1: examples/, std/ and src/ ---------------------------------------

sources="$work/.sources"
: > "$sources"
src_total=0 src_skipped=0
while IFS= read -r -d '' f; do
  src_total=$((src_total + 1))
  if grep -qxF "${f#"$zup_repo"/}" "$skips"; then
    src_skipped=$((src_skipped + 1))
    continue
  fi
  printf '%s\0' "$f" >> "$sources"
done < <(find "$zup_repo/examples" "$zup_repo/std" "$zup_repo/src" \
  -name '*.zup' -print0)

echo "==> examples/, std/ and src/ (zup grammar): $((src_total - src_skipped)) of $src_total, $src_skipped skipped"
cd "$repo_root"
xargs -0 tree-sitter parse --quiet --stat all < "$sources"

# --- pass 2: .zupt section structure ---------------------------------------

echo "==> tests/ *.zupt section structure (zupt grammar)"
cd "$repo_root/zupt"
find "$zup_repo/tests" -name '*.zupt' -print0 \
  | xargs -0 tree-sitter parse --quiet --stat all

# --- pass 3: --FILE-- bodies ------------------------------------------------

bodies="$work/bodies"
mkdir -p "$bodies"

total=0 extracted=0 skipped=0
while IFS= read -r -d '' f; do
  total=$((total + 1))
  rel="${f#"$zup_repo"/}"

  if grep -qF '(got TOKEN_' "$f" \
    || [ "${rel#tests/lexer/}" != "$rel" ] \
    || grep -qxF "$rel" "$skips"; then
    skipped=$((skipped + 1))
    continue
  fi

  # Section headers own their whole line (see zupt/grammar.js); the --FILE--
  # body runs to the next header. The body is written out as *.zup so
  # tree-sitter picks the zup grammar by file type, not the zupt one.
  flat="${rel#tests/}"
  flat="${flat//\//__}"
  awk '
    /^--[A-Z][A-Z0-9_]*--[ \t]*$/ { in_file = ($0 ~ /^--FILE--/); next }
    in_file { print }
  ' "$f" > "$bodies/${flat%.zupt}.zup"
  extracted=$((extracted + 1))
done < <(find "$zup_repo/tests" -name '*.zupt' -print0)

echo "==> tests/ --FILE-- bodies (zup grammar): $extracted of $total, $skipped skipped"
cd "$repo_root"
find "$bodies" -name '*.zup' -print0 \
  | xargs -0 tree-sitter parse --quiet --stat all

echo "OK"

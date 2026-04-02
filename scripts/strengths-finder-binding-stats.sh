#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TMP_FILE="$(mktemp /tmp/strengths_binding_stats.XXXXXX.js)"
trap 'rm -f "$TMP_FILE"' EXIT

cat > "$TMP_FILE" <<'EOF'
var window = {};
var document = { querySelector: function () { return null; } };
var console = console || { error: function () {} };
EOF

cat "$ROOT_DIR/assets/scripts/strengths-finder-model.js" >> "$TMP_FILE"
printf '\n' >> "$TMP_FILE"
cat "$ROOT_DIR/assets/scripts/strengths-finder-questions.js" >> "$TMP_FILE"
cat >> "$TMP_FILE" <<'EOF'

window.__STRENGTHS_FINDER_MODEL__.enrichQuestions(window.__STRENGTHS_FINDER_QUESTIONS__);
JSON.stringify(window.__STRENGTHS_FINDER_BINDING_STATS__, null, 2);
EOF

osascript -l JavaScript "$TMP_FILE"

# Contributing to Refract

Thank you for helping improve **Refract**! Contributions to extraction heuristics, ontology schemas, documentation, and cross-platform plugin support are very welcome.

## Prerequisites

- **Node.js `>= 18`** (Refract uses built-in Node ESM APIs only — **zero external npm dependencies**).
- **`playwright-cli`** installed on `PATH` (or via `PLAYWRIGHT_CLI_BIN`) with Chromium available for live browser tests.
- **`claude`** CLI (optional, for Claude Code validation) and/or **`agy`** CLI (optional, for Antigravity validation).

## Development Principles

1. **Zero external runtime dependencies**: Keep all scripts under `skills/extract-referent/scripts/` pure Node.js built-ins (`node:*`) and browser-standard DOM/CSSOM APIs.
2. **Evidence-first extraction**: Never fabricate design tokens, contrast ratios, breakpoints, or component states. Ensure `compile-artifacts.mjs` emits only measured values or explicitly tagged `inferred` metadata.
3. **Multi-provider parity**: Keep shared components (`skills/`, `agents/`, `assets/`) compatible with `.claude-plugin/plugin.json`, `.antigravity-plugin/plugin.json`, `.codex-plugin/plugin.json`, and `.cursor-plugin/plugin.json` (plus `.cursor/rules/refract-guardrails.mdc` for Cursor and `rules/AGENTS.md` for Antigravity). Use `${CLAUDE_PLUGIN_ROOT}` alongside relative paths where scripts are invoked.
4. **Preserve executable bits**: Ensure scripts in `skills/extract-referent/scripts/` remain executable (`chmod 0755`).

## Validation Checklist Before Opening a PR

Run these checks locally before submitting:

```bash
# 1. Check Node syntax for all scripts
node --check skills/extract-referent/scripts/browser-probe.js
node --check skills/extract-referent/scripts/capture-referent.mjs
node --check skills/extract-referent/scripts/compile-artifacts.mjs
node --check skills/extract-referent/scripts/validate-artifacts.mjs

# 2. Validate Claude Code plugin manifest & components
claude plugin validate --strict .
claude plugin validate --strict --profile directory .

# 3. Validate Antigravity plugin manifest & components
agy plugin validate --strict .

# 4. Validate all 4 provider manifests & Cursor .mdc rule
node -e '
  const fs = require("node:fs");
  for (const p of [".antigravity-plugin/plugin.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json", ".cursor-plugin/plugin.json"]) {
    const m = JSON.parse(fs.readFileSync(p, "utf8"));
    if (m.name !== "refract") throw new Error("Unexpected name in " + p);
  }
  console.log("All 4 provider manifests OK");
'
```

If you modified `compile-artifacts.mjs`, `browser-probe.js`, or `validate-artifacts.mjs`, also run an end-to-end capture against a local or public URL with `--compile` and confirm `validate-artifacts.mjs` reports all 7 artifacts passing.

## Pull Request Process

1. Fork the repository and create a feature branch from `main`.
2. Make focused changes and update `CHANGELOG.md` under `[Unreleased]`.
3. Verify all validation commands above pass with zero errors and zero warnings.
4. Open a Pull Request using `.github/PULL_REQUEST_TEMPLATE.md`.

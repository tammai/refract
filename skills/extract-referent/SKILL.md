---
name: extract-referent
description: >-
  Extract measured W3C design tokens (DTCG JSON), CSS custom properties,
  Tailwind v4/v3 theme configs, structured UI ontologies (YAML/JSON), and an
  agent-ready DESIGN.md specification from a live website referent URL. Use when
  the user wants to reverse-engineer, capture, or tokenize a reference site's
  visual system and UI architecture.
argument-hint: "<url> [--out <dir>]"
---

# Extract Design Tokens & UI Ontology from a Live Referent

Follow this five-step pipeline whenever extracting a design system and UI ontology from a live URL. Resolve paths either relative to this skill directory (`scripts/...`, `references/...`) or, when running inside Claude Code, using `"${CLAUDE_PLUGIN_ROOT}/skills/extract-referent/..."`.

## Guardrails

- **Evidence first**: Never fabricate hex codes, font stacks, spacing values, shadows, or component behaviors. Anchor every emitted token and ontology node to measured values in `raw/capture.json`, CSS stylesheets, or DOM/ARIA snapshots. Mark any visually inferred properties explicitly as `inferred`.
- **Three-tier token hierarchy**: Keep `primitive` -> `semantic` -> `component` layering strict using W3C DTCG (`$type`, `$value`, `$description`, `{alias.path}`).
- **Separate appearance from structure**: Design tokens define visual styling (`tokens.dtcg.json`, `tokens.css`, Tailwind themes); UI ontology (`ui-ontology.yaml`, `ui-ontology.json`) defines structural regions, component archetypes, slots, states, composition rules, and invariants.
- **Preserve light/dark and responsive truth**: Record measured light vs. dark mode overrides and desktop vs. mobile layout shifts instead of extrapolating missing themes.

## 1. Run Deterministic Browser Capture & Initial Compile

Execute `capture-referent.mjs` against the target URL:

```bash
# From this skill directory (or prefix with ${CLAUDE_PLUGIN_ROOT}/skills/extract-referent/):
node scripts/capture-referent.mjs "<url>" --out "<out-dir>" --compile
```

In Claude Code:

```bash
node "${CLAUDE_PLUGIN_ROOT}/skills/extract-referent/scripts/capture-referent.mjs" "<url>" --out "<out-dir>" --compile
```

Useful flags:
- `--out <dir>`: Output directory (defaults to `./referent-extract/<host>-<timestamp>`)
- `--viewports desktop:1440x900,mobile:390x844`: Comma-separated viewports
- `--modes light,dark`: Color-scheme modes to emulate
- `--all-matrix`: Capture every `viewport × mode` pair (by default captures `desktop-light`, `desktop-dark`, and `mobile-light`)
- `--wait <ms>`: Extra settle delay after load/resize/mode switch (default `1000`)
- `--no-hover-probe`: Skip interactive `:hover` / `:focus-visible` style delta probing
- `--no-screenshots`: Skip PNG captures

This produces `<out-dir>/raw/` (`capture.json`, `*.png`, `*.snapshot.yaml`) plus initial compiled artifacts in `<out-dir>/`.

## 2. Inspect Captured Visuals & Raw Measurements

Before editing any compiled output, inspect:
1. `<out-dir>/raw/desktop-light.png` (and `desktop-dark.png`, `mobile-light.png` if present) using your file-reading tool (`Read` in Claude Code / Cursor, `read_file` in Antigravity, or your agent's file/image viewer in Codex) to verify visual hierarchy, surface layering, typography tone, and responsive shifts.
2. `<out-dir>/raw/desktop-light.snapshot.yaml` for accessibility roles, landmarks, and element boxes.
3. `<out-dir>/raw/capture.json` for declared CSS custom properties, `@font-face` rules, breakpoints, computed color/type/spacing frequencies, and hover/focus deltas.

## 3. Refine Design Tokens

Review and refine `tokens.dtcg.json`, `tokens.css`, `tailwind.theme.css`, and `tailwind.config.mjs` using [dtcg-schema.md](references/dtcg-schema.md) and [token-heuristics.md](references/token-heuristics.md):
- Keep `primitive` -> `semantic` -> `component` layering strict (`{primitive.*}` and `{semantic.*}` aliases).
- Rename auto-generated color keys (e.g., `palette-1`) to meaningful names only when obvious from CSS variable names or hue, keeping measured values exact.
- Preserve `modes.dark` overrides strictly from measured dark-mode differences (never fabricate missing dark tokens).
- Keep `tokens.css`, `tailwind.theme.css`, and `tailwind.config.mjs` synchronized with `tokens.dtcg.json`.

## 4. Refine UI Ontology & `DESIGN.md`

Review and enrich `ui-ontology.yaml`, `ui-ontology.json`, and `DESIGN.md` using [../audit-ui-ontology/references/ontology-schema.md](../audit-ui-ontology/references/ontology-schema.md) and [../audit-ui-ontology/references/design-md-template.md](../audit-ui-ontology/references/design-md-template.md):
- Verify `designGrammar` (aesthetic thesis, density, grid rhythm, responsive behavior).
- Verify each component archetype's `anatomy` (named slots and optionality), `variants`, `states` (default/hover/focus/disabled/active), and `composition` (`allowedParents`, `allowedChildren`).
- Record concrete DO / DON'T reproduction guardrails in `DESIGN.md` anchored to measured values.
- Tag any observation inferred visually from screenshots rather than DOM/CSS measurements as `inferred`.

## 5. Validate Output Bundle

Run the validator after all edits:

```bash
node scripts/validate-artifacts.mjs "<out-dir>"
# Or in Claude Code:
node "${CLAUDE_PLUGIN_ROOT}/skills/extract-referent/scripts/validate-artifacts.mjs" "<out-dir>"
```

Fix any broken DTCG aliases, missing required keys, syntax errors, or unresolved placeholders and re-run `validate-artifacts.mjs` until every check passes.

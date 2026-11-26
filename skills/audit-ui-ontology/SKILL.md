---
name: audit-ui-ontology
description: >-
  Audit, refine, or diff extracted UI ontologies and design token bundles,
  check WCAG contrast and structural invariants, or synthesize agent-ready
  DESIGN.md and coding-agent UI rules from referent captures. Use when the
  user wants to inspect, validate, compare, or document an existing UI capture.
argument-hint: "<out-dir> [<compare-dir>]"
---

# Audit & Refine UI Ontology

Use this skill when working with an already-captured referent directory (`<out-dir>`) or comparing two captured referents. Resolve reference links relative to this skill directory (or via `"${CLAUDE_PLUGIN_ROOT}/skills/audit-ui-ontology/..."` in Claude Code).

## Guardrails

- Never fabricate unmeasured values, contrast ratios, breakpoints, or states; tag any observation inferred visually from screenshots as `inferred`.
- Validate all edits to `tokens.*`, `ui-ontology.*`, and `DESIGN.md` with `validate-artifacts.mjs` before finishing.

## 1. Audit an Existing Extraction

Read the target files in `<out-dir>`:
1. `ui-ontology.json` / `ui-ontology.yaml` — verify conformance with [ontology-schema.md](references/ontology-schema.md).
2. `tokens.dtcg.json` — verify three-tier aliasing (`primitive` -> `semantic` -> `component`) and `modes.dark`.
3. `raw/*.png` and `raw/*.snapshot.yaml` — cross-check structural claims against actual rendered screenshots and ARIA landmarks using your file-reading tool (`Read` in Claude Code / Cursor, `read_file` in Antigravity, or your agent's file/image viewer in Codex).
4. `DESIGN.md` — verify completeness against [design-md-template.md](references/design-md-template.md).

Check these core invariants:
- **WCAG Contrast**: Flag any text/surface or button-label/button-bg pair below `4.5:1` (normal text) or `3.0:1` (large text >= 24px or >= 18.67px bold).
- **Heading Hierarchy**: Flag skipped heading levels (e.g., `h1` jumping directly to `h3`) or missing `<h1>`.
- **Interactive States**: Confirm buttons, links, and inputs document measurable `:hover` and `:focus-visible` transitions or outline rules.
- **Mobile Touch Targets**: Flag interactive targets smaller than `44×44px` in mobile captures.
- **Responsive Parity**: Verify `desktop` vs `mobile` layout shifts (navigation collapse, grid column reduction, sticky bars) are documented.

## 2. Compare Two Referents (Diff Mode)

When asked to compare two captured referent directories (`<dir-a>` and `<dir-b>`):
1. Compare semantic tokens (`surface.canvas`, `text.primary`, `accent.primary`, type scale ratio, base spacing unit, radii, shadow weight).
2. Compare `designGrammar` (density, surface layering model, navigation archetype, layout width).
3. Compare component archetypes, slot complexity, and invariant pass rates.
4. Present a structured comparison table highlighting token deltas, structural differences, and trade-offs.

## 3. Generate Coding-Agent Reproduction Rules

When asked to turn a capture into project rules (`DESIGN.md`, `AGENTS.md`, `.agents/rules/design-system.md`, or `.cursor/rules/design-system.mdc`):
- Populate every section of [design-md-template.md](references/design-md-template.md) with concrete measured values and token names.
- Include explicit **DO** and **DON'T** rules that prevent common LLM drift (wrong font weights, over-rounded corners, generic Tailwind colors replacing referent tokens, missing dark-mode pairs).
- Run `validate-artifacts.mjs` after any edits:

```bash
node ../extract-referent/scripts/validate-artifacts.mjs "<out-dir>"
# Or in Claude Code:
node "${CLAUDE_PLUGIN_ROOT}/skills/extract-referent/scripts/validate-artifacts.mjs" "<out-dir>"
```

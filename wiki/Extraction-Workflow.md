# Extraction Workflow

Refract follows a five-step evidence-first workflow when extracting a design system and UI ontology from a live URL, plus an audit/comparison workflow for existing captures.

## Guardrails

1. **Evidence first**: Never fabricate hex codes, font stacks, spacing values, shadows, or component behaviors. Anchor every token and ontology node to `raw/capture.json`, CSS stylesheets, or DOM/ARIA snapshots. Mark visually inferred properties explicitly as `inferred`.
2. **Three-tier token hierarchy**: Strictly separate `primitive` (raw values) -> `semantic` (role aliases) -> `component` (component bindings) in W3C DTCG format.
3. **Separate appearance from structure**: Tokens capture visual styling; UI ontology captures regions, surfaces, component archetypes, slot anatomy, variants, state machines, composition rules, and invariants.
4. **Preserve light/dark and responsive truth**: Record measured `desktop-dark` and `mobile-light` deltas rather than extrapolating missing states.
5. **Validate before finishing**: Always pass `validate-artifacts.mjs` with zero errors after any manual or agent edits.

---

## Stage 1: Deterministic Capture & Initial Compile

Run `capture-referent.mjs`:

```bash
node skills/extract-referent/scripts/capture-referent.mjs "<url>" \
  --out "<out-dir>" \
  --compile
```

*(In Claude Code, prefix scripts with `"${CLAUDE_PLUGIN_ROOT}/skills/extract-referent/scripts/..."`.)*

### CLI Flags

| Flag | Default | Description |
| --- | --- | --- |
| `--out <dir>` | `./referent-extract/<host>-<timestamp>` | Output directory for `raw/` and compiled artifacts |
| `--viewports <list>` | `desktop:1440x900,mobile:390x844` | Comma-separated `[name:]WxH` viewports |
| `--modes <list>` | `light,dark` | Color schemes emulated via `prefers-color-scheme` |
| `--all-matrix` | `false` | Capture every `viewport × mode` pair (default captures `desktop-light`, `desktop-dark`, `mobile-light`) |
| `--wait <ms>` | `1000` | Extra settle delay after `document.fonts.ready` / resize / mode switch |
| `--no-hover-probe` | `false` | Skip live Playwright `:hover` / `:focus-visible` style probing |
| `--no-screenshots` | `false` | Skip PNG screenshot generation |
| `--compile` | `false` | Automatically run `compile-artifacts.mjs` and `validate-artifacts.mjs` |

### Common Capture Recipes

```bash
# Capture every viewport × mode combination (including mobile-dark)
node skills/extract-referent/scripts/capture-referent.mjs https://example.com \
  --all-matrix --out ./out --compile

# Slow-hydrating SPA or webfont-heavy marketing page
node skills/extract-referent/scripts/capture-referent.mjs https://example.com \
  --wait 3000 --out ./out --compile

# Custom tablet breakpoint added alongside desktop and mobile
node skills/extract-referent/scripts/capture-referent.mjs https://example.com \
  --viewports desktop:1440x900,tablet:768x1024,mobile:390x844 --out ./out --compile
```

---

## Stage 2: Visual & Structural Grounding

Before refining any compiled output, inspect the raw evidence in `<out-dir>/raw/`:

1. **Screenshots** (`desktop-light.png`, `desktop-dark.png`, `mobile-light.png`): Verify surface layering, visual density, typography tone, dark-mode switching, and responsive shifts.
2. **ARIA Box Snapshots** (`desktop-light.snapshot.yaml`, etc.): Verify accessibility roles, landmark structure, and bounding boxes.
3. **Telemetry JSON** (`capture.json`): Inspect declared `--*` CSS custom properties, `@font-face` declarations, `@media` breakpoints, computed color/type/spacing clusters, and `:hover` / `:focus-visible` probe deltas.

---

## Stage 3: Refine Design Tokens

Review `tokens.dtcg.json`, `tokens.css`, `tailwind.theme.css`, and `tailwind.config.mjs`:

- Keep `primitive` -> `semantic` -> `component` `{alias.path}` chains intact.
- Rename auto-generated color keys (such as `palette-1`) to meaningful semantic names only when supported by CSS variable names or observed usage, keeping exact measured hex values.
- Keep `modes.dark` limited to measured `desktop-dark` differences.
- Keep `tokens.css`, `tailwind.theme.css`, and `tailwind.config.mjs` synchronized with `tokens.dtcg.json`.

*(If you only need to regenerate initial artifacts from `raw/capture.json` without re-launching Chromium, run `node skills/extract-referent/scripts/compile-artifacts.mjs <out-dir>/raw/capture.json --out <out-dir>`.)*

---

## Stage 4: Refine UI Ontology & `DESIGN.md`

Review `ui-ontology.yaml`, `ui-ontology.json`, and `DESIGN.md`:

- Verify `designGrammar` (`density`, `surfaceModel`, `layoutStructure`, `maxContentWidth`, `baseGridUnit`, `breakpoints`).
- Verify every component archetype's `anatomy` (required/optional slots), `variants`, `states` (`default`, `hover`, `focusVisible`), and `composition` (`allowedParents`, `allowedChildren`).
- Tag any observation inferred visually from screenshots rather than DOM/CSS measurements as `inferred`.
- Ensure `DESIGN.md` contains concrete **DO / DON'T** rules anchored to measured tokens and invariants.

---

## Stage 5: Validate Output Bundle

Run the validator after all edits and resolve any reported errors before finishing:

```bash
node skills/extract-referent/scripts/validate-artifacts.mjs "<out-dir>"
```

The validator checks:
- DTCG `$type` inheritance and full `{alias.path}` resolution with cycle detection
- Balanced braces and non-empty custom properties in `tokens.css` and `tailwind.theme.css`
- ESM syntax and `theme.extend` export in `tailwind.config.mjs`
- Required top-level keys and component schemas in `ui-ontology.json` and `ui-ontology.yaml`
- Required sections and zero unresolved `{{...}}` placeholders in `DESIGN.md`

---

## Auditing & Comparing Referents (`audit-ui-ontology`)

Use the `audit-ui-ontology` skill on existing captures:

- **Audit Mode**: Cross-check `ui-ontology.*`, `tokens.dtcg.json`, `raw/*.png`, `raw/*.snapshot.yaml`, and `DESIGN.md` for:
  - WCAG 2.1 contrast (`>= 4.5:1` normal text, `>= 3.0:1` large text `>= 24px` or `>= 18.67px` bold)
  - Heading hierarchy order (`h1`–`h6` without skipped levels)
  - Measurable `:hover` and `:focus-visible` transitions/outlines
  - Mobile touch targets `< 44×44px`
  - Desktop vs. mobile responsive parity
- **Diff Mode (`<dir-a> <dir-b>`)**: Compare semantic tokens (`surface.canvas`, `text.primary`, `accent.primary`, type scale, spacing unit, radii, shadow weight), `designGrammar`, component slot complexity, and invariant pass rates side by side.
- **Agent Rule Generation**: Distill a capture into `DESIGN.md`, `AGENTS.md`, `.agents/rules/design-system.md`, or `.cursor/rules/design-system.mdc`.

# Architecture & Heuristics

Refract separates **deterministic headless browser telemetry**, **statistical token/ontology compilation**, **strict validation**, and **agent-led visual & semantic refinement**.

---

## Stage 1: Browser Capture (`capture-referent.mjs` + `browser-probe.js`)

1. **Ephemeral Browser Sessions**:
   - Creates an isolated `playwright-cli` session (`-s=ure-<hex>`) and always closes it in a `finally` block so background browser processes do not leak.
2. **Default Capture Matrix**:
   - Captures `desktop-light` (`1440×900`, `light`), `desktop-dark` (`1440×900`, `dark`), and `mobile-light` (`390×844`, `light`).
   - Pass `--all-matrix` to capture every `viewport × mode` combination.
3. **Stylesheet & CSSOM Scan**:
   - Iterates `document.styleSheets`, catching cross-origin `SecurityError` exceptions and incrementing `crossOriginStylesheetsSkipped`.
   - Extracts declared `--*` custom properties (with selector and `@media` context), `@font-face` rules, `@media` width breakpoints, and `@keyframes` names.
4. **Visible Element Sampling (up to 1,500 nodes)**:
   - Prioritizes landmarks, headings, interactive controls, and representative descendants.
   - Walks ancestor elements to alpha-composite the **effective opaque background** behind sampled text nodes (falling back to canvas) so WCAG 2.1 contrast ratios reflect what users actually see.
5. **Structural Ontology & Live Interaction Probing**:
   - Records landmark bounding boxes (`desktopBox` vs. `mobileBox`) to infer responsive shifts.
   - Detects semantic controls (`button`, `link`, `input`, `checkbox`, `radio`, `switch`, `tab`, `form`, `table`, `dialog`, `alert`, `badge`) and **repeating sibling structural fingerprints** (e.g., `img+h3+p` grids) as `card` components with slot anatomy.
   - Executes real Playwright `locator.hover()` and `locator.focus()` probes on up to 6 representative interactive targets to record `:hover` and `:focus-visible` style deltas.
   - Captures ARIA `--boxes` YAML snapshots and PNG screenshots.

---

## Stage 2: Token & Ontology Heuristics (`compile-artifacts.mjs`)

### Color Clustering & Role Assignment

- Converts `rgb()`, `rgba()`, `hsl()`, and hex strings into normalized `#rrggbb` (or `#rrggbbaa`), ignoring fully transparent (`alpha === 0`) values.
- Clusters near-identical sampled colors (Euclidean RGB distance `<= 10`) weighted by element bounding area and instance count, while keeping declared `--*` CSS custom properties verbatim.
- Assigns semantic roles:
  - `surface.canvas`: Dominant `body` / `html` / `main` background weighted by area.
  - `surface.elevated`: Opaque card/panel/modal/header backgrounds differing from `canvas`.
  - `surface.subtle`: Secondary muted backgrounds (inputs, table headers, subtle badges, hover tints).
  - `surface.inverse`: High-contrast opposite-polarity surface (e.g., dark footer/tooltip on light canvas).
  - `text.primary` / `text.secondary` / `text.muted` / `text.link`: Frequency and contrast-ordered text inks.
  - `accent.primary`: Highest-chroma interactive color on primary buttons, active tabs, and focus rings.
  - `status.*` (`success`, `warning`, `danger`, `info`): Emitted only when observed in CSS variables or semantic alert/badge/error elements—never invented.

### Scale & Grammar Inference

- **Typography**: Clusters `(fontFamily, fontSize, fontWeight, lineHeight, letterSpacing)`, detects `body` (typically `14px`–`18px`, weight `400`), maps `h1`–`h6` and `display` (`>= 2.25 × bodySize`), and separates `code`, `label`, and `caption`.
- **Spacing Base Unit**: Computes the greatest common divisor across frequent non-zero `padding`, `gap`, and `margin` values (`4px`, `8px`, `6px`).
- **Radii**: Buckets measured `borderRadius` values into `none` (`0px`), `sm` (`2–6px`), `md` (`6–12px`), `lg` (`12–20px`), `xl` (`20–32px`), and `full` (`>= 999px` or `50%`).
- **Elevation & Motion**: Orders non-`none` `boxShadow` values by blur + spread magnitude and pairs non-zero `transitionDuration` and `transitionTimingFunction` values.

---

## Stage 3: Multi-Provider Repository Architecture

Refract shares `skills/`, `agents/`, and `assets/` across four plugin providers while isolating provider-specific manifests and rules:

```text
refract/
├── .claude-plugin/plugin.json            # Claude Code manifest
├── .antigravity-plugin/plugin.json       # Antigravity manifest
├── .codex-plugin/plugin.json             # OpenAI Codex manifest
├── .cursor-plugin/plugin.json            # Cursor manifest
├── .cursor/rules/refract-guardrails.mdc  # Cursor intelligent rule (.mdc)
├── agents/referent-analyst.md            # Shared custom agent / subagent
├── rules/AGENTS.md                       # Antigravity always-on rules
├── skills/
│   ├── extract-referent/                 # Capture + compile + validate skill & scripts
│   └── audit-ui-ontology/                # Audit, diff, and DESIGN.md skill
├── assets/                               # Logo + GitHub social preview
├── docs/                                 # Repository guides
└── wiki/                                 # Publish-ready GitHub Wiki pages
```

Key isolation invariants:
- **No root `plugin.json`** and **no root `.agents/` directory**, preventing schema or workspace discovery collisions between Antigravity, Claude Code, Codex, and Cursor.
- **Rule isolation**: Antigravity reads `rules/AGENTS.md` (plain Markdown, no frontmatter), while `.cursor-plugin/plugin.json` explicitly sets `"rules": ".cursor/rules/refract-guardrails.mdc"` so Cursor does not scan `rules/` and double-load `rules/AGENTS.md`.

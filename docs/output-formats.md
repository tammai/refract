# Output Formats Reference

Running `capture-referent.mjs --compile` (or `compile-artifacts.mjs`) writes **7 compiled artifacts** alongside the raw capture bundle in `<out-dir>/raw/`.

## Directory Layout

```text
<out-dir>/
├── raw/
│   ├── capture.json                 # Merged multi-state telemetry & hover/focus probes
│   ├── desktop-light.png            # Desktop light-mode screenshot
│   ├── desktop-light.snapshot.yaml  # Accessibility tree with element bounding boxes
│   ├── desktop-dark.png             # Desktop dark-mode screenshot
│   ├── desktop-dark.snapshot.yaml
│   ├── mobile-light.png             # Mobile light-mode screenshot
│   └── mobile-light.snapshot.yaml
├── tokens.dtcg.json                 # W3C DTCG three-tier token bundle
├── tokens.css                       # CSS custom properties (:root + dark mode)
├── tailwind.theme.css               # Tailwind CSS v4 @theme block
├── tailwind.config.mjs              # Tailwind CSS v3 theme.extend module
├── ui-ontology.yaml                 # Human-readable UI ontology
├── ui-ontology.json                 # Machine-readable UI ontology
└── DESIGN.md                        # Agent-ready design specification
```

---

## 1. `tokens.dtcg.json` (W3C DTCG)

Follows the W3C Design Tokens Community Group specification with three semantic layers plus dark-mode overrides:

- **`primitive`**: Raw measured palette colors, font families, sizes, weights, line heights, spacing steps, radii, border widths, shadows, durations, easings, and breakpoints.
- **`semantic`**: Role-mapped aliases (`surface.canvas`, `text.primary`, `accent.primary`, `typography.h1`, `space.*`, `radius.*`, `elevation.*`) referencing `{primitive.*}`.
- **`component`**: Component-level bindings (`component.button.primary.bg`, `component.card.bg`) referencing `{semantic.*}`.
- **`modes.dark`**: Color overrides captured from `desktop-dark` when they differ from `desktop-light`.

Compatible with [Style Dictionary](https://styledictionary.com/) v4+ and Tokens Studio.

---

## 2. `tokens.css`

Ready-to-import CSS custom properties with semantic variables, measured referent `--*` variables, and automatic dark-mode blocks under both `@media (prefers-color-scheme: dark)` and `[data-theme="dark"], .dark`:

```css
:root {
  --color-surface-canvas: #f8fafc;
  --color-text-primary: #0f172a;
  --color-accent-primary: #2563eb;
  --font-sans: Inter, -apple-system, system-ui, Segoe UI, sans-serif;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-surface-canvas: #0b1120;
    --color-text-primary: #f8fafc;
  }
}
```

---

## 3. `tailwind.theme.css` (Tailwind CSS v4)

Drop directly into your global CSS entry file:

```css
@import "tailwindcss";
@import "./tailwind.theme.css";
```

Generates `--color-*`, `--font-*`, `--radius-*`, and `--shadow-*` variables inside `@theme { ... }`.

---

## 4. `tailwind.config.mjs` (Tailwind CSS v3)

Standard ESM `export default { theme: { extend: { colors, fontFamily, borderRadius, boxShadow, spacing } } }` ready to spread or import into `tailwind.config.js`.

---

## 5. `ui-ontology.yaml` & `ui-ontology.json`

Captures the structural grammar of the referent separately from its visual styling:

- **`meta`**: Source URL, title, timestamp, captured states, skipped CORS stylesheets.
- **`designGrammar`**: Density (`airy` | `balanced`), `surfaceModel` (`flat` | `bordered-flat` | `elevated-cards`), `layoutStructure`, `maxContentWidth`, `baseGridUnit`, `breakpoints`.
- **`regions`**: Landmark hierarchy (`header`, `nav`, `main`, `aside`, `footer`, `section`) with `positioning`, `desktopBox`, `mobileBox`, and inferred `responsiveBehavior`.
- **`surfaces`**: Page canvas, elevated card, and subtle container surfaces across light/dark modes.
- **`components`**: Grouped by archetype (`button`, `link`, `input`, `card`, `badge`, `nav`, `form`, etc.) with `instances`, slot `anatomy`, `variants`, measured `states` (`default`, `hover`, `focusVisible`), and `composition` (`allowedParents`, `allowedChildren`).
- **`interactions`**: Focus strategy, observed hover property patterns, motion durations and easings.
- **`invariants`**: WCAG 2.1 contrast ratios, heading hierarchy sequence/issues, mobile `< 44×44px` touch-target audit, and focus-visibility probe summary.

---

## 6. `DESIGN.md`

An agent-ready markdown specification summarizing the referent's visual identity, color & contrast tables, typography ramp, layout & responsive shifts, component slot & state signatures, concrete **DO / DON'T** rules, and a verification checklist. Drop it into a project root or reference it when prompting Claude Code or Antigravity to build matching UI.

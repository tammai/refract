# Design Tokens & Output Formats

Every extraction produces a `raw/` evidence folder plus **7 compiled artifacts**:

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

Compatible with [Style Dictionary](https://styledictionary.com/) v4+ and Tokens Studio. Every leaf token contains `$value`, a resolved `$type` (direct or inherited from an ancestor group), and provenance metadata under `$extensions.referent`:

```json
{
  "$type": "color",
  "$value": "#2563EB",
  "$description": "Primary interactive brand accent",
  "$extensions": {
    "referent": {
      "provenance": "measured",
      "source": "computed+cssVar(--brand-primary)",
      "occurrences": 14
    }
  }
}
```

### Supported `$type` Values

- `color` — Normalized `#rrggbb` or `#rrggbbaa` hex string
- `dimension` — Numeric CSS unit (`"16px"`, `"1rem"`, `"0px"`)
- `fontFamily` — String or array of font family names
- `fontWeight` — Numeric weight (`400`, `500`, `600`, `700`)
- `duration` — CSS time string (`"150ms"`, `"0.2s"`)
- `cubicBezier` — 4-number array (`[0.2, 0, 0, 1]`) or easing string
- `number` — Unitless number (line-height ratios, z-index, opacity)
- `shadow` — Object or array of `{ color, offsetX, offsetY, blur, spread }`
- `typography` — `{ fontFamily, fontSize, fontWeight, lineHeight, letterSpacing }`
- `border` — `{ color, width, style }`

### Three-Tier Layering & Aliases

1. **`primitive`**: Raw measured palette colors, font families, sizes, weights, spacing steps, radii, border widths, shadows, durations, easings, breakpoints, and z-indices (no aliases).
2. **`semantic`**: Role-mapped aliases (`color.surface.*`, `color.text.*`, `color.border.*`, `color.accent.*`, `color.status.*`, `typography.*`, `space.*`, `radius.*`, `elevation.*`, `motion.*`) pointing to `{primitive.*}`.
3. **`component`**: Component bindings (`button.primary.bg`, `card.surface`, `input.border`) pointing to `{semantic.*}`.
4. **`modes.dark`**: Overrides keyed identically to `semantic.*` when `desktop-dark` differs from `desktop-light`.

---

## 2. `tokens.css`

Ready-to-import CSS custom properties covering semantic variables, measured referent `--*` variables, and automatic dark-mode overrides under `@media (prefers-color-scheme: dark)` and `[data-theme="dark"], .dark`:

```css
@import "./tokens.css";
```

---

## 3. `tailwind.theme.css` (Tailwind CSS v4)

Import directly in your Tailwind v4 CSS entry file:

```css
@import "tailwindcss";
@import "./tailwind.theme.css";
```

Defines `--color-*`, `--font-*`, `--radius-*`, and `--shadow-*` variables inside `@theme { ... }`.

---

## 4. `tailwind.config.mjs` (Tailwind CSS v3)

Standard ESM `export default { theme: { extend: { colors, fontFamily, borderRadius, boxShadow, spacing } } }`:

```js
import referentTheme from "./tailwind.config.mjs";

export default {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      ...referentTheme.theme.extend
    }
  }
};
```

---

## 5. `ui-ontology.yaml` & `ui-ontology.json`

Both formats share the same structural schema and **7 required top-level keys**:

1. **`meta`**: Source URL, title, timestamp, `statesCaptured`, `crossOriginStylesheetsSkipped`
2. **`designGrammar`**: `density` (`compact` | `balanced` | `airy`), `surfaceModel` (`flat` | `bordered-flat` | `elevated-cards` | `glass`), `layoutStructure`, `maxContentWidth`, `baseGridUnit`, `breakpoints`
3. **`regions`**: Landmarks (`header`, `nav`, `main`, `aside`, `footer`, `section`) with `positioning`, `desktopBox`, `mobileBox`, and `responsiveBehavior`
4. **`surfaces`**: Canvas, elevated, and subtle containers with `lightBg` / `darkBg` / `elevation`
5. **`components`**: Grouped by archetype (`button`, `link`, `input`, `nav`, `card`, `badge`, `form`, `table`, `dialog`, etc.) with `id`, `archetype`, `instances`, `anatomy.slots`, `variants`, `states` (`default`, `hover`, `focusVisible`), `tokens`, and `composition` (`allowedParents`, `allowedChildren`)
6. **`interactions`**: `focusStrategy`, `hoverPatterns`, `motionDurations`
7. **`invariants`**: `contrastChecks`, `headingHierarchy`, `mobileTouchTargets` (`< 44×44px`), and `focusVisibility`

---

## 6. `DESIGN.md`

An agent-ready markdown blueprint containing 7 required sections:

1. Referent Overview & Visual Identity
2. Color System & Contrast
3. Typography Scale
4. Layout Grammar, Spacing & Responsive Shifts
5. Shape, Elevation & Motion
6. Component Ontology (slots, variants, composition, interactive states)
7. Reproduction Rules (**DO / DON'T**) & Verification Checklist

### Wiring `DESIGN.md` Into Your Coding Agent

- **Claude Code**: Reference `@DESIGN.md` in `CLAUDE.md` or directly in chat prompts.
- **Antigravity**: Copy or distill rules into `.agents/rules/design-system.md`, or reference `DESIGN.md` in workspace prompts.
- **Codex**: Reference `DESIGN.md` from your repository's root `AGENTS.md`.
- **Cursor**: Convert or reference `DESIGN.md` inside `.cursor/rules/design-system.mdc` (using `alwaysApply: false` and `globs` such as `src/components/**/*`).

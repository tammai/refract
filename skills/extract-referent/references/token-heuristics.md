# Token Classification & Inference Heuristics

Use these rules when interpreting `raw/capture.json` and refining compiled tokens.

## Color Clustering & Role Assignment

1. **Normalization & Deduplication**:
   - Convert `rgb()`, `rgba()`, `hsl()`, and hex strings into normalized `#rrggbb` (or `#rrggbbaa` when `alpha < 1`).
   - Ignore fully transparent values (`alpha === 0`).
   - Cluster near-identical sampled computed colors (Euclidean RGB distance `<= 10`) weighted by element bounding area and instance count, while always preserving explicit `--*` CSS custom properties verbatim.
2. **Surface Roles**:
   - `surface.canvas`: Dominant background of `body` / `html` / `main` (weighted by area).
   - `surface.elevated`: Opaque card/panel/modal/header backgrounds differing from `canvas` (typically lighter in light mode or slightly elevated in dark mode, or paired with `boxShadow` / `border`).
   - `surface.subtle`: Secondary muted backgrounds (input fills, table headers, subtle badges, hover tints).
   - `surface.inverse`: High-contrast opposite-polarity surface (dark footer/tooltip/banner on a light canvas, or vice versa).
3. **Text & Contrast Pairing**:
   - Resolve each text element's effective opaque background by walking up ancestors until an opaque `backgroundColor` is found (`canvas` fallback).
   - Compute WCAG 2.1 relative luminance and contrast ratio `L1 + 0.05 / L2 + 0.05`.
   - `text.primary`: Highest-frequency non-link body/heading ink on `canvas`/`elevated`.
   - `text.secondary` / `text.muted`: Lower-contrast neutral inks used on metadata, subtitles, captions, or placeholders.
   - `text.link`: Primary `a` ink color (if distinct from `text.primary`).
4. **Accent & Status Roles**:
   - `accent.primary`: Highest-chroma color appearing on primary buttons, active tabs, focus rings, or prominent interactive elements.
   - `status.*`: Only emit `success` (green hue 95–165°), `warning` (amber 25–55°), `danger` (red 340–20°), or `info` (blue 190–245°) if explicitly named in CSS variables or observed on semantic alert/badge/error elements. Never invent missing status colors.

## Typography Scale Detection

- Cluster computed typography tuples `(fontFamily, fontSize, fontWeight, lineHeight, letterSpacing)`.
- Identify `body` as the highest-frequency `<p>` / `<li>` / `body` text cluster (typically `14px`–`18px`, weight `400`).
- Map heading tags (`h1`–`h6`) and oversized hero text (`>= 2.25 * bodySize`) to `display` and `h1`–`h6`.
- Identify `code` from `<code>` / `<pre>` / monospace family stacks.
- Identify `label` / `caption` from `<label>`, `<button>`, `<small>`, and sub-body sizes (`< bodySize`).

## Spacing, Radius, Elevation & Motion

- **Spacing base unit**: Compute the greatest common frequency divisor among non-zero `padding`, `gap`, and `margin` values (`4px` vs `8px` vs `6px`).
- **Radii**: Bucket measured `borderRadius` values into `none` (`0px`), `sm` (`2–6px`), `md` (`6–12px`), `lg` (`12–20px`), `xl` (`20–32px`), and `full` (`>= 999px` or `50%`).
- **Elevation**: Deduplicate non-`none` `boxShadow` strings ordered by blur + spread magnitude (`sm`, `md`, `lg`, `xl`).
- **Motion**: Collect non-zero `transitionDuration` and `transitionTimingFunction` pairs into `motion.duration.*` and `motion.easing.*`.

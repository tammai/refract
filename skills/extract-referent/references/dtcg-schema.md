# W3C Design Tokens (DTCG) Schema Reference

This plugin targets the W3C Design Tokens Community Group (DTCG) format (`tokens.dtcg.json`) with three semantic tiers plus mode overrides.

## Token Node Structure

Every leaf token is a JSON object containing `$value` and a resolved `$type` (either on the token itself or inherited from an ancestor group):

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

- `color`: Normalized `#rrggbb` or `#rrggbbaa` hex string
- `dimension`: Numeric string with CSS unit (`"16px"`, `"1rem"`, `"0px"`)
- `fontFamily`: String or array of font family names (`["Inter", "sans-serif"]`)
- `fontWeight`: Numeric weight (`400`, `500`, `600`, `700`)
- `duration`: CSS time string (`"150ms"`, `"0.2s"`)
- `cubicBezier`: Array of 4 numbers (`[0.2, 0, 0, 1]`) or easing alias
- `number`: Unitless numeric value (line-height ratios, z-index, opacity)
- `shadow`: Object or array of `{ color, offsetX, offsetY, blur, spread }`
- `typography`: Composite object `{ fontFamily, fontSize, fontWeight, lineHeight, letterSpacing }`
- `border`: Composite object `{ color, width, style }`

## Three-Tier Hierarchy

1. **`primitive`**: Raw measured palette colors, font families, type sizes, weights, spacing steps, radii, shadows, durations, easings, breakpoints, and z-indices. No aliases inside `primitive`.
2. **`semantic`**: Role-mapped tokens referencing `{primitive.*}`:
   - `color.surface.*` (`canvas`, `subtle`, `elevated`, `inverse`)
   - `color.text.*` (`primary`, `secondary`, `muted`, `inverse`, `link`)
   - `color.border.*` (`subtle`, `default`, `strong`)
   - `color.accent.*` (`primary`, `primaryHover`, `onPrimary`, `secondary`)
   - `color.status.*` (`success`, `warning`, `danger`, `info` — only when observed)
   - `typography.*` (`display`, `h1`–`h6`, `body`, `bodySm`, `label`, `caption`, `code`)
   - `space.*`, `radius.*`, `elevation.*`, `motion.*`
3. **`component`**: Component-scoped bindings (`button.primary.bg`, `card.surface`, `input.border`, etc.) referencing `{semantic.*}` where possible.
4. **`modes.dark`**: Overrides keyed identically to `semantic.*` paths when `desktop-dark` measurements differ from `desktop-light`.

## Alias Rules

- Aliases use `{group.subgroup.token}` syntax matching exact dot-paths in the same `tokens.dtcg.json` document.
- Never create circular aliases or dangling references; `validate-artifacts.mjs` verifies full alias resolution.

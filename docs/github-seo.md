# GitHub SEO, Social Preview & Marketplace Launch Guide

Use this checklist when publishing **Refract** to GitHub, the Claude Code Marketplace, and the Antigravity Marketplace.

---

## 1. Repository "About" Description (<= 160 characters)

Paste into GitHub **Settings → General / About**:

> Extract W3C design tokens, CSS vars, Tailwind v4/v3 themes, UI ontologies & DESIGN.md from live websites — for Claude Code & Antigravity.

---

## 2. Recommended GitHub Topics (20)

Paste into GitHub **About → Topics**:

```text
claude-code-plugin
antigravity-plugin
design-tokens
dtcg
ui-ontology
design-system
tailwind-css
css-variables
playwright
agent-skills
ai-coding
wcag
accessibility
design-engineering
reverse-engineering
frontend-tools
ui-architecture
color-tokens
typography
developer-tools
```

---

## 3. Social Preview Image (1280×640)

A ready-made OpenGraph card vector lives at [`assets/social-preview.svg`](../assets/social-preview.svg) (`1280×640`).

Export it to PNG (using `rsvg-convert`, Inkscape, or browser screenshot) and upload under **GitHub Repository Settings → Social preview → Edit → Upload an image**:

```bash
# Example with librsvg (if installed)
rsvg-convert -w 1280 -h 640 assets/social-preview.svg -o assets/social-preview.png
```

---

## 4. Repository URLs & Manifests

Configured for `https://github.com/tammai/refract`:

1. `README.md` and `docs/getting-started.md` reference `tammai/refract`.
2. Both manifests include `"homepage"` and `"repository"` pointing to `https://github.com/tammai/refract`:
   - `.claude-plugin/plugin.json`
   - `.antigravity-plugin/plugin.json`

---

## 5. Marketplace Packaging

### Claude Code (`marketplace.json` snippet)

If hosting Refract inside a Claude Code marketplace repository, include an entry like:

```json
{
  "name": "refract",
  "source": {
    "source": "github",
    "repo": "tammai/refract"
  },
  "description": "Extract W3C design tokens, CSS variables, Tailwind themes, structured UI ontologies, and agent-ready DESIGN.md specs from live website referents."
}
```

Then validate both the plugin and the marketplace:

```bash
claude plugin validate --strict --profile directory .
```

### Antigravity Marketplace

Verify strict validation passes before submitting:

```bash
agy plugin validate --strict .
```

Ensure `.antigravity-plugin/plugin.json` includes `name`, `displayName`, `description`, `version`, `logo` (`assets/logo.svg`), `suggestedPrompts` (3 items), `author`, `homepage`, and `repository`.

---

## 6. First Release Notes Template (`v0.1.0`)

```bash
git tag -a v0.1.0 -m "Refract v0.1.0 — Dual-provider Claude Code & Antigravity release"
git push origin v0.1.0
```

Highlight in the GitHub Release:
- **Zero-dependency Node ESM** pipeline powered by `playwright-cli`
- **Dual-provider support** for Claude Code (`.claude-plugin/plugin.json`) and Antigravity (`.antigravity-plugin/plugin.json`)
- **7 validated artifacts** per capture: `tokens.dtcg.json`, `tokens.css`, `tailwind.theme.css`, `tailwind.config.mjs`, `ui-ontology.yaml`, `ui-ontology.json`, `DESIGN.md`

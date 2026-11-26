# GitHub SEO, Social Preview & Marketplace Launch Guide

Use this checklist when publishing **Refract** to GitHub and the Claude Code, Antigravity, Codex, and Cursor marketplaces.

---

## 1. Repository "About" Description (<= 160 characters)

Paste into GitHub **Settings → General / About**:

> Extract W3C design tokens, CSS vars, Tailwind v4/v3 themes, UI ontologies & DESIGN.md from live sites — for Claude Code, Antigravity, Codex & Cursor.

---

## 2. Recommended GitHub Topics (20)

Paste into GitHub **About → Topics**:

```text
claude-code-plugin
antigravity-plugin
codex-plugin
cursor-plugin
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
2. All four provider manifests include `"homepage"` and `"repository"` pointing to `https://github.com/tammai/refract`:
   - `.claude-plugin/plugin.json`
   - `.antigravity-plugin/plugin.json`
   - `.codex-plugin/plugin.json`
   - `.cursor-plugin/plugin.json`

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

### Codex Marketplace (`.agents/plugins/marketplace.json` snippet)

If hosting Refract inside a Codex marketplace repository (where the plugin directory lives at e.g. `./plugins/refract`), include an entry like:

```json
{
  "name": "refract",
  "source": {
    "source": "local",
    "path": "./plugins/refract"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Developer Tools"
}
```

Ensure `.codex-plugin/plugin.json` keeps `interface.shortDescription` at `<= 30` characters, `interface.defaultPrompt` with 1–3 prompts, and relative `./` paths for `skills`, `interface.logo`, and `interface.composerIcon`.

### Cursor Marketplace

Ensure `.cursor-plugin/plugin.json` includes `name`, `displayName`, `description`, `version`, `logo` (`assets/logo.svg`), `rules` (`.cursor/rules/refract-guardrails.mdc`), `skills` (`skills/`), and `agents` (`agents/`).

---

## 6. First Release Notes Template (`v0.1.0`)

```bash
git tag -a v0.1.0 -m "Refract v0.1.0 — Multi-provider release"
git push origin v0.1.0
```

Highlight in the GitHub Release:
- **Zero-dependency Node ESM** pipeline powered by `playwright-cli`
- **Multi-provider support** for Claude Code (`.claude-plugin/plugin.json`), Antigravity (`.antigravity-plugin/plugin.json`), Codex (`.codex-plugin/plugin.json`), and Cursor (`.cursor-plugin/plugin.json` + `.cursor/rules/refract-guardrails.mdc`)
- **7 validated artifacts** per capture: `tokens.dtcg.json`, `tokens.css`, `tailwind.theme.css`, `tailwind.config.mjs`, `ui-ontology.yaml`, `ui-ontology.json`, `DESIGN.md`

---

## 7. Publishing the GitHub Wiki

Ready-to-publish GitHub Wiki pages live under [`wiki/`](../wiki/Home.md). Once the GitHub Wiki feature is enabled and initialized (with at least one placeholder page created in the GitHub UI):

```bash
git clone https://github.com/tammai/refract.wiki.git /tmp/refract-wiki
cp wiki/*.md /tmp/refract-wiki/
cd /tmp/refract-wiki
git add -A
git commit -m "docs: publish Refract wiki pages"
git push origin master
```

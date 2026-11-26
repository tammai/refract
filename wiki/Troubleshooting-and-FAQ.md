# Troubleshooting & FAQ

## Troubleshooting

### `playwright-cli binary not found`

**Symptom**: `capture-referent.mjs` exits with `playwright-cli binary not found` even though `playwright-cli` works in your interactive shell.

**Fix**: Non-login shells spawned by editors or AI agents often omit `~/.nvm`, `~/.local/bin`, or `/opt/homebrew/bin` from `PATH`. Set `PLAYWRIGHT_CLI_BIN` explicitly:

```bash
export PLAYWRIGHT_CLI_BIN="$(which playwright-cli)"
node skills/extract-referent/scripts/capture-referent.mjs https://example.com --compile
```

---

### SPA or Heavy Webfonts Not Finished Rendering

**Symptom**: Captured screenshots or computed styles reflect loading skeletons or fallback system fonts.

**Fix**: Increase `--wait <ms>` (default `1000`):

```bash
node skills/extract-referent/scripts/capture-referent.mjs https://example.com --wait 3000 --compile
```

---

### Cross-Origin Stylesheets (`crossOriginStylesheetsSkipped > 0`)

**Symptom**: `ui-ontology.json` reports `crossOriginStylesheetsSkipped > 0`, so `@media` breakpoints or declared `--*` CSS variables from a CDN stylesheet are missing.

**Why**: Browsers throw a `SecurityError` when JS reads `sheet.cssRules` on `<link rel="stylesheet">` tags from another origin without `crossorigin="anonymous"` and `Access-Control-Allow-Origin`.

**Workaround**: Computed styles (`getComputedStyle`) on all visible elements—colors, fonts, spacing, radii, shadows, and hover/focus deltas—are **still captured accurately**. Only raw stylesheet declarations from that external sheet are skipped.

---

### Site Uses a Class Toggle (`.dark`) Instead of `prefers-color-scheme`

**Symptom**: `desktop-dark` looks identical to `desktop-light` because the target site ignores OS `prefers-color-scheme: dark` and requires clicking a theme toggle button.

**Workaround**: Inspect `raw/desktop-dark.png`. Toggle the site's dark-mode button interactively inside a `playwright-cli` session before running `browser-probe.js`, or document the manual toggle behavior in `DESIGN.md`.

---

### `validate-artifacts.mjs` Reports a Broken Alias After Manual Edits

**Symptom**: `Broken alias in "semantic.color.accent.primary": "{primitive.color.brand}" does not resolve to a leaf token`.

**Fix**: Every `{group.subgroup.token}` string in `tokens.dtcg.json` must match an exact dot-path to a leaf object containing `$value`. Check key names in `primitive.*` and re-run:

```bash
node skills/extract-referent/scripts/validate-artifacts.mjs <out-dir>
```

---

### Timeout Navigating to Bot-Protected or Authenticated Sites

**Symptom**: `playwright-cli open <url>` times out or lands on an anti-bot interstitial.

**Fix**: Verify the URL loads cleanly without anti-bot gates. Refract does not bypass CAPTCHAs or bot checks. For authenticated internal apps, save storage state with `playwright-cli state-save` only in trusted local environments (never commit saved state).

---

### Codex Skills Not Appearing (`$extract-referent`)

**Fix**:
- Confirm `~/.agents/skills/extract-referent/SKILL.md` (or `.agents/skills/...`) resolves cleanly without broken symlinks, and restart Codex.
- If using a Codex marketplace repository, restart Codex or start a fresh session after editing `.agents/plugins/marketplace.json`.
- Verify `.codex-plugin/plugin.json` keeps `interface.shortDescription` at `<= 30` characters, `interface.defaultPrompt` with 1–3 entries, and `./` relative paths.

---

### Cursor Rules or Plugin Not Activating

**Fix**:
- Verify `.cursor-plugin/plugin.json` specifies `"rules": ".cursor/rules/refract-guardrails.mdc"` explicitly.
- Confirm `.cursor/rules/refract-guardrails.mdc` begins with YAML frontmatter containing `description:` and `alwaysApply:` (`true` or `false`).
- For workspace-local setups without installing the plugin, copy `.cursor/rules/refract-guardrails.mdc` into `.cursor/rules/` and `skills/` into `.cursor/skills/` (or `.agents/skills/`).

---

## FAQ

**Does Refract support Tailwind CSS v4 and v3?**
Yes. Every extraction emits both `tailwind.theme.css` (`@theme { ... }` for Tailwind v4) and `tailwind.config.mjs` (`theme.extend` ESM config for Tailwind v3).

**Does it work on React, Next.js, or client-rendered SPAs?**
Yes. `capture-referent.mjs` drives headless Chromium via `playwright-cli`, waits for `document.fonts.ready` plus `--wait`, and samples post-hydration computed styles and DOM/ARIA trees.

**How are light and dark themes captured?**
By default, Refract captures `desktop-light` (`1440×900`, `light`), `desktop-dark` (`1440×900`, `dark`), and `mobile-light` (`390×844`, `light`). Measured dark-mode differences are emitted under `modes.dark` in `tokens.dtcg.json` and `@media (prefers-color-scheme: dark)` / `.dark` in `tokens.css`.

**Does Refract check WCAG contrast and accessibility?**
Yes. Refract alpha-composites the effective opaque background behind sampled text elements to compute WCAG 2.1 contrast ratios, audits heading order (`h1`–`h6`), probes `:focus-visible` outlines, and counts mobile interactive targets under `44×44px`.

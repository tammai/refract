# Troubleshooting

## `playwright-cli binary not found`

**Symptom**: `capture-referent.mjs` exits with `playwright-cli binary not found` even though `playwright-cli` works in your interactive terminal.

**Fix**: Non-login shells spawned by editors or AI agents often omit `~/.nvm`, `~/.local/bin`, or `/opt/homebrew/bin` from `PATH`.
- Point `PLAYWRIGHT_CLI_BIN` explicitly to the binary:
  ```bash
  export PLAYWRIGHT_CLI_BIN="$(which playwright-cli)"
  node skills/extract-referent/scripts/capture-referent.mjs https://example.com --compile
  ```
- Or prepend your Node/nvm `bin` directory when invoking `node`.

---

## SPA or Heavy Fonts Not Finished Rendering

**Symptom**: Captured screenshots or computed styles reflect loading skeletons or fallback system fonts.

**Fix**: Increase `--wait <ms>` (default `1000`):

```bash
node skills/extract-referent/scripts/capture-referent.mjs https://example.com --wait 3000 --compile
```

---

## Cross-Origin Stylesheets (`crossOriginStylesheetsSkipped > 0`)

**Symptom**: `ui-ontology.json` reports `crossOriginStylesheetsSkipped > 0`, so `@media` breakpoints or declared CSS custom properties from a CDN stylesheet are missing.

**Why**: Browsers throw a `SecurityError` when JS reads `sheet.cssRules` on `<link rel="stylesheet">` tags loaded from another origin without `crossorigin="anonymous"` and `Access-Control-Allow-Origin`.

**Workaround**: Computed styles (`getComputedStyle`) on all visible elements—including colors, fonts, spacing, radii, shadows, and hover/focus deltas—are **still captured accurately**. Only raw stylesheet rule declarations (`--*` names and `@media` strings) from that external sheet are skipped.

---

## Site Uses a Class Toggle (`.dark`) Instead of `prefers-color-scheme`

**Symptom**: `desktop-dark` looks identical to `desktop-light` because the site ignores OS `prefers-color-scheme: dark` and requires clicking a theme toggle button.

**Workaround**: Inspect `raw/desktop-dark.png`. If the theme did not switch automatically, toggle the site's dark mode button interactively in a `playwright-cli` session before running `browser-probe.js`, or document the manual toggle behavior in `DESIGN.md`.

---

## `validate-artifacts.mjs` Reports a Broken Alias After Manual Edits

**Symptom**: `Broken alias in "semantic.color.accent.primary": "{primitive.color.brand}" does not resolve to a leaf token`.

**Fix**: Every `{group.subgroup.token}` string in `tokens.dtcg.json` must match an exact dot-path to a leaf object containing `$value`. Check spelling after renaming keys in `primitive.*`, then re-run:

```bash
node skills/extract-referent/scripts/validate-artifacts.mjs <out-dir>
```

---

## Timeout Navigating to Bot-Protected or Slow Sites

**Symptom**: `playwright-cli open <url>` times out or lands on an anti-bot interstitial.

**Fix**: Verify the URL loads cleanly in a normal browser without authentication walls or anti-bot gates. Refract does not bypass CAPTCHAs or anti-bot challenges. For authenticated internal apps, open the site and save storage state with `playwright-cli state-save` only in trusted local environments (never commit saved state).

---

## Codex Skills Not Appearing (`$extract-referent`)

**Symptom**: Codex does not list `$extract-referent` or `$audit-ui-ontology` after installing or symlinking.

**Fix**:
- If using local symlinks, confirm both `~/.agents/skills/extract-referent/SKILL.md` (or `.agents/skills/...`) resolve to real files without broken symlinks, and restart Codex so it re-indexes skills.
- If using a Codex marketplace repository, restart Codex or open a fresh session after editing `.agents/plugins/marketplace.json`.
- Verify `.codex-plugin/plugin.json` keeps `interface.shortDescription` at `<= 30` characters, `interface.defaultPrompt` with 1–3 entries, and relative `./` paths for `skills`, `interface.logo`, and `interface.composerIcon`.

---

## Cursor Rules or Plugin Not Activating

**Symptom**: Cursor does not apply `refract-guardrails.mdc` or discover the plugin's skills/agent.

**Fix**:
- Verify `.cursor-plugin/plugin.json` sets `"rules": ".cursor/rules/refract-guardrails.mdc"` explicitly (this overrides Cursor's default `rules/` folder scan so it does not double-load `rules/AGENTS.md`).
- Confirm `.cursor/rules/refract-guardrails.mdc` begins with valid YAML frontmatter containing `description:` and `alwaysApply:` (`true` or `false`).
- For workspace-local setups without the plugin installed, copy `.cursor/rules/refract-guardrails.mdc` into your project's `.cursor/rules/` folder and `skills/` into `.cursor/skills/` (or `.agents/skills/`).

---

## Multi-Provider Validation Failures

**Symptom**: CI or local validation fails on one of the four provider manifests or rules.

**Fix**: Run all three validation checks locally from the repository root:

```bash
claude plugin validate --strict .
claude plugin validate --strict --profile directory .
agy plugin validate --strict .
node -e '
  const fs = require("node:fs");
  for (const p of [".antigravity-plugin/plugin.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json", ".cursor-plugin/plugin.json"]) {
    const m = JSON.parse(fs.readFileSync(p, "utf8"));
    if (m.name !== "refract") throw new Error("Unexpected name in " + p);
  }
  console.log("All 4 provider manifests OK");
'
```

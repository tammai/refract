# Contributing & Publishing

## Development Principles

1. **Zero external runtime dependencies**: Keep all scripts under `skills/extract-referent/scripts/` pure Node.js built-ins (`node:*`) and browser-standard DOM/CSSOM APIs.
2. **Evidence-first extraction**: Never fabricate design tokens, contrast ratios, breakpoints, or component states. Emit only measured values or explicitly tagged `inferred` metadata.
3. **Multi-provider parity**: Keep `skills/`, `agents/`, and `assets/` compatible with `.claude-plugin/plugin.json`, `.antigravity-plugin/plugin.json`, `.codex-plugin/plugin.json`, and `.cursor-plugin/plugin.json` (plus `.cursor/rules/refract-guardrails.mdc` for Cursor and `rules/AGENTS.md` for Antigravity).
4. **Preserve executable bits**: Ensure scripts in `skills/extract-referent/scripts/` remain executable (`chmod 0755`).

---

## Local Validation Checklist

Run all checks before opening a PR:

```bash
# 1. Script syntax & executable permissions
for f in skills/extract-referent/scripts/*.js skills/extract-referent/scripts/*.mjs; do
  node --check "$f" && test -x "$f"
done

# 2. Claude Code strict validation
claude plugin validate --strict .
claude plugin validate --strict --profile directory .

# 3. Antigravity strict validation
agy plugin validate --strict .

# 4. All 4 provider manifests & Cursor .mdc frontmatter
node -e '
  const fs = require("node:fs");
  for (const p of [".antigravity-plugin/plugin.json", ".claude-plugin/plugin.json", ".codex-plugin/plugin.json", ".cursor-plugin/plugin.json"]) {
    const m = JSON.parse(fs.readFileSync(p, "utf8"));
    if (m.name !== "refract") throw new Error("Unexpected name in " + p);
  }
  console.log("All 4 provider manifests OK");
'
```

If you modify `browser-probe.js`, `compile-artifacts.mjs`, or `validate-artifacts.mjs`, also run an end-to-end `--compile` capture and confirm `validate-artifacts.mjs` passes all 7 artifacts.

---

## Marketplace Packaging

- **Claude Code**: Point a `marketplace.json` entry at `{ "source": "github", "repo": "tammai/refract" }` and verify `claude plugin validate --strict --profile directory .`.
- **Antigravity**: Ensure `.antigravity-plugin/plugin.json` has `name`, `displayName`, `description`, `version`, `logo`, `suggestedPrompts` (3 items), `author`, `homepage`, and `repository`, and passes `agy plugin validate --strict .`.
- **Codex**: Point a `.agents/plugins/marketplace.json` entry at your plugin directory, keep `interface.shortDescription <= 30` chars, `interface.defaultPrompt` with 1–3 prompts, and `./` relative paths in `.codex-plugin/plugin.json`.
- **Cursor**: Ensure `.cursor-plugin/plugin.json` defines `name`, `displayName`, `description`, `version`, `logo`, `rules` (`.cursor/rules/refract-guardrails.mdc`), `skills`, and `agents`.

---

## Publishing This Wiki to GitHub

The source Markdown files for this wiki live in [`wiki/`](https://github.com/tammai/refract/tree/main/wiki) in the main repository. To publish updates to `https://github.com/tammai/refract/wiki`:

```bash
git clone https://github.com/tammai/refract.wiki.git /tmp/refract-wiki
cp wiki/*.md /tmp/refract-wiki/
cd /tmp/refract-wiki
git add -A
git commit -m "docs: update Refract wiki"
git push origin master
```

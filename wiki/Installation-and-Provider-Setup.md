# Installation & Provider Setup

## Prerequisites

Refract has **zero external npm dependencies** and uses built-in `node:*` APIs exclusively.

1. **Node.js `>= 18`**
2. **`playwright-cli`** available on `PATH` (or pointed to via `PLAYWRIGHT_CLI_BIN`) with Chromium installed

Verify both before running a capture:

```bash
node -v
playwright-cli --version
```

---

## Provider Support Matrix

| Provider | Manifest | Skills Invocation | Agent Support | Rules Mechanism | Validation Command |
| --- | --- | --- | --- | --- | --- |
| **Claude Code** | `.claude-plugin/plugin.json` | `/refract:extract-referent`, `/refract:audit-ui-ontology` | `referent-analyst` | — | `claude plugin validate --strict .` |
| **Antigravity** | `.antigravity-plugin/plugin.json` | `/extract-referent`, `/audit-ui-ontology` | `referent-analyst` (`agy --agent referent-analyst`) | `rules/AGENTS.md` (always-on) | `agy plugin validate --strict .` |
| **Codex** | `.codex-plugin/plugin.json` | `$extract-referent`, `$audit-ui-ontology` | — (skills-driven) | — | JSON + path checks in CI |
| **Cursor** | `.cursor-plugin/plugin.json` | `/extract-referent`, `/audit-ui-ontology` | `referent-analyst` | `.cursor/rules/refract-guardrails.mdc` (`alwaysApply: false`) | JSON + `.mdc` checks in CI |
| **Standalone CLI** | — | `node skills/extract-referent/scripts/capture-referent.mjs` | — | — | `node skills/extract-referent/scripts/validate-artifacts.mjs` |

---

## Claude Code

Run directly against a local checkout:

```bash
claude --plugin-dir /path/to/refract
```

Or install from a GitHub marketplace (Claude Code 2.1.275+):

```text
/plugin install refract --marketplace tammai/refract
```

Invoke inside Claude Code:
- `/refract:extract-referent https://example.com --out ./design-referent`
- `/refract:audit-ui-ontology ./design-referent`
- Delegate the full pipeline to the **`referent-analyst`** subagent

---

## Antigravity

Validate and install from a local checkout:

```bash
agy plugin validate --strict /path/to/refract
agy plugin install /path/to/refract
```

Invoke inside Antigravity:
- Slash commands: `/extract-referent` or `/audit-ui-ontology`
- Click any of the 3 starter prompt chips on the **Refract** card under **Customizations > Installed**
- Launch a dedicated CLI agent session:
  ```bash
  agy --agent referent-analyst
  ```

---

## OpenAI Codex

Refract includes `.codex-plugin/plugin.json` pointing to `skills/` with marketplace interface metadata.

- **Marketplace install**: Add the plugin via your Codex marketplace (`.agents/plugins/marketplace.json`) and install `refract` from `/plugins`.
- **Direct local install (no marketplace)**: Symlink the two skills into `~/.agents/skills/` (global) or `.agents/skills/` (project-local):

```bash
mkdir -p ~/.agents/skills
ln -s /path/to/refract/skills/extract-referent ~/.agents/skills/extract-referent
ln -s /path/to/refract/skills/audit-ui-ontology ~/.agents/skills/audit-ui-ontology
```

Restart Codex if needed, then invoke:
- `$extract-referent https://example.com --out ./design-referent`
- `$audit-ui-ontology ./design-referent`

---

## Cursor

Refract ships `.cursor-plugin/plugin.json` wiring `skills/`, `agents/`, `assets/logo.svg`, and `.cursor/rules/refract-guardrails.mdc`.

- **Cursor Plugin**: Install or register the repository via `.cursor-plugin/plugin.json`.
- **Workspace-local copy**: Copy `.cursor/rules/refract-guardrails.mdc` into your project's `.cursor/rules/` folder and `skills/` into `.cursor/skills/` (or `.agents/skills/`).

Invoke inside Cursor:
- `/extract-referent` or `/audit-ui-ontology` in Agent chat
- Delegate to the **`referent-analyst`** agent (`agents/referent-analyst.md`)
- `.cursor/rules/refract-guardrails.mdc` applies automatically when your prompt touches referent extractions, design tokens, UI ontologies, or `DESIGN.md` (`alwaysApply: false` with semantic `description`)

---

## Standalone CLI

Run the deterministic pipeline without an AI host:

```bash
# Capture + compile + validate
node skills/extract-referent/scripts/capture-referent.mjs https://example.com \
  --out ./referent-output \
  --compile

# Re-compile from raw/capture.json offline
node skills/extract-referent/scripts/compile-artifacts.mjs ./referent-output/raw/capture.json \
  --out ./referent-output

# Validate all 7 generated artifacts
node skills/extract-referent/scripts/validate-artifacts.mjs ./referent-output
```

See [Extraction Workflow](Extraction-Workflow.md) for all flags and refinement steps.

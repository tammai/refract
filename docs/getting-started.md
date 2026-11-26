# Getting Started with Refract

This guide covers installing **Refract**, running your first live referent extraction in **Claude Code**, **Antigravity**, **Codex**, **Cursor**, or **Standalone CLI**, and refining the output bundle.

## Prerequisites

1. **Node.js `>= 18`** — Refract has **zero external npm dependencies** and uses built-in `node:*` modules exclusively.
2. **`playwright-cli`** — Must be available on `PATH` (or pointed to via `PLAYWRIGHT_CLI_BIN`) with a working Chromium browser.

Verify both prerequisites:

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

## Option A: Run with Claude Code

### Try Locally (`--plugin-dir`)

```bash
claude --plugin-dir /path/to/refract
```

### Install from a GitHub Marketplace

Once published to a Claude Code marketplace repository (`tammai/refract`):

```text
/plugin install refract --marketplace tammai/refract
```

### Invoke Skills & Agent

- Extract from a live URL:
  ```text
  /refract:extract-referent https://example.com --out ./design-referent
  ```
- Audit or compare existing extractions:
  ```text
  /refract:audit-ui-ontology ./design-referent
  ```
- Or ask Claude to delegate the full extraction and review to the **`referent-analyst`** agent.

---

## Option B: Run with Antigravity

### Validate & Install Locally

```bash
agy plugin validate --strict /path/to/refract
agy plugin install /path/to/refract
```

### Invoke Skills & Agent

- Use slash commands in chat:
  - `/extract-referent`
  - `/audit-ui-ontology`
- Click any of the 3 starter prompt chips on the **Refract** plugin card under **Customizations > Installed**.
- Or start a dedicated CLI session with the bundled agent:
  ```bash
  agy --agent referent-analyst
  ```

---

## Option C: Run with Codex

Refract includes `.codex-plugin/plugin.json` pointing to `skills/` and branded interface metadata for Codex marketplaces.

### Install via Marketplace or Local Skills

If your workspace or team uses a Codex marketplace (`.agents/plugins/marketplace.json`), install `refract` from `/plugins` or the Codex plugin directory.

For direct local use without a marketplace, symlink the skills into `~/.agents/skills/` (global) or `.agents/skills/` (project-local):

```bash
mkdir -p ~/.agents/skills
ln -s /path/to/refract/skills/extract-referent ~/.agents/skills/extract-referent
ln -s /path/to/refract/skills/audit-ui-ontology ~/.agents/skills/audit-ui-ontology
```

### Invoke Skills

- Extract from a live URL:
  ```text
  $extract-referent https://example.com --out ./design-referent
  ```
- Audit or compare existing extractions:
  ```text
  $audit-ui-ontology ./design-referent
  ```

---

## Option D: Run with Cursor

Refract ships a native Cursor plugin manifest at `.cursor-plugin/plugin.json` that wires `skills/`, `agents/`, and `.cursor/rules/refract-guardrails.mdc`.

### Install as a Cursor Plugin or Copy Into a Workspace

- **Cursor Marketplace / Team Plugin**: Add or install the repository as a Cursor plugin via `.cursor-plugin/plugin.json`.
- **Project-local copy**: Copy `.cursor/rules/refract-guardrails.mdc` into your project's `.cursor/rules/` directory and `skills/` into `.cursor/skills/` (or `.agents/skills/`).

### Invoke Skills, Rules & Agent

- Trigger `/extract-referent` or `/audit-ui-ontology` in Cursor Agent chat.
- Delegate full extraction and review workflows to the **`referent-analyst`** subagent (`agents/referent-analyst.md`).
- `.cursor/rules/refract-guardrails.mdc` uses `alwaysApply: false` with a semantic `description` so Cursor activates the extraction guardrails intelligently when working on tokens, ontologies, or `DESIGN.md`.

---

## Option E: Standalone CLI Pipeline

You can run the deterministic capture, compilation, and validation scripts directly without any AI host:

```bash
# 1. Capture desktop-light, desktop-dark, and mobile-light states + compile + validate
node skills/extract-referent/scripts/capture-referent.mjs https://example.com \
  --out ./referent-output \
  --compile

# 2. Re-compile from an existing raw/capture.json without re-launching a browser
node skills/extract-referent/scripts/compile-artifacts.mjs ./referent-output/raw/capture.json \
  --out ./referent-output

# 3. Validate all 7 compiled outputs
node skills/extract-referent/scripts/validate-artifacts.mjs ./referent-output
```

### Common Capture Flags

| Flag | Default | Description |
| --- | --- | --- |
| `--out <dir>` | `./referent-extract/<host>-<stamp>` | Output directory for `raw/` and compiled artifacts |
| `--viewports <list>` | `desktop:1440x900,mobile:390x844` | Comma-separated `[name:]WxH` viewports |
| `--modes <list>` | `light,dark` | Color schemes emulated via `prefers-color-scheme` |
| `--all-matrix` | `false` | Capture every `viewport × mode` combination |
| `--wait <ms>` | `1000` | Extra settle delay after `document.fonts.ready` |
| `--no-hover-probe` | `false` | Skip live `:hover` / `:focus-visible` style probing |
| `--no-screenshots` | `false` | Skip PNG screenshot generation |
| `--compile` | `false` | Automatically run `compile-artifacts.mjs` and `validate-artifacts.mjs` |

---

## Next Steps

- Understand how the probe and compiler work in [Architecture](architecture.md)
- Inspect every generated file format in [Output Formats](output-formats.md)
- Hit an issue? See [Troubleshooting](troubleshooting.md)

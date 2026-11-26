# Getting Started with Refract

This guide covers installing **Refract**, running your first live referent extraction in **Claude Code**, **Antigravity**, or **Standalone CLI**, and refining the output bundle.

## Prerequisites

1. **Node.js `>= 18`** — Refract has **zero external npm dependencies** and uses built-in `node:*` modules exclusively.
2. **`playwright-cli`** — Must be available on `PATH` (or pointed to via `PLAYWRIGHT_CLI_BIN`) with a working Chromium browser.

Verify both prerequisites:

```bash
node -v
playwright-cli --version
```

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

## Option C: Standalone CLI Pipeline

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

# Security Policy

## Scope & Threat Model

**Refract** inspects live third-party websites using `playwright-cli` in an isolated, ephemeral browser session (`-s=ure-<hex>`) and writes DOM/CSS telemetry and compiled design tokens to disk.

### Safe Usage Guidelines

- **Untrusted Referents**: Only capture URLs you trust or are authorized to inspect. `browser-probe.js` evaluates read-only DOM/CSSOM inspection functions in the target page context and does not execute remote code in Node.js, though target pages still render inside Chromium.
- **Credentials & Cookies**: Do **not** attach authenticated sessions with sensitive cookies or private tokens when saving or sharing `raw/capture.json`, `raw/*.snapshot.yaml`, or `raw/*.png`. Review generated files before committing them to a public repository.
- **CORS Stylesheets**: Cross-origin `<link rel="stylesheet">` rules without CORS headers cannot be read via `sheet.cssRules`. Refract catches `SecurityError` cleanly and records `crossOriginStylesheetsSkipped` rather than bypassing browser same-origin policy.
- **Untrusted Page Text**: Text snippets sampled from DOM nodes (`sampleText`, `headings`, `ariaLabel`) come from external web pages and should be treated as untrusted data, not instructions.

## Reporting a Vulnerability

If you discover a security issue in Refract (for example, command injection in CLI argument handling, unsafe path traversal, or script execution outside the browser sandbox):

1. **Do not** open a public GitHub issue with exploit details.
2. Report the vulnerability privately via **GitHub Security Advisories** (`Security` tab → `Report a vulnerability`) or contact the repository maintainers directly.
3. Include the affected file, reproduction steps, and impact assessment. We aim to acknowledge reports within 72 hours.

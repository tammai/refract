# Changelog

All notable changes to **Refract** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-11-26

### Added
- OpenAI Codex plugin support via `.codex-plugin/plugin.json` (with `skills` mapping and marketplace `interface` metadata).
- Cursor plugin support via `.cursor-plugin/plugin.json` and `.cursor/rules/refract-guardrails.mdc` (Cursor intelligent rule frontmatter).
- Multi-provider manifest and `.mdc` frontmatter checks in `.github/workflows/validate.yml`, plus updated multi-provider docs, guides, issue templates, and validation checklist for Claude Code, Antigravity, Codex, and Cursor.
- Complete GitHub Wiki knowledge base under `wiki/` (`_Sidebar.md`, `_Footer.md`, `Home.md`, `Installation-and-Provider-Setup.md`, `Extraction-Workflow.md`, `Design-Tokens-and-Output-Formats.md`, `Architecture-and-Heuristics.md`, `Troubleshooting-and-FAQ.md`, `Contributing-and-Publishing.md`).

### Fixed
- Wrapped all shields.io badges in `README.md` with section anchors and explicit `height="20"` so badges render inline at normal pill size in local Markdown previewers as well as GitHub.

## [0.1.0] - 2026-11-26

### Added
- Dual-provider plugin packaging via `.claude-plugin/plugin.json` (Claude Code) and `.antigravity-plugin/plugin.json` (Antigravity) sharing root `skills/`, `agents/`, `rules/`, and `assets/`.
- `skills/extract-referent/` workflow with zero-dependency Node ESM scripts (`browser-probe.js`, `capture-referent.mjs`, `compile-artifacts.mjs`, `validate-artifacts.mjs`) and W3C DTCG / heuristic reference guides.
- `skills/audit-ui-ontology/` workflow with formal ontology schema and agent-ready `DESIGN.md` template.
- `agents/referent-analyst.md` specialist Design Systems & UI Ontology Architect agent (`mainAgent` & `subagent`).
- `rules/AGENTS.md` always-on Antigravity guardrails enforcing evidence-first provenance and three-tier token separation.
- Deterministic multi-viewport/theme capture (`desktop-light`, `desktop-dark`, `mobile-light`) with ARIA `--boxes` snapshots, PNG screenshots, `:hover`/`:focus-visible` style delta probing, WCAG 2.1 contrast checks, and 7 compiled output artifacts (`tokens.dtcg.json`, `tokens.css`, `tailwind.theme.css`, `tailwind.config.mjs`, `ui-ontology.yaml`, `ui-ontology.json`, `DESIGN.md`).
- Standard repository documentation, user/architecture/output/troubleshooting/SEO guides under `docs/`, GitHub issue & PR templates, `assets/social-preview.svg`, and GitHub Actions validation CI.

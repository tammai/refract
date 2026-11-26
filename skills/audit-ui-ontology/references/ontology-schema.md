# UI Ontology Schema Reference

`ui-ontology.json` and `ui-ontology.yaml` represent the structural architecture of a UI referent independently of raw token serialization.

## Top-Level Structure

```yaml
schemaVersion: "1.0.0"
meta:
  url: "https://example.com"
  title: "Example"
  capturedAt: "2026-11-26T00:00:00.000Z"
  statesCaptured: ["desktop-light", "desktop-dark", "mobile-light"]
  crossOriginStylesheetsSkipped: 0

designGrammar:
  density: "balanced"            # compact | balanced | airy
  surfaceModel: "bordered-flat"  # flat | bordered-flat | elevated-cards | glass
  layoutStructure: "top-nav-stacked-sections"
  maxContentWidth: "1200px"
  baseGridUnit: "4px"
  breakpoints: ["640px", "768px", "1024px"]

regions:
  - id: "region-header"
    role: "banner"
    tag: "header"
    positioning: "sticky"
    desktopBox: { x: 0, y: 0, width: 1440, height: 64 }
    mobileBox: { x: 0, y: 0, width: 390, height: 56 }
    responsiveBehavior: "persists-full-width"

surfaces:
  - id: "canvas"
    role: "page-background"
    lightBg: "#ffffff"
    darkBg: "#0b1120"
    elevation: "none"

components:
  - id: "button-primary"
    archetype: "button"          # button | link | input | nav | card | badge | form | table | dialog | ...
    role: "primary-action"
    instances: 4
    anatomy:
      slots:
        - name: "label"
          required: true
          element: "text"
        - name: "leadingIcon"
          required: false
          element: "svg"
    variants: ["primary", "secondary"]
    states:
      default: { background: "#2563eb", color: "#ffffff", radius: "8px", padding: "10px 18px" }
      hover: { background: "#1d4ed8", delta: ["backgroundColor"] }
      focusVisible: { outline: "2px solid #2563eb", delta: ["outline"] }
    tokens:
      background: "{component.button.primary.bg}"
      color: "{component.button.primary.text}"
    composition:
      allowedParents: ["header", "hero", "card", "form"]
      allowedChildren: ["svg", "span"]

interactions:
  focusStrategy: "outline-ring"
  hoverPatterns: ["color-shift", "elevation-lift"]
  motionDurations: ["150ms", "200ms"]

invariants:
  contrastChecks:
    - pair: "text.primary on surface.canvas"
      ratio: 15.8
      aaNormal: true
      aaLarge: true
  headingHierarchy:
    valid: true
    sequence: ["h1", "h2", "h3"]
    issues: []
  mobileTouchTargets:
    under44pxCount: 0
    totalChecked: 12
  focusVisibility:
    probedCount: 5
    visibleFocusCount: 5
```

## Required Top-Level Keys

Every `ui-ontology.json` and `ui-ontology.yaml` MUST include:
1. `meta`
2. `designGrammar`
3. `regions`
4. `surfaces`
5. `components` (each entry must have `id`, `archetype`, `anatomy`, `states`)
6. `interactions`
7. `invariants`

# Agent-Ready `DESIGN.md` Blueprint

`DESIGN.md` translates measured tokens and UI ontology into direct implementation instructions so any coding agent can reproduce the referent without guesswork.

## Required Sections

1. **Referent Overview & Visual Identity**
   - Source URL, capture timestamp, states inspected (`desktop-light`, `desktop-dark`, `mobile-light`).
   - Concise thesis: surface model, visual density, accent personality, and typographic voice.

2. **Color System & Contrast**
   - Surface hierarchy (`canvas`, `subtle`, `elevated`, `inverse`) with Light + Dark hex values and CSS variables.
   - Text & border roles with measured WCAG 2.1 contrast ratios against their paired surfaces.
   - Accent & (if observed) status colors with exact foreground/background pairings.

3. **Typography Scale**
   - Primary UI, display, and monospace font stacks (plus detected `@font-face` declarations).
   - Type ramp table (`role`, `fontSize`, `fontWeight`, `lineHeight`, `letterSpacing`, `sample`).

4. **Layout Grammar, Spacing & Responsive Shifts**
   - Max container widths, region structure (`header`, `nav`, `main`, `aside`, `footer`), sticky/fixed regions.
   - Spacing base unit and measured scale steps.
   - Breakpoints and desktop-to-mobile structural changes.

5. **Shape, Elevation & Motion**
   - Border radius tiers, border widths, box-shadow levels, backdrop filters, z-index layers, and transition durations/easings.

6. **Component Ontology**
   - Each detected archetype (`button`, `input`, `card`, `nav`, `badge`, `form`, etc.):
     - Slot anatomy (required vs. optional slots)
     - Variants and composition rules (`allowedParents` / `allowedChildren`)
     - Interactive state table (`default`, `hover`, `focus-visible`)

7. **Reproduction Rules (DO / DON'T) & Verification Checklist**
   - Concrete DO / DON'T constraints anchored to measured tokens and invariants.
   - Post-implementation checklist (contrast, heading order, focus ring visibility, mobile touch targets >= 44px).

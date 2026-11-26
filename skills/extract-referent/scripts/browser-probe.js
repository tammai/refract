#!/usr/bin/env node
/**
 * Self-contained browser DOM/CSS/ontology probe executed inside page.evaluate().
 * Zero external dependencies.
 */

export function probeReferent() {
  const MAX_ELEMENTS = 1500;

  function toHexByte(n) {
    return Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
  }

  function parseRgba(input) {
    if (!input || typeof input !== 'string') return null;
    const s = input.trim().toLowerCase();
    if (s === 'transparent' || s === 'none' || s === 'initial' || s === 'inherit') return null;

    const rgbaMatch = s.match(
      /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+%?))?\s*\)$/
    );
    if (rgbaMatch) {
      const r = parseFloat(rgbaMatch[1]);
      const g = parseFloat(rgbaMatch[2]);
      const b = parseFloat(rgbaMatch[3]);
      let a = 1;
      if (rgbaMatch[4] !== undefined) {
        a = rgbaMatch[4].endsWith('%')
          ? parseFloat(rgbaMatch[4]) / 100
          : parseFloat(rgbaMatch[4]);
      }
      if ([r, g, b, a].some((v) => Number.isNaN(v))) return null;
      return { r, g, b, a: Math.max(0, Math.min(1, a)) };
    }

    const hexMatch = s.match(/^#([0-9a-f]{3,8})$/);
    if (hexMatch) {
      const h = hexMatch[1];
      if (h.length === 3 || h.length === 4) {
        const r = parseInt(h[0] + h[0], 16);
        const g = parseInt(h[1] + h[1], 16);
        const b = parseInt(h[2] + h[2], 16);
        const a = h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1;
        return { r, g, b, a };
      }
      if (h.length === 6 || h.length === 8) {
        const r = parseInt(h.slice(0, 2), 16);
        const g = parseInt(h.slice(2, 4), 16);
        const b = parseInt(h.slice(4, 6), 16);
        const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
        return { r, g, b, a };
      }
    }
    return null;
  }

  function rgbaToHex(c) {
    if (!c || c.a <= 0.01) return null;
    const base = `#${toHexByte(c.r)}${toHexByte(c.g)}${toHexByte(c.b)}`;
    if (c.a >= 0.995) return base;
    return `${base}${toHexByte(c.a * 255)}`;
  }

  function blendOver(fg, bg) {
    const a = fg.a;
    return {
      r: fg.r * a + bg.r * (1 - a),
      g: fg.g * a + bg.g * (1 - a),
      b: fg.b * a + bg.b * (1 - a),
      a: 1,
    };
  }

  function getEffectiveBackground(el) {
    const layers = [];
    let cur = el;
    while (cur && cur.nodeType === 1) {
      const cs = getComputedStyle(cur);
      const parsed = parseRgba(cs.backgroundColor);
      if (parsed && parsed.a > 0.01) {
        layers.push(parsed);
        if (parsed.a >= 0.99) break;
      }
      cur = cur.parentElement;
    }
    const baseFallback =
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? { r: 15, g: 23, b: 42, a: 1 }
        : { r: 255, g: 255, b: 255, a: 1 };
    let acc = baseFallback;
    for (let i = layers.length - 1; i >= 0; i--) {
      acc = blendOver(layers[i], acc);
    }
    return rgbaToHex(acc);
  }

  function buildSelector(el) {
    if (!el || el.nodeType !== 1) return '';
    if (el.id && /^[A-Za-z_][\w-]*$/.test(el.id)) {
      return `#${el.id}`;
    }
    const parts = [];
    let cur = el;
    let depth = 0;
    while (cur && cur.nodeType === 1 && depth < 4) {
      const tag = cur.tagName.toLowerCase();
      if (cur.id && /^[A-Za-z_][\w-]*$/.test(cur.id)) {
        parts.unshift(`#${cur.id}`);
        break;
      }
      let seg = tag;
      const parent = cur.parentElement;
      if (parent) {
        const sameTag = Array.from(parent.children).filter(
          (ch) => ch.tagName === cur.tagName
        );
        if (sameTag.length > 1) {
          seg += `:nth-of-type(${sameTag.indexOf(cur) + 1})`;
        }
      }
      parts.unshift(seg);
      if (tag === 'body' || tag === 'main' || tag === 'header' || tag === 'footer') break;
      cur = parent;
      depth++;
    }
    return parts.join(' > ');
  }

  function cleanFontFamily(raw) {
    if (!raw) return '';
    return raw
      .split(',')
      .map((f) => f.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean)
      .join(', ');
  }

  function roundBox(rect) {
    return {
      x: Math.round(rect.x),
      y: Math.round(rect.y),
      width: Math.round(rect.width),
      height: Math.round(rect.height),
    };
  }

  // 1. Meta
  const metaDesc = document.querySelector('meta[name="description"]');
  const meta = {
    url: location.href,
    title: document.title || '',
    lang: document.documentElement.getAttribute('lang') || '',
    description: metaDesc ? metaDesc.getAttribute('content') || '' : '',
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
    },
    documentWidth: document.documentElement.scrollWidth,
    documentHeight: document.documentElement.scrollHeight,
    prefersColorScheme:
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light',
  };

  // 2. Stylesheets (custom properties, @font-face, breakpoints, keyframes)
  const customProperties = [];
  const customPropSeen = new Set();
  const fontFaces = [];
  const breakpointSet = new Set();
  const keyframeSet = new Set();
  let crossOriginStylesheetsSkipped = 0;

  function scanRuleList(rules, mediaCondition) {
    if (!rules) return;
    for (const rule of rules) {
      if (rule.type === 1) {
        // STYLE_RULE
        const style = rule.style;
        if (style) {
          for (let i = 0; i < style.length; i++) {
            const prop = style[i];
            if (prop && prop.startsWith('--')) {
              const val = style.getPropertyValue(prop).trim();
              const sel = rule.selectorText || ':root';
              const key = `${mediaCondition || ''}|${sel}|${prop}|${val}`;
              if (!customPropSeen.has(key)) {
                customPropSeen.add(key);
                customProperties.push({
                  selector: sel,
                  media: mediaCondition || null,
                  name: prop,
                  value: val,
                });
              }
            }
          }
        }
      } else if (rule.type === 4) {
        // MEDIA_RULE
        const cond =
          rule.conditionText || (rule.media ? rule.media.mediaText : '') || '';
        const widthMatches = cond.match(/\(\s*(?:min|max)-width\s*:\s*[^)]+\)/gi);
        if (widthMatches) {
          for (const m of widthMatches) breakpointSet.add(m.trim());
        }
        try {
          scanRuleList(rule.cssRules, cond);
        } catch {
          // ignore inaccessible nested media rules
        }
      } else if (rule.type === 5) {
        // FONT_FACE_RULE
        const s = rule.style;
        if (s) {
          fontFaces.push({
            family: (s.getPropertyValue('font-family') || '').replace(/["']/g, '').trim(),
            weight: s.getPropertyValue('font-weight') || '400',
            style: s.getPropertyValue('font-style') || 'normal',
            display: s.getPropertyValue('font-display') || '',
            src: (s.getPropertyValue('src') || '').slice(0, 180),
          });
        }
      } else if (rule.type === 7) {
        // KEYFRAMES_RULE
        if (rule.name) keyframeSet.add(rule.name);
      }
    }
  }

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const rules = sheet.cssRules;
      scanRuleList(rules, null);
    } catch {
      crossOriginStylesheetsSkipped++;
    }
  }

  for (const rootEl of [document.documentElement, document.body]) {
    if (!rootEl || !rootEl.style) continue;
    for (let i = 0; i < rootEl.style.length; i++) {
      const prop = rootEl.style[i];
      if (prop && prop.startsWith('--')) {
        const val = rootEl.style.getPropertyValue(prop).trim();
        const sel = rootEl === document.documentElement ? ':root[inline]' : 'body[inline]';
        customProperties.push({ selector: sel, media: null, name: prop, value: val });
      }
    }
  }

  // 3. Collect prioritized visible elements
  const prioritySelector =
    'html, body, header, nav, main, aside, footer, section, article, h1, h2, h3, h4, h5, h6, p, a, button, input, select, textarea, label, table, th, td, form, dialog, ul, ol, code, pre, blockquote, [role], svg, img';
  const candidateSet = new Set();
  for (const el of document.querySelectorAll(prioritySelector)) {
    candidateSet.add(el);
    if (candidateSet.size >= MAX_ELEMENTS) break;
  }
  if (candidateSet.size < MAX_ELEMENTS && document.body) {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node;
    while ((node = walker.nextNode()) && candidateSet.size < MAX_ELEMENTS) {
      candidateSet.add(node);
    }
  }

  const colorMap = new Map();
  const typeMap = new Map();
  const spacingStats = {
    padding: {},
    gap: {},
    margin: {},
    maxWidth: {},
  };
  const radiiMap = {};
  const borderWidthMap = {};
  const shadowMap = {};
  const backdropFilterMap = {};
  const zIndexList = [];
  const zIndexSeen = new Set();
  const motionStats = {
    durations: {},
    easings: {},
    properties: {},
  };

  function addCount(obj, key, amount = 1) {
    if (!key) return;
    obj[key] = (obj[key] || 0) + amount;
  }

  function recordColor(hex, role, area, selector, pairedBg) {
    if (!hex) return;
    const key = `${role}|${hex}`;
    let entry = colorMap.get(key);
    if (!entry) {
      entry = {
        hex,
        role,
        count: 0,
        totalArea: 0,
        selectors: [],
        pairedBgs: {},
      };
      colorMap.set(key, entry);
    }
    entry.count += 1;
    entry.totalArea += area;
    if (entry.selectors.length < 5 && selector && !entry.selectors.includes(selector)) {
      entry.selectors.push(selector);
    }
    if (pairedBg) {
      entry.pairedBgs[pairedBg] = (entry.pairedBgs[pairedBg] || 0) + 1;
    }
  }

  let svgCount = 0;
  const svgSizeMap = {};
  let imgCount = 0;
  const imgAspectRatios = [];
  const headings = [];
  const touchTargets = {
    totalChecked: 0,
    under44pxCount: 0,
    samples: [],
  };

  for (const el of candidateSet) {
    const tag = el.tagName.toLowerCase();
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) === 0) {
      continue;
    }
    const rect = el.getBoundingClientRect();
    const isRoot = tag === 'html' || tag === 'body';
    if (!isRoot && (rect.width <= 0 || rect.height <= 0)) continue;

    const area = Math.max(1, Math.round(rect.width * rect.height));
    const sel = buildSelector(el);
    const roleAttr = el.getAttribute('role') || '';
    const isInteractive =
      tag === 'a' ||
      tag === 'button' ||
      tag === 'input' ||
      tag === 'select' ||
      tag === 'textarea' ||
      roleAttr === 'button' ||
      roleAttr === 'link' ||
      roleAttr === 'tab';

    // Colors
    const bgParsed = parseRgba(cs.backgroundColor);
    const bgHex = rgbaToHex(bgParsed);
    if (bgHex) {
      const colorRole = isInteractive && bgHex !== '#ffffff' && bgHex !== '#000000'
        ? 'accentCandidate'
        : 'background';
      recordColor(bgHex, colorRole, area, sel, null);
      if (colorRole === 'accentCandidate') {
        recordColor(bgHex, 'background', area, sel, null);
      }
    }

    const hasDirectText = Array.from(el.childNodes).some(
      (n) => n.nodeType === 3 && n.textContent && n.textContent.trim().length > 0
    );
    const textParsed = parseRgba(cs.color);
    const textHex = rgbaToHex(textParsed);
    if (textHex && (hasDirectText || isInteractive || /^h[1-6]$/.test(tag) || tag === 'body')) {
      const effectiveBg = getEffectiveBackground(el);
      recordColor(textHex, tag === 'a' ? 'linkText' : 'text', area, sel, effectiveBg);
    }

    const borderWidths = [
      cs.borderTopWidth,
      cs.borderRightWidth,
      cs.borderBottomWidth,
      cs.borderLeftWidth,
    ];
    const borderColors = [
      cs.borderTopColor,
      cs.borderRightColor,
      cs.borderBottomColor,
      cs.borderLeftColor,
    ];
    const borderStyles = [
      cs.borderTopStyle,
      cs.borderRightStyle,
      cs.borderBottomStyle,
      cs.borderLeftStyle,
    ];
    for (let i = 0; i < 4; i++) {
      const bw = parseFloat(borderWidths[i]);
      if (bw > 0 && borderStyles[i] !== 'none') {
        addCount(borderWidthMap, `${Math.round(bw * 100) / 100}px`);
        const bcHex = rgbaToHex(parseRgba(borderColors[i]));
        if (bcHex) recordColor(bcHex, 'border', area, sel, null);
      }
    }

    // SVG / Media
    if (tag === 'svg') {
      svgCount++;
      addCount(svgSizeMap, `${Math.round(rect.width)}x${Math.round(rect.height)}`);
      const fillHex = rgbaToHex(parseRgba(cs.fill));
      const strokeHex = rgbaToHex(parseRgba(cs.stroke));
      if (fillHex) recordColor(fillHex, 'svg', area, sel, null);
      if (strokeHex) recordColor(strokeHex, 'svg', area, sel, null);
    } else if (tag === 'img') {
      imgCount++;
      if (rect.height > 0 && imgAspectRatios.length < 20) {
        imgAspectRatios.push(Math.round((rect.width / rect.height) * 100) / 100);
      }
    }

    // Typography
    if (hasDirectText || /^h[1-6]$/.test(tag) || tag === 'p' || tag === 'button' || tag === 'a') {
      const family = cleanFontFamily(cs.fontFamily);
      const size = cs.fontSize;
      const weight = cs.fontWeight;
      const lh = cs.lineHeight;
      const ls = cs.letterSpacing;
      const tt = cs.textTransform;
      const tKey = `${family}|${size}|${weight}|${lh}|${ls}|${tt}`;
      let tEntry = typeMap.get(tKey);
      if (!tEntry) {
        tEntry = {
          fontFamily: family,
          fontSize: size,
          fontWeight: weight,
          lineHeight: lh,
          letterSpacing: ls,
          textTransform: tt,
          count: 0,
          tags: {},
          sampleText: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 60),
        };
        typeMap.set(tKey, tEntry);
      }
      tEntry.count += 1;
      addCount(tEntry.tags, tag);
    }

    // Headings
    if (/^h[1-6]$/.test(tag)) {
      headings.push({
        level: parseInt(tag[1], 10),
        tag,
        text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
        fontSize: cs.fontSize,
        fontWeight: cs.fontWeight,
      });
    }

    // Spacing
    for (const pProp of ['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft']) {
      const px = parseFloat(cs[pProp]);
      if (px > 0 && px <= 240) addCount(spacingStats.padding, `${Math.round(px)}px`);
    }
    for (const gProp of ['rowGap', 'columnGap']) {
      const px = parseFloat(cs[gProp]);
      if (!Number.isNaN(px) && px > 0 && px <= 240) {
        addCount(spacingStats.gap, `${Math.round(px)}px`);
      }
    }
    for (const mProp of ['marginTop', 'marginBottom']) {
      const px = parseFloat(cs[mProp]);
      if (!Number.isNaN(px) && px > 0 && px <= 240) {
        addCount(spacingStats.margin, `${Math.round(px)}px`);
      }
    }
    if (cs.maxWidth && cs.maxWidth.endsWith('px')) {
      const mw = parseFloat(cs.maxWidth);
      if (mw >= 240 && mw <= 2400) addCount(spacingStats.maxWidth, `${Math.round(mw)}px`);
    }

    // Radii
    const rad = cs.borderTopLeftRadius;
    if (rad) addCount(radiiMap, rad);

    // Shadows & Backdrop
    if (cs.boxShadow && cs.boxShadow !== 'none') {
      addCount(shadowMap, cs.boxShadow);
    }
    if (cs.backdropFilter && cs.backdropFilter !== 'none') {
      addCount(backdropFilterMap, cs.backdropFilter);
    }

    // z-index
    if (cs.zIndex && cs.zIndex !== 'auto') {
      const zNum = parseInt(cs.zIndex, 10);
      if (!Number.isNaN(zNum) && zNum !== 0) {
        const zKey = `${zNum}|${tag}|${roleAttr}`;
        if (!zIndexSeen.has(zKey) && zIndexList.length < 30) {
          zIndexSeen.add(zKey);
          zIndexList.push({ zIndex: zNum, tag, role: roleAttr || null, selector: sel });
        }
      }
    }

    // Motion
    if (cs.transitionDuration && cs.transitionDuration !== '0s') {
      for (const d of cs.transitionDuration.split(',')) {
        const clean = d.trim();
        if (clean && clean !== '0s') addCount(motionStats.durations, clean);
      }
      for (const e of (cs.transitionTimingFunction || '').split(',')) {
        const clean = e.trim();
        if (clean) addCount(motionStats.easings, clean);
      }
      for (const p of (cs.transitionProperty || '').split(',')) {
        const clean = p.trim();
        if (clean && clean !== 'none') addCount(motionStats.properties, clean);
      }
    }

    // Touch target audit (primarily meaningful on mobile, recorded on all)
    if (isInteractive) {
      touchTargets.totalChecked += 1;
      if (rect.width < 44 || rect.height < 44) {
        touchTargets.under44pxCount += 1;
        if (touchTargets.samples.length < 10) {
          touchTargets.samples.push({
            tag,
            text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 40),
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            selector: sel,
          });
        }
      }
    }
  }

  // 4. Regions (Landmarks)
  const regionEls = document.querySelectorAll(
    'header, nav, main, aside, footer, section, [role="banner"], [role="navigation"], [role="main"], [role="complementary"], [role="contentinfo"], [role="dialog"]'
  );
  const regions = [];
  const regionSeen = new Set();
  for (const el of regionEls) {
    if (regionSeen.has(el)) continue;
    regionSeen.add(el);
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) continue;
    const tag = el.tagName.toLowerCase();
    const role =
      el.getAttribute('role') ||
      ({
        header: 'banner',
        nav: 'navigation',
        main: 'main',
        aside: 'complementary',
        footer: 'contentinfo',
        section: 'region',
      }[tag] ||
        'region');
    regions.push({
      tag,
      role,
      ariaLabel: el.getAttribute('aria-label') || el.getAttribute('aria-labelledby') || null,
      positioning: cs.position,
      display: cs.display,
      box: roundBox(rect),
      bg: rgbaToHex(parseRgba(cs.backgroundColor)),
      childCount: el.children.length,
      selector: buildSelector(el),
    });
    if (regions.length >= 40) break;
  }

  // 5. Components & Repeating Card Archetype Detection
  function getVisualSig(el) {
    const cs = getComputedStyle(el);
    return {
      background: rgbaToHex(parseRgba(cs.backgroundColor)) || 'transparent',
      color: rgbaToHex(parseRgba(cs.color)) || '',
      border:
        parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none'
          ? `${cs.borderTopWidth} ${cs.borderTopStyle} ${rgbaToHex(parseRgba(cs.borderTopColor)) || ''}`
          : 'none',
      radius: cs.borderTopLeftRadius,
      padding: `${cs.paddingTop} ${cs.paddingRight} ${cs.paddingBottom} ${cs.paddingLeft}`,
      shadow: cs.boxShadow !== 'none' ? cs.boxShadow : 'none',
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
      display: cs.display,
    };
  }

  const componentGroups = new Map();

  function addComponentSample(archetype, el, extraSlots) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    const rect = el.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const sig = getVisualSig(el);
    const variantKey = `${archetype}|${sig.background}|${sig.border}|${sig.radius}`;
    let group = componentGroups.get(variantKey);
    if (!group) {
      group = {
        archetype,
        instances: 0,
        signature: sig,
        slots: new Set(extraSlots || []),
        parentTags: new Set(),
        childTags: new Set(),
        ariaStates: new Set(),
        sampleSelector: buildSelector(el),
        sampleText: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 50),
      };
      componentGroups.set(variantKey, group);
    }
    group.instances += 1;
    if (el.parentElement) group.parentTags.add(el.parentElement.tagName.toLowerCase());
    for (const ch of el.children) group.childTags.add(ch.tagName.toLowerCase());
    for (const attr of el.getAttributeNames()) {
      if (attr.startsWith('aria-') || attr === 'disabled' || attr === 'data-state') {
        group.ariaStates.add(`${attr}=${el.getAttribute(attr)}`);
      }
    }
    if (el.querySelector('svg')) group.slots.add('icon');
    if (el.querySelector('img, picture, video')) group.slots.add('media');
    if (el.querySelector('h1,h2,h3,h4,h5,h6')) group.slots.add('heading');
    if (el.querySelector('p')) group.slots.add('body');
    if (el.querySelector('button, a')) group.slots.add('action');
  }

  const archetypeSelectors = [
    ['button', 'button, [role="button"], input[type="submit"], input[type="button"]', ['label']],
    ['link', 'a[href]', ['label']],
    ['input', 'input:not([type="hidden"]):not([type="submit"]):not([type="button"]):not([type="checkbox"]):not([type="radio"]), textarea, select', ['value', 'placeholder']],
    ['checkbox', 'input[type="checkbox"], [role="checkbox"]', ['control', 'label']],
    ['radio', 'input[type="radio"], [role="radio"]', ['control', 'label']],
    ['switch', '[role="switch"]', ['track', 'thumb']],
    ['tab', '[role="tab"]', ['label']],
    ['nav', 'nav', ['links']],
    ['form', 'form', ['fields', 'submit']],
    ['table', 'table', ['header', 'rows']],
    ['dialog', 'dialog, [role="dialog"]', ['title', 'body', 'actions']],
    ['alert', '[role="alert"], .alert', ['message']],
    ['badge', '[data-badge], .badge, .chip, .tag', ['label']],
  ];

  for (const [archetype, q, baseSlots] of archetypeSelectors) {
    const els = document.querySelectorAll(q);
    let seen = 0;
    for (const el of els) {
      addComponentSample(archetype, el, baseSlots);
      seen++;
      if (seen >= 60) break;
    }
  }

  // Repeating sibling structural fingerprint detector for cards/tiles
  const cardContainers = document.querySelectorAll('main, section, ul, ol, div');
  let checkedContainers = 0;
  for (const container of cardContainers) {
    if (checkedContainers >= 150) break;
    checkedContainers++;
    if (container.children.length < 2 || container.children.length > 24) continue;
    const fpBuckets = new Map();
    for (const child of container.children) {
      if (child.children.length < 2) continue;
      const fp = Array.from(child.children)
        .map((c) => c.tagName.toLowerCase())
        .slice(0, 6)
        .join('+');
      if (!fpBuckets.has(fp)) fpBuckets.set(fp, []);
      fpBuckets.get(fp).push(child);
    }
    for (const [fp, items] of fpBuckets.entries()) {
      if (items.length >= 2 && (fp.includes('h') || fp.includes('img') || fp.includes('p'))) {
        for (const item of items.slice(0, 12)) {
          addComponentSample('card', item, ['container']);
        }
      }
    }
  }

  // Interactive probe selectors (up to 6 distinct selectors for hover/focus probing)
  const probeTargets = [];
  const seenProbe = new Set();
  for (const q of [
    'button, [role="button"], input[type="submit"]',
    'header a[href], nav a[href], main a[href]',
    'input:not([type="hidden"]), textarea, select',
  ]) {
    for (const el of document.querySelectorAll(q)) {
      if (probeTargets.length >= 6) break;
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (cs.display === 'none' || cs.visibility === 'hidden' || r.width <= 0 || r.height <= 0) {
        continue;
      }
      const sel = buildSelector(el);
      if (sel && !seenProbe.has(sel)) {
        seenProbe.add(sel);
        probeTargets.push({
          selector: sel,
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || el.getAttribute('placeholder') || '').trim().slice(0, 40),
        });
      }
    }
  }

  const components = Array.from(componentGroups.values()).map((g) => ({
    archetype: g.archetype,
    instances: g.instances,
    signature: g.signature,
    slots: Array.from(g.slots),
    parentTags: Array.from(g.parentTags),
    childTags: Array.from(g.childTags),
    ariaStates: Array.from(g.ariaStates),
    sampleSelector: g.sampleSelector,
    sampleText: g.sampleText,
  }));

  return {
    meta,
    stylesheets: {
      customProperties,
      fontFaces,
      breakpoints: Array.from(breakpointSet),
      keyframes: Array.from(keyframeSet),
      crossOriginStylesheetsSkipped,
    },
    computed: {
      elementsSampled: candidateSet.size,
      colors: Array.from(colorMap.values()).sort((a, b) => b.totalArea - a.totalArea),
      typography: Array.from(typeMap.values()).sort((a, b) => b.count - a.count),
      spacing: spacingStats,
      radii: radiiMap,
      borderWidths: borderWidthMap,
      shadows: shadowMap,
      backdropFilters: backdropFilterMap,
      zIndices: zIndexList,
      motion: motionStats,
    },
    ontologyRaw: {
      regions,
      components,
      headings,
      mediaAndIcons: {
        svgCount,
        svgSizes: svgSizeMap,
        imgCount,
        imgAspectRatios,
      },
      touchTargets,
      probeTargets,
    },
  };
}

export const PROBE_FUNCTION_SOURCE = probeReferent.toString();
export default probeReferent;

#!/usr/bin/env node
/**
 * Compiles raw/capture.json into:
 *   1. tokens.dtcg.json
 *   2. tokens.css
 *   3. tailwind.theme.css
 *   4. tailwind.config.mjs
 *   5. ui-ontology.json
 *   6. ui-ontology.yaml
 *   7. DESIGN.md
 * Zero external npm dependencies.
 */

import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  let capturePath = null;
  let outDir = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      console.log('Usage: compile-artifacts.mjs <capture-json-path> [--out <dir>]');
      process.exit(0);
    } else if (a === '--out') {
      outDir = argv[++i];
    } else if (!a.startsWith('-') && !capturePath) {
      capturePath = a;
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }
  if (!capturePath) {
    throw new Error('Missing <capture-json-path> argument.');
  }
  const absCapture = path.resolve(process.cwd(), capturePath);
  if (!fs.existsSync(absCapture)) {
    throw new Error(`Capture file not found: ${absCapture}`);
  }
  const defaultOut =
    path.basename(path.dirname(absCapture)) === 'raw'
      ? path.dirname(path.dirname(absCapture))
      : path.dirname(absCapture);
  return {
    capturePath: absCapture,
    outDir: outDir ? path.resolve(process.cwd(), outDir) : defaultOut,
  };
}

// --- Color Math ---

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function toHexByte(n) {
  return clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
}

function parseColor(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim().toLowerCase();
  if (!s || s === 'transparent' || s === 'none' || s === 'inherit' || s === 'initial') return null;

  const hexM = s.match(/^#([0-9a-f]{3,8})$/);
  if (hexM) {
    const h = hexM[1];
    if (h.length === 3 || h.length === 4) {
      return {
        r: parseInt(h[0] + h[0], 16),
        g: parseInt(h[1] + h[1], 16),
        b: parseInt(h[2] + h[2], 16),
        a: h.length === 4 ? parseInt(h[3] + h[3], 16) / 255 : 1,
      };
    }
    if (h.length === 6 || h.length === 8) {
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
        a: h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1,
      };
    }
  }

  const rgbM = s.match(
    /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,/\s]+([\d.]+%?))?\s*\)$/
  );
  if (rgbM) {
    const r = parseFloat(rgbM[1]);
    const g = parseFloat(rgbM[2]);
    const b = parseFloat(rgbM[3]);
    let a = 1;
    if (rgbM[4] !== undefined) {
      a = rgbM[4].endsWith('%') ? parseFloat(rgbM[4]) / 100 : parseFloat(rgbM[4]);
    }
    if ([r, g, b, a].some((v) => Number.isNaN(v))) return null;
    return { r, g, b, a: clamp(a, 0, 1) };
  }

  const hslM = s.match(
    /^hsla?\(\s*([\d.]+)(?:deg)?[,\s]+([\d.]+)%[,\s]+([\d.]+)%(?:[,/\s]+([\d.]+%?))?\s*\)$/
  );
  if (hslM) {
    const h = ((parseFloat(hslM[1]) % 360) + 360) % 360;
    const sat = clamp(parseFloat(hslM[2]) / 100, 0, 1);
    const l = clamp(parseFloat(hslM[3]) / 100, 0, 1);
    let a = 1;
    if (hslM[4] !== undefined) {
      a = hslM[4].endsWith('%') ? parseFloat(hslM[4]) / 100 : parseFloat(hslM[4]);
    }
    const c = (1 - Math.abs(2 * l - 1)) * sat;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;
    let rp = 0, gp = 0, bp = 0;
    if (h < 60) [rp, gp, bp] = [c, x, 0];
    else if (h < 120) [rp, gp, bp] = [x, c, 0];
    else if (h < 180) [rp, gp, bp] = [0, c, x];
    else if (h < 240) [rp, gp, bp] = [0, x, c];
    else if (h < 300) [rp, gp, bp] = [x, 0, c];
    else [rp, gp, bp] = [c, 0, x];
    return {
      r: Math.round((rp + m) * 255),
      g: Math.round((gp + m) * 255),
      b: Math.round((bp + m) * 255),
      a: clamp(a, 0, 1),
    };
  }
  return null;
}

function normalizeHex(input) {
  const c = typeof input === 'string' ? parseColor(input) : input;
  if (!c || c.a <= 0.01) return null;
  const base = `#${toHexByte(c.r)}${toHexByte(c.g)}${toHexByte(c.b)}`;
  if (c.a >= 0.995) return base;
  return `${base}${toHexByte(c.a * 255)}`;
}

function rgbToHsl(hex) {
  const c = parseColor(hex);
  if (!c) return { h: 0, s: 0, l: 0 };
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
    else if (max === g) h = ((b - r) / d + 2) * 60;
    else h = ((r - g) / d + 4) * 60;
  }
  return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function relativeLuminance(hex) {
  const c = parseColor(hex);
  if (!c) return 0;
  const lin = [c.r, c.g, c.b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function contrastRatio(hexA, hexB) {
  if (!hexA || !hexB) return null;
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

function colorDistance(hexA, hexB) {
  const a = parseColor(hexA);
  const b = parseColor(hexB);
  if (!a || !b) return 999;
  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function slugify(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/^--+/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'token';
}

function gcd(a, b) {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    [x, y] = [y, x % y];
  }
  return x;
}

function sortedNumericValues(freqObj) {
  return Object.entries(freqObj || {})
    .map(([k, count]) => ({ raw: k, px: parseFloat(k), count }))
    .filter((x) => !Number.isNaN(x.px) && x.px >= 0)
    .sort((a, b) => a.px - b.px);
}

function clusterColors(colorEntries) {
  const merged = [];
  for (const item of colorEntries || []) {
    const hex = normalizeHex(item.hex);
    if (!hex) continue;
    const existing = merged.find((m) => m.role === item.role && colorDistance(m.hex, hex) <= 10);
    if (existing) {
      existing.count += item.count || 1;
      existing.totalArea += item.totalArea || 0;
      for (const s of item.selectors || []) {
        if (existing.selectors.length < 5 && !existing.selectors.includes(s)) {
          existing.selectors.push(s);
        }
      }
      for (const [bg, c] of Object.entries(item.pairedBgs || {})) {
        existing.pairedBgs[bg] = (existing.pairedBgs[bg] || 0) + c;
      }
    } else {
      merged.push({
        hex,
        role: item.role,
        count: item.count || 1,
        totalArea: item.totalArea || 0,
        selectors: [...(item.selectors || [])],
        pairedBgs: { ...(item.pairedBgs || {}) },
      });
    }
  }
  return merged;
}

function pickBestColor(list, predicate, sortFn) {
  const filtered = list.filter(predicate);
  if (filtered.length === 0) return null;
  filtered.sort(sortFn || ((a, b) => b.totalArea - a.totalArea || b.count - a.count));
  return filtered[0];
}

function extractCssVarColors(customProperties, mode) {
  const vars = [];
  for (const cp of customProperties || []) {
    const isDarkRule =
      (cp.media && /prefers-color-scheme:\s*dark/i.test(cp.media)) ||
      /(?:\.dark|\[data-theme=["']?dark["']?\])/i.test(cp.selector || '');
    if (mode === 'light' && isDarkRule) continue;
    if (mode === 'dark' && !isDarkRule) continue;
    const hex = normalizeHex(cp.value);
    if (hex) {
      vars.push({ name: cp.name, hex, selector: cp.selector, media: cp.media, rawValue: cp.value });
    }
  }
  return vars;
}

function inferSemanticColors(stateData, mode) {
  const clustered = clusterColors(stateData?.computed?.colors || []);
  const bgList = clustered.filter((c) => c.role === 'background');
  const textList = clustered.filter((c) => c.role === 'text');
  const linkList = clustered.filter((c) => c.role === 'linkText');
  const borderList = clustered.filter((c) => c.role === 'border');
  const accentList = clustered.filter((c) => c.role === 'accentCandidate');

  // Canvas: look for html/body background first, fallback to largest-area background
  const bodyBg =
    pickBestColor(
      bgList,
      (c) => c.selectors.some((s) => s === 'body' || s === 'html' || s.startsWith('main')),
      (a, b) => b.totalArea - a.totalArea
    ) ||
    pickBestColor(bgList, () => true, (a, b) => b.totalArea - a.totalArea);

  const canvasHex = bodyBg ? bodyBg.hex : mode === 'dark' ? '#0f172a' : '#ffffff';
  const canvasLum = relativeLuminance(canvasHex);

  const elevatedBg = pickBestColor(
    bgList,
    (c) =>
      c.hex !== canvasHex &&
      colorDistance(c.hex, canvasHex) > 10 &&
      rgbToHsl(c.hex).s <= 25 &&
      Math.abs(relativeLuminance(c.hex) - canvasLum) <= 0.45,
    (a, b) => b.count * Math.sqrt(b.totalArea) - a.count * Math.sqrt(a.totalArea)
  );

  const subtleBg = pickBestColor(
    bgList,
    (c) =>
      c.hex !== canvasHex &&
      (!elevatedBg || c.hex !== elevatedBg.hex) &&
      rgbToHsl(c.hex).s <= 30,
    (a, b) => b.count - a.count
  );

  const inverseBg = pickBestColor(
    bgList,
    (c) =>
      Math.abs(relativeLuminance(c.hex) - canvasLum) >= 0.45 &&
      rgbToHsl(c.hex).s <= 35,
    (a, b) => b.totalArea - a.totalArea
  );

  // Text colors
  const primaryText = pickBestColor(
    textList,
    () => true,
    (a, b) => b.count - a.count || (contrastRatio(b.hex, canvasHex) || 0) - (contrastRatio(a.hex, canvasHex) || 0)
  );
  const primaryTextHex = primaryText ? primaryText.hex : mode === 'dark' ? '#f8fafc' : '#0f172a';

  const secondaryText = pickBestColor(
    textList,
    (c) => c.hex !== primaryTextHex && colorDistance(c.hex, primaryTextHex) > 15 && rgbToHsl(c.hex).s <= 30,
    (a, b) => b.count - a.count
  );

  const mutedText = pickBestColor(
    textList,
    (c) =>
      c.hex !== primaryTextHex &&
      (!secondaryText || c.hex !== secondaryText.hex) &&
      rgbToHsl(c.hex).s <= 30,
    (a, b) => b.count - a.count
  );

  const inverseText = pickBestColor(
    textList,
    (c) =>
      Math.abs(relativeLuminance(c.hex) - relativeLuminance(primaryTextHex)) >= 0.45,
    (a, b) => b.count - a.count
  );

  const linkText = pickBestColor(
    linkList,
    (c) => c.hex !== primaryTextHex,
    (a, b) => b.count - a.count
  );

  // Borders
  const sortedBorders = [...borderList].sort((a, b) => b.count - a.count);
  const borderDefault = sortedBorders[0] || null;
  const borderSubtle = sortedBorders[1] || null;

  // Accents: highest saturation/chroma interactive fills or link colors
  const accentPrimary =
    pickBestColor(
      accentList,
      (c) => rgbToHsl(c.hex).s >= 25,
      (a, b) => rgbToHsl(b.hex).s * Math.log2(b.count + 2) - rgbToHsl(a.hex).s * Math.log2(a.count + 2)
    ) ||
    (linkText && rgbToHsl(linkText.hex).s >= 25 ? linkText : null);

  const accentSecondary = accentPrimary
    ? pickBestColor(
        [...accentList, ...linkList],
        (c) =>
          c.hex !== accentPrimary.hex &&
          colorDistance(c.hex, accentPrimary.hex) > 35 &&
          rgbToHsl(c.hex).s >= 25,
        (a, b) => b.count - a.count
      )
    : null;

  // Check if button component specifies an explicit onPrimary text
  const primaryBtn = (stateData?.ontologyRaw?.components || []).find(
    (c) => c.archetype === 'button' && c.signature?.background && c.signature.background !== 'transparent'
  );
  const accentHex = accentPrimary ? accentPrimary.hex : null;
  let onPrimaryHex = null;
  if (primaryBtn && primaryBtn.signature?.color) {
    onPrimaryHex = normalizeHex(primaryBtn.signature.color);
  } else if (accentHex) {
    onPrimaryHex = relativeLuminance(accentHex) > 0.35 ? '#0f172a' : '#ffffff';
  }

  // Status colors: ONLY from explicit CSS variables matching semantic names
  const cssColorVars = extractCssVarColors(stateData?.stylesheets?.customProperties, mode);
  const status = {};
  for (const [roleKey, rx] of [
    ['success', /success|positive|valid|green/i],
    ['warning', /warn|caution|amber|yellow/i],
    ['danger', /danger|error|destructive|invalid|red/i],
    ['info', /info|notice/i],
  ]) {
    const match = cssColorVars.find((v) => rx.test(v.name));
    if (match) status[roleKey] = { hex: match.hex, source: `cssVar(${match.name})` };
  }

  return {
    surface: {
      canvas: canvasHex,
      elevated: elevatedBg ? elevatedBg.hex : null,
      subtle: subtleBg ? subtleBg.hex : null,
      inverse: inverseBg ? inverseBg.hex : null,
    },
    text: {
      primary: primaryTextHex,
      secondary: secondaryText ? secondaryText.hex : null,
      muted: mutedText ? mutedText.hex : null,
      inverse: inverseText ? inverseText.hex : null,
      link: linkText ? linkText.hex : null,
    },
    border: {
      default: borderDefault ? borderDefault.hex : null,
      subtle: borderSubtle ? borderSubtle.hex : null,
    },
    accent: {
      primary: accentHex,
      onPrimary: onPrimaryHex,
      secondary: accentSecondary ? accentSecondary.hex : null,
    },
    status,
    clustered,
    cssColorVars,
  };
}

function classifyTypography(typeEntries) {
  const entries = [...(typeEntries || [])];
  if (entries.length === 0) return { stacks: {}, scale: {} };

  // Find dominant sans/body entry
  const bodyCandidate =
    entries.find((e) => e.tags?.p || e.tags?.body || e.tags?.li) ||
    entries[0];
  const bodySize = parseFloat(bodyCandidate.fontSize) || 16;

  const monoCandidate = entries.find((e) =>
    /mono|consolas|menlo|courier|fira code|jetbrains/i.test(e.fontFamily || '') ||
    e.tags?.code ||
    e.tags?.pre
  );

  const headingCandidate = entries.find((e) => e.tags?.h1 || e.tags?.h2);

  const stacks = {
    sans: bodyCandidate.fontFamily || 'system-ui, sans-serif',
    ...(headingCandidate && headingCandidate.fontFamily !== bodyCandidate.fontFamily
      ? { display: headingCandidate.fontFamily }
      : {}),
    ...(monoCandidate ? { mono: monoCandidate.fontFamily } : {}),
  };

  const scale = {};
  const usedKeys = new Set();

  function assignRole(role, matchFn) {
    const match = entries.find((e) => !usedKeys.has(e) && matchFn(e));
    if (match) {
      usedKeys.add(match);
      scale[role] = match;
    }
  }

  assignRole('display', (e) => !e.tags?.h2 && parseFloat(e.fontSize) >= bodySize * 2.5);
  for (const h of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
    assignRole(h, (e) => Boolean(e.tags?.[h]));
  }
  assignRole('body', (e) => e === bodyCandidate || Boolean(e.tags?.p));
  assignRole('label', (e) => Boolean(e.tags?.label || e.tags?.button));
  assignRole('bodySm', (e) => parseFloat(e.fontSize) < bodySize && parseFloat(e.fontSize) >= bodySize * 0.78);
  assignRole('caption', (e) => parseFloat(e.fontSize) < bodySize * 0.78);
  if (monoCandidate && !usedKeys.has(monoCandidate)) {
    scale.code = monoCandidate;
  }

  return { stacks, scale };
}

function formatLineHeightRatio(lh, fs) {
  const lhNum = parseFloat(lh);
  const fsNum = parseFloat(fs);
  if (!lhNum || !fsNum || Number.isNaN(lhNum) || Number.isNaN(fsNum)) return 1.5;
  return Math.round((lhNum / fsNum) * 100) / 100;
}

function inferSpacingScale(spacingStats) {
  const allFreq = {};
  for (const bucket of ['padding', 'gap', 'margin']) {
    for (const [val, count] of Object.entries(spacingStats?.[bucket] || {})) {
      allFreq[val] = (allFreq[val] || 0) + count;
    }
  }
  const items = sortedNumericValues(allFreq).filter((x) => x.px > 0 && x.px <= 160);
  const topPx = [...items].sort((a, b) => b.count - a.count).slice(0, 8).map((x) => Math.round(x.px));
  let baseUnit = 4;
  if (topPx.length >= 2) {
    const g = topPx.reduce((acc, v) => gcd(acc, v));
    if ([4, 6, 8].includes(g)) baseUnit = g;
    else if (g >= 8 && g % 8 === 0) baseUnit = 8;
    else if (g >= 4 && g % 4 === 0) baseUnit = 4;
  }

  const distinctSteps = [...new Set(items.map((x) => `${Math.round(x.px)}px`))].slice(0, 14);
  return { baseUnit: `${baseUnit}px`, steps: distinctSteps, maxWidths: sortedNumericValues(spacingStats?.maxWidth) };
}

function inferRadii(radiiMap) {
  const vals = sortedNumericValues(radiiMap).filter((x) => x.px > 0);
  const tiers = {};
  for (const v of vals) {
    const px = Math.round(v.px);
    if (px >= 999) tiers.full = tiers.full || '9999px';
    else if (px <= 6 && !tiers.sm) tiers.sm = `${px}px`;
    else if (px > 6 && px <= 12 && !tiers.md) tiers.md = `${px}px`;
    else if (px > 12 && px <= 20 && !tiers.lg) tiers.lg = `${px}px`;
    else if (px > 20 && !tiers.xl) tiers.xl = `${px}px`;
  }
  return tiers;
}

function parseShadowMetric(shadowStr) {
  const nums = (shadowStr.match(/-?[\d.]+px/g) || []).map((n) => Math.abs(parseFloat(n)));
  return nums.reduce((a, b) => a + b, 0);
}

function inferShadows(shadowMap) {
  const list = Object.entries(shadowMap || {})
    .map(([value, count]) => ({ value, count, weight: parseShadowMetric(value) }))
    .sort((a, b) => a.weight - b.weight);
  const names = ['sm', 'md', 'lg', 'xl'];
  const out = {};
  list.slice(0, 4).forEach((item, idx) => {
    out[names[idx]] = item.value;
  });
  return out;
}

function parseDtcgShadow(shadowStr) {
  const m = shadowStr.match(
    /(rgba?\([^)]+\)|#[0-9a-f]{3,8})\s+(-?[\d.]+(?:px)?)\s+(-?[\d.]+(?:px)?)\s+([\d.]+(?:px)?)(?:\s+(-?[\d.]+(?:px)?))?/i
  ) || shadowStr.match(
    /(-?[\d.]+(?:px)?)\s+(-?[\d.]+(?:px)?)\s+([\d.]+(?:px)?)(?:\s+(-?[\d.]+(?:px)?))?\s+(rgba?\([^)]+\)|#[0-9a-f]{3,8})/i
  );
  if (!m) {
    return { color: '#0000001a', offsetX: '0px', offsetY: '2px', blur: '8px', spread: '0px' };
  }
  const isColorFirst = m[1].startsWith('#') || m[1].startsWith('rgb');
  if (isColorFirst) {
    return {
      color: normalizeHex(m[1]) || '#0000001a',
      offsetX: m[2] || '0px',
      offsetY: m[3] || '0px',
      blur: m[4] || '0px',
      spread: m[5] || '0px',
    };
  }
  return {
    color: normalizeHex(m[5]) || '#0000001a',
    offsetX: m[1] || '0px',
    offsetY: m[2] || '0px',
    blur: m[3] || '0px',
    spread: m[4] || '0px',
  };
}

// --- YAML Serializer ---

function needsYamlQuotes(str) {
  if (str === '') return true;
  if (/^(true|false|null|yes|no|on|off|~)$/i.test(str)) return true;
  if (/^[-+]?(\d+\.?\d*|\.\d+)$/.test(str)) return true;
  if (/^[\s]|[\s]$/.test(str)) return true;
  if (/^[#@*&!?{\[|>'"%,`]/.test(str)) return true;
  if (/:\s|\s#|[\r\n\t]/.test(str)) return true;
  return false;
}

function formatYamlScalar(val) {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'boolean' || typeof val === 'number') return String(val);
  const s = String(val);
  if (needsYamlQuotes(s)) {
    return JSON.stringify(s);
  }
  return s;
}

function toYaml(value, indent = 0) {
  const pad = '  '.repeat(indent);
  if (value === null || value === undefined || typeof value !== 'object') {
    return formatYamlScalar(value);
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    return value
      .map((item) => {
        if (item !== null && typeof item === 'object') {
          const inner = toYaml(item, indent + 1);
          const lines = inner.split('\n');
          return `${pad}- ${lines[0].trimStart()}\n${lines.slice(1).join('\n')}`.trimEnd();
        }
        return `${pad}- ${formatYamlScalar(item)}`;
      })
      .join('\n');
  }
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '{}';
  return entries
    .map(([k, v]) => {
      const safeKey = /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(k) ? k : JSON.stringify(k);
      if (v !== null && typeof v === 'object') {
        if (Array.isArray(v) && v.length === 0) return `${pad}${safeKey}: []`;
        if (!Array.isArray(v) && Object.keys(v).length === 0) return `${pad}${safeKey}: {}`;
        return `${pad}${safeKey}:\n${toYaml(v, indent + 1)}`;
      }
      return `${pad}${safeKey}: ${formatYamlScalar(v)}`;
    })
    .join('\n');
}

// --- Artifact Builders ---

function buildTokens(capture, lightStateName, darkStateName) {
  const lightState = capture.states[lightStateName];
  const darkState = darkStateName ? capture.states[darkStateName] : null;

  const lightSem = inferSemanticColors(lightState, 'light');
  const darkSem = darkState ? inferSemanticColors(darkState, 'dark') : null;
  const typo = classifyTypography(lightState?.computed?.typography);
  const spacing = inferSpacingScale(lightState?.computed?.spacing);
  const radii = inferRadii(lightState?.computed?.radii);
  const shadows = inferShadows(lightState?.computed?.shadows);

  // Registry of primitive leaf dot-paths -> { type, value }
  const primitiveColorMap = new Map(); // hex -> primitiveKey
  const primitive = {
    color: { $type: 'color' },
    fontFamily: { $type: 'fontFamily' },
    fontSize: { $type: 'dimension' },
    fontWeight: { $type: 'fontWeight' },
    lineHeight: { $type: 'number' },
    space: { $type: 'dimension' },
    radius: { $type: 'dimension' },
    borderWidth: { $type: 'dimension' },
    shadow: { $type: 'shadow' },
    duration: { $type: 'duration' },
    easing: { $type: 'string' },
    breakpoint: { $type: 'dimension' },
  };

  let paletteCounter = 1;
  function ensurePrimitiveColor(hex, preferredKey, sourceNote) {
    if (!hex) return null;
    if (primitiveColorMap.has(hex)) {
      return `primitive.color.${primitiveColorMap.get(hex)}`;
    }
    let key = slugify(preferredKey || `palette-${paletteCounter++}`);
    while (primitive.color[key]) {
      key = `${key}-${paletteCounter++}`;
    }
    primitive.color[key] = {
      $value: hex,
      $extensions: { referent: { provenance: 'measured', source: sourceNote || 'computed' } },
    };
    primitiveColorMap.set(hex, key);
    return `primitive.color.${key}`;
  }

  // Register explicit CSS variables first for readable names
  for (const cv of lightSem.cssColorVars) {
    ensurePrimitiveColor(cv.hex, cv.name, `cssVar(${cv.name})`);
  }

  // Register semantic color primitives
  const colorRoles = [
    ['surface.canvas', lightSem.surface.canvas, 'canvas-bg'],
    ['surface.elevated', lightSem.surface.elevated, 'elevated-bg'],
    ['surface.subtle', lightSem.surface.subtle, 'subtle-bg'],
    ['surface.inverse', lightSem.surface.inverse, 'inverse-bg'],
    ['text.primary', lightSem.text.primary, 'ink-primary'],
    ['text.secondary', lightSem.text.secondary, 'ink-secondary'],
    ['text.muted', lightSem.text.muted, 'ink-muted'],
    ['text.inverse', lightSem.text.inverse, 'ink-inverse'],
    ['text.link', lightSem.text.link, 'ink-link'],
    ['border.default', lightSem.border.default, 'line-default'],
    ['border.subtle', lightSem.border.subtle, 'line-subtle'],
    ['accent.primary', lightSem.accent.primary, 'brand-primary'],
    ['accent.onPrimary', lightSem.accent.onPrimary, 'brand-on-primary'],
    ['accent.secondary', lightSem.accent.secondary, 'brand-secondary'],
  ];

  const semanticColor = {};
  for (const [dotPath, hex, fallbackName] of colorRoles) {
    if (!hex) continue;
    const primPath = ensurePrimitiveColor(hex, fallbackName, 'computed');
    const [group, name] = dotPath.split('.');
    if (!semanticColor[group]) semanticColor[group] = {};
    semanticColor[group][name] = {
      $type: 'color',
      $value: `{${primPath}}`,
      $description: `Measured ${group} ${name} color (${hex})`,
    };
  }

  for (const [sName, info] of Object.entries(lightSem.status || {})) {
    const primPath = ensurePrimitiveColor(info.hex, `status-${sName}`, info.source);
    if (!semanticColor.status) semanticColor.status = {};
    semanticColor.status[sName] = {
      $type: 'color',
      $value: `{${primPath}}`,
      $description: `Detected ${sName} status color (${info.hex})`,
    };
  }

  // Also include top measured palette colors in primitive.color
  for (const c of lightSem.clustered.slice(0, 12)) {
    ensurePrimitiveColor(c.hex, null, `computed:${c.role}`);
  }

  // Font primitives + semantic typography
  for (const [k, stack] of Object.entries(typo.stacks)) {
    primitive.fontFamily[k] = {
      $value: stack.split(',').map((s) => s.trim()),
    };
  }

  const sizeKeyByVal = new Map();
  const weightKeyByVal = new Map();
  const lhKeyByVal = new Map();

  for (const [role, entry] of Object.entries(typo.scale)) {
    const fsVal = entry.fontSize || '16px';
    const fsKey = `size-${slugify(fsVal)}`;
    if (!primitive.fontSize[fsKey]) primitive.fontSize[fsKey] = { $value: fsVal };
    sizeKeyByVal.set(fsVal, `primitive.fontSize.${fsKey}`);

    const fwNum = parseInt(entry.fontWeight, 10) || 400;
    const fwKey = `w${fwNum}`;
    if (!primitive.fontWeight[fwKey]) primitive.fontWeight[fwKey] = { $value: fwNum };
    weightKeyByVal.set(fwNum, `primitive.fontWeight.${fwKey}`);

    const lhRatio = formatLineHeightRatio(entry.lineHeight, fsVal);
    const lhKey = `lh-${String(lhRatio).replace('.', '_')}`;
    if (!primitive.lineHeight[lhKey]) primitive.lineHeight[lhKey] = { $value: lhRatio };
    lhKeyByVal.set(lhRatio, `primitive.lineHeight.${lhKey}`);
  }

  const semanticTypo = {};
  for (const [role, entry] of Object.entries(typo.scale)) {
    const fsVal = entry.fontSize || '16px';
    const fwNum = parseInt(entry.fontWeight, 10) || 400;
    const lhRatio = formatLineHeightRatio(entry.lineHeight, fsVal);
    const famKey =
      role === 'code' && primitive.fontFamily.mono
        ? 'primitive.fontFamily.mono'
        : (role === 'display' || role === 'h1') && primitive.fontFamily.display
          ? 'primitive.fontFamily.display'
          : 'primitive.fontFamily.sans';
    semanticTypo[role] = {
      $type: 'typography',
      $value: {
        fontFamily: `{${famKey}}`,
        fontSize: `{${sizeKeyByVal.get(fsVal)}}`,
        fontWeight: `{${weightKeyByVal.get(fwNum)}}`,
        lineHeight: `{${lhKeyByVal.get(lhRatio)}}`,
        letterSpacing: entry.letterSpacing === 'normal' ? '0px' : entry.letterSpacing || '0px',
      },
    };
  }

  // Spacing primitives + semantic
  const semanticSpace = {};
  spacing.steps.forEach((step, idx) => {
    const k = `s${idx + 1}`;
    primitive.space[k] = { $value: step };
    semanticSpace[slugify(step)] = {
      $type: 'dimension',
      $value: `{primitive.space.${k}}`,
    };
  });
  if (Object.keys(primitive.space).length === 0) {
    primitive.space.s1 = { $value: '8px' };
    semanticSpace['8px'] = { $type: 'dimension', $value: '{primitive.space.s1}' };
  }

  // Radii
  const semanticRadius = {};
  primitive.radius.none = { $value: '0px' };
  semanticRadius.none = { $type: 'dimension', $value: '{primitive.radius.none}' };
  for (const [tier, val] of Object.entries(radii)) {
    primitive.radius[tier] = { $value: val };
    semanticRadius[tier] = { $type: 'dimension', $value: `{primitive.radius.${tier}}` };
  }

  // Border widths
  const bwKeys = sortedNumericValues(lightState?.computed?.borderWidths).slice(0, 4);
  if (bwKeys.length === 0) {
    primitive.borderWidth.thin = { $value: '1px' };
  } else {
    bwKeys.forEach((b, i) => {
      primitive.borderWidth[`w${i + 1}`] = { $value: b.raw };
    });
  }

  // Shadows
  const semanticElevation = {};
  for (const [tier, rawShadow] of Object.entries(shadows)) {
    primitive.shadow[tier] = { $value: parseDtcgShadow(rawShadow) };
    semanticElevation[tier] = {
      $type: 'shadow',
      $value: `{primitive.shadow.${tier}}`,
    };
  }
  if (Object.keys(primitive.shadow).length === 0) {
    delete primitive.shadow;
  }

  // Motion
  const durations = Object.keys(lightState?.computed?.motion?.durations || {}).slice(0, 4);
  durations.forEach((d, i) => {
    primitive.duration[`d${i + 1}`] = { $value: d };
  });
  if (durations.length === 0) delete primitive.duration;

  const easings = Object.keys(lightState?.computed?.motion?.easings || {}).slice(0, 4);
  easings.forEach((e, i) => {
    primitive.easing[`e${i + 1}`] = { $value: e };
  });
  if (easings.length === 0) delete primitive.easing;

  // Breakpoints
  const bps = (lightState?.stylesheets?.breakpoints || [])
    .map((bp) => {
      const m = bp.match(/:\s*([\d.]+(?:px|rem|em))/i);
      return m ? m[1] : null;
    })
    .filter(Boolean);
  [...new Set(bps)].slice(0, 6).forEach((bp, i) => {
    primitive.breakpoint[`bp${i + 1}`] = { $value: bp };
  });
  if (Object.keys(primitive.breakpoint).length === 0) delete primitive.breakpoint;

  // Component tokens
  const componentTokens = {};
  const comps = lightState?.ontologyRaw?.components || [];
  const primaryButton = comps.find(
    (c) => c.archetype === 'button' && c.signature?.background !== 'transparent'
  ) || comps.find((c) => c.archetype === 'button');
  if (primaryButton) {
    const bgHex = normalizeHex(primaryButton.signature?.background);
    const fgHex = normalizeHex(primaryButton.signature?.color);
    const rad = primaryButton.signature?.radius;
    componentTokens.button = {
      primary: {
        ...(bgHex && semanticColor.accent?.primary && bgHex === lightSem.accent.primary
          ? { bg: { $type: 'color', $value: '{semantic.color.accent.primary}' } }
          : bgHex
            ? { bg: { $type: 'color', $value: `{${ensurePrimitiveColor(bgHex, 'btn-bg', 'button')}}` } }
            : {}),
        ...(fgHex
          ? { text: { $type: 'color', $value: `{${ensurePrimitiveColor(fgHex, 'btn-fg', 'button')}}` } }
          : {}),
        ...(rad && Object.values(radii).includes(rad)
          ? {
              radius: {
                $type: 'dimension',
                $value: `{semantic.radius.${Object.keys(radii).find((k) => radii[k] === rad)}}`,
              },
            }
          : rad
            ? { radius: { $type: 'dimension', $value: rad } }
            : {}),
      },
    };
  }

  const cardComp = comps.find((c) => c.archetype === 'card');
  if (cardComp) {
    const cBg = normalizeHex(cardComp.signature?.background);
    componentTokens.card = {
      ...(cBg
        ? {
            bg: {
              $type: 'color',
              $value:
                cBg === lightSem.surface.elevated && semanticColor.surface?.elevated
                  ? '{semantic.color.surface.elevated}'
                  : `{${ensurePrimitiveColor(cBg, 'card-bg', 'card')}}`,
            },
          }
        : {}),
      ...(cardComp.signature?.radius
        ? { radius: { $type: 'dimension', $value: cardComp.signature.radius } }
        : {}),
    };
  }

  // Dark mode diffs
  let darkOverrides = null;
  if (darkSem) {
    const darkDiffs = {};
    const pairs = [
      ['surface', 'canvas', darkSem.surface.canvas, lightSem.surface.canvas],
      ['surface', 'elevated', darkSem.surface.elevated, lightSem.surface.elevated],
      ['surface', 'subtle', darkSem.surface.subtle, lightSem.surface.subtle],
      ['surface', 'inverse', darkSem.surface.inverse, lightSem.surface.inverse],
      ['text', 'primary', darkSem.text.primary, lightSem.text.primary],
      ['text', 'secondary', darkSem.text.secondary, lightSem.text.secondary],
      ['text', 'muted', darkSem.text.muted, lightSem.text.muted],
      ['text', 'link', darkSem.text.link, lightSem.text.link],
      ['border', 'default', darkSem.border.default, lightSem.border.default],
      ['accent', 'primary', darkSem.accent.primary, lightSem.accent.primary],
    ];
    for (const [grp, key, darkVal, lightVal] of pairs) {
      if (darkVal && darkVal !== lightVal) {
        const primDark = ensurePrimitiveColor(darkVal, `dark-${grp}-${key}`, 'dark-mode');
        if (!darkDiffs[grp]) darkDiffs[grp] = {};
        darkDiffs[grp][key] = {
          $type: 'color',
          $value: `{${primDark}}`,
          $description: `Dark mode override for ${grp}.${key} (${darkVal})`,
        };
      }
    }
    if (Object.keys(darkDiffs).length > 0) {
      darkOverrides = { color: darkDiffs };
    }
  }

  const dtcg = {
    $extensions: {
      referent: {
        url: capture.url,
        capturedAt: capture.capturedAt,
        primaryState: lightStateName,
        darkState: darkStateName || null,
      },
    },
    primitive,
    semantic: {
      color: semanticColor,
      typography: semanticTypo,
      space: semanticSpace,
      radius: semanticRadius,
      ...(Object.keys(semanticElevation).length > 0 ? { elevation: semanticElevation } : {}),
    },
    ...(Object.keys(componentTokens).length > 0 ? { component: componentTokens } : {}),
    ...(darkOverrides ? { modes: { dark: darkOverrides } } : {}),
  };

  return {
    dtcg,
    lightSem,
    darkSem,
    typo,
    spacing,
    radii,
    shadows,
  };
}

function resolveDtcgValue(dtcg, val) {
  let cur = val;
  for (let depth = 0; depth < 8; depth++) {
    if (typeof cur !== 'string') return cur;
    const m = cur.match(/^\{([^}]+)\}$/);
    if (!m) return cur;
    const parts = m[1].split('.');
    let node = dtcg;
    for (const p of parts) node = node?.[p];
    if (!node || typeof node !== 'object' || node.$value === undefined) return cur;
    cur = node.$value;
  }
  return cur;
}

function buildTokensCss(dtcg, capture, lightStateName) {
  const lines = [
    `/* Generated from ${capture.url} (${capture.capturedAt}) */`,
    `:root {`,
  ];

  // Semantic colors
  for (const [grp, entries] of Object.entries(dtcg.semantic.color || {})) {
    for (const [k, tok] of Object.entries(entries)) {
      lines.push(`  --color-${slugify(grp)}-${slugify(k)}: ${resolveDtcgValue(dtcg, tok.$value)};`);
    }
  }
  // Font families
  for (const [k, tok] of Object.entries(dtcg.primitive.fontFamily || {})) {
    if (k.startsWith('$')) continue;
    const val = Array.isArray(tok.$value) ? tok.$value.join(', ') : tok.$value;
    lines.push(`  --font-${slugify(k)}: ${val};`);
  }
  // Spacing
  for (const [k, tok] of Object.entries(dtcg.semantic.space || {})) {
    lines.push(`  --space-${slugify(k)}: ${resolveDtcgValue(dtcg, tok.$value)};`);
  }
  // Radii
  for (const [k, tok] of Object.entries(dtcg.semantic.radius || {})) {
    lines.push(`  --radius-${slugify(k)}: ${resolveDtcgValue(dtcg, tok.$value)};`);
  }
  // Elevation
  for (const [k, tok] of Object.entries(dtcg.semantic.elevation || {})) {
    const s = resolveDtcgValue(dtcg, tok.$value);
    if (s && typeof s === 'object') {
      lines.push(
        `  --shadow-${slugify(k)}: ${s.offsetX} ${s.offsetY} ${s.blur} ${s.spread} ${s.color};`
      );
    }
  }

  // Referent's original declared CSS custom properties (namespaced comment + preserved vars)
  const rawProps = capture.states[lightStateName]?.stylesheets?.customProperties || [];
  const rootRaw = rawProps.filter((p) => !p.media && /^(:root|html|body)$/i.test((p.selector || '').trim()));
  if (rootRaw.length > 0) {
    lines.push('');
    lines.push('  /* Measured referent custom properties */');
    const seen = new Set();
    for (const cp of rootRaw.slice(0, 40)) {
      if (seen.has(cp.name) || !cp.value) continue;
      seen.add(cp.name);
      lines.push(`  ${cp.name}: ${cp.value};`);
    }
  }

  lines.push('}');

  if (dtcg.modes?.dark?.color) {
    const darkLines = [];
    for (const [grp, entries] of Object.entries(dtcg.modes.dark.color)) {
      for (const [k, tok] of Object.entries(entries)) {
        darkLines.push(`    --color-${slugify(grp)}-${slugify(k)}: ${resolveDtcgValue(dtcg, tok.$value)};`);
      }
    }
    if (darkLines.length > 0) {
      lines.push('');
      lines.push('@media (prefers-color-scheme: dark) {');
      lines.push('  :root {');
      lines.push(...darkLines);
      lines.push('  }');
      lines.push('}');
      lines.push('');
      lines.push('[data-theme="dark"], .dark {');
      lines.push(...darkLines.map((l) => l.replace(/^ {2}/, '')));
      lines.push('}');
    }
  }

  lines.push('');
  return lines.join('\n');
}

function buildTailwindThemeCss(dtcg) {
  const lines = [
    '/* Tailwind CSS v4 @theme configuration */',
    '@theme {',
  ];
  for (const [grp, entries] of Object.entries(dtcg.semantic.color || {})) {
    for (const [k, tok] of Object.entries(entries)) {
      lines.push(`  --color-${slugify(grp)}-${slugify(k)}: ${resolveDtcgValue(dtcg, tok.$value)};`);
    }
  }
  for (const [k, tok] of Object.entries(dtcg.primitive.fontFamily || {})) {
    if (k.startsWith('$')) continue;
    const val = Array.isArray(tok.$value) ? tok.$value.join(', ') : tok.$value;
    lines.push(`  --font-${slugify(k)}: ${val};`);
  }
  for (const [k, tok] of Object.entries(dtcg.semantic.radius || {})) {
    lines.push(`  --radius-${slugify(k)}: ${resolveDtcgValue(dtcg, tok.$value)};`);
  }
  for (const [k, tok] of Object.entries(dtcg.semantic.elevation || {})) {
    const s = resolveDtcgValue(dtcg, tok.$value);
    if (s && typeof s === 'object') {
      lines.push(
        `  --shadow-${slugify(k)}: ${s.offsetX} ${s.offsetY} ${s.blur} ${s.spread} ${s.color};`
      );
    }
  }
  lines.push('}');
  lines.push('');
  return lines.join('\n');
}

function buildTailwindConfigMjs(dtcg) {
  const colors = {};
  for (const [grp, entries] of Object.entries(dtcg.semantic.color || {})) {
    colors[slugify(grp)] = {};
    for (const [k, tok] of Object.entries(entries)) {
      colors[slugify(grp)][slugify(k)] = resolveDtcgValue(dtcg, tok.$value);
    }
  }
  const fontFamily = {};
  for (const [k, tok] of Object.entries(dtcg.primitive.fontFamily || {})) {
    if (k.startsWith('$')) continue;
    fontFamily[slugify(k)] = Array.isArray(tok.$value) ? tok.$value : [tok.$value];
  }
  const borderRadius = {};
  for (const [k, tok] of Object.entries(dtcg.semantic.radius || {})) {
    borderRadius[slugify(k)] = resolveDtcgValue(dtcg, tok.$value);
  }
  const boxShadow = {};
  for (const [k, tok] of Object.entries(dtcg.semantic.elevation || {})) {
    const s = resolveDtcgValue(dtcg, tok.$value);
    if (s && typeof s === 'object') {
      boxShadow[slugify(k)] = `${s.offsetX} ${s.offsetY} ${s.blur} ${s.spread} ${s.color}`;
    }
  }
  const spacing = {};
  for (const [k, tok] of Object.entries(dtcg.semantic.space || {})) {
    spacing[slugify(k)] = resolveDtcgValue(dtcg, tok.$value);
  }

  const cfg = {
    theme: {
      extend: {
        colors,
        fontFamily,
        borderRadius,
        ...(Object.keys(boxShadow).length > 0 ? { boxShadow } : {}),
        spacing,
      },
    },
  };
  return `/** Tailwind CSS v3 theme configuration extracted from referent */\nexport default ${JSON.stringify(cfg, null, 2)};\n`;
}

function buildOntology(capture, lightStateName, darkStateName, mobileStateName, compiled) {
  const light = capture.states[lightStateName];
  const dark = darkStateName ? capture.states[darkStateName] : null;
  const mobile = mobileStateName ? capture.states[mobileStateName] : null;

  // Regions with desktop vs mobile pairing
  const desktopRegions = light?.ontologyRaw?.regions || [];
  const mobileRegions = mobile?.ontologyRaw?.regions || [];
  const regions = desktopRegions.map((r, idx) => {
    const mob =
      mobileRegions.find((m) => m.selector === r.selector) ||
      mobileRegions.find((m) => m.role === r.role && m.tag === r.tag);
    let responsiveBehavior = 'unknown';
    if (mobile) {
      if (!mob) responsiveBehavior = 'hidden-or-collapsed-on-mobile';
      else if (mob.box.width === mobile.viewport.width && r.box.width < light.viewport.width) {
        responsiveBehavior = 'expands-full-width-on-mobile';
      } else if (mob.box.height > r.box.height * 1.25) {
        responsiveBehavior = 'stacks-vertically-on-mobile';
      } else {
        responsiveBehavior = 'persists';
      }
    }
    return {
      id: `region-${r.role}-${idx + 1}`,
      role: r.role,
      tag: r.tag,
      ariaLabel: r.ariaLabel,
      positioning: r.positioning,
      desktopBox: r.box,
      ...(mob ? { mobileBox: mob.box } : {}),
      responsiveBehavior,
    };
  });

  // Surfaces
  const surfaces = [
    {
      id: 'canvas',
      role: 'page-background',
      lightBg: compiled.lightSem.surface.canvas,
      ...(compiled.darkSem ? { darkBg: compiled.darkSem.surface.canvas } : {}),
      elevation: 'none',
    },
  ];
  if (compiled.lightSem.surface.elevated) {
    surfaces.push({
      id: 'elevated',
      role: 'card-and-panel-surface',
      lightBg: compiled.lightSem.surface.elevated,
      ...(compiled.darkSem?.surface?.elevated ? { darkBg: compiled.darkSem.surface.elevated } : {}),
      elevation: compiled.shadows.sm ? 'sm' : 'bordered',
    });
  }
  if (compiled.lightSem.surface.subtle) {
    surfaces.push({
      id: 'subtle',
      role: 'muted-container-and-input-surface',
      lightBg: compiled.lightSem.surface.subtle,
      ...(compiled.darkSem?.surface?.subtle ? { darkBg: compiled.darkSem.surface.subtle } : {}),
      elevation: 'none',
    });
  }

  // Components merged with interactionProbes
  const probes = light?.interactionProbes || [];
  const byArchetype = new Map();
  for (const comp of light?.ontologyRaw?.components || []) {
    if (!byArchetype.has(comp.archetype)) byArchetype.set(comp.archetype, []);
    byArchetype.get(comp.archetype).push(comp);
  }

  const components = [];
  for (const [archetype, variants] of byArchetype.entries()) {
    const primary = [...variants].sort((a, b) => b.instances - a.instances)[0];
    const totalInstances = variants.reduce((s, v) => s + v.instances, 0);
    const allSlots = [...new Set(variants.flatMap((v) => v.slots || []))];
    const matchingProbe = probes.find(
      (p) => p.selector === primary.sampleSelector || (archetype === 'button' && p.tag === 'button') || (archetype === 'link' && p.tag === 'a') || (archetype === 'input' && (p.tag === 'input' || p.tag === 'textarea'))
    );

    const states = {
      default: primary.signature,
    };
    if (matchingProbe) {
      if (Object.keys(matchingProbe.hoverDelta || {}).length > 0) {
        states.hover = matchingProbe.hoverDelta;
      }
      if (Object.keys(matchingProbe.focusDelta || {}).length > 0) {
        states.focusVisible = matchingProbe.focusDelta;
      }
    }

    components.push({
      id: `${archetype}-component`,
      archetype,
      instances: totalInstances,
      variantCount: variants.length,
      anatomy: {
        slots: allSlots.map((s) => ({
          name: s,
          required: s === 'label' || s === 'container' || s === 'value',
        })),
      },
      variants: variants.slice(0, 4).map((v, i) => ({
        name: i === 0 ? 'primary' : `variant-${i + 1}`,
        instances: v.instances,
        signature: v.signature,
      })),
      states,
      composition: {
        allowedParents: [...new Set(variants.flatMap((v) => v.parentTags || []))].slice(0, 6),
        allowedChildren: [...new Set(variants.flatMap((v) => v.childTags || []))].slice(0, 6),
      },
    });
  }

  // Invariants
  const contrastChecks = [];
  const cPairs = [
    ['text.primary on surface.canvas', compiled.lightSem.text.primary, compiled.lightSem.surface.canvas],
    ['text.secondary on surface.canvas', compiled.lightSem.text.secondary, compiled.lightSem.surface.canvas],
    ['text.primary on surface.elevated', compiled.lightSem.text.primary, compiled.lightSem.surface.elevated],
    ['accent.onPrimary on accent.primary', compiled.lightSem.accent.onPrimary, compiled.lightSem.accent.primary],
  ];
  for (const [label, fg, bg] of cPairs) {
    if (!fg || !bg) continue;
    const ratio = contrastRatio(fg, bg);
    if (ratio !== null) {
      contrastChecks.push({
        pair: label,
        foreground: fg,
        background: bg,
        ratio,
        aaNormal: ratio >= 4.5,
        aaLarge: ratio >= 3.0,
      });
    }
  }

  const headings = light?.ontologyRaw?.headings || [];
  const hIssues = [];
  if (headings.length > 0 && headings[0].level !== 1) {
    hIssues.push(`First heading is <${headings[0].tag}> instead of <h1>.`);
  }
  for (let i = 1; i < headings.length; i++) {
    if (headings[i].level > headings[i - 1].level + 1) {
      hIssues.push(
        `Heading level skipped from <${headings[i - 1].tag}> to <${headings[i].tag}>.`
      );
    }
  }

  const touchStats = (mobile || light)?.ontologyRaw?.touchTargets || {
    totalChecked: 0,
    under44pxCount: 0,
    samples: [],
  };

  const focusVisibleCount = probes.filter(
    (p) => Object.keys(p.focusDelta || {}).length > 0
  ).length;

  const hasShadows = Object.keys(compiled.shadows).length > 0;
  const hasBorders = Object.keys(light?.computed?.borderWidths || {}).length > 0;
  const surfaceModel = hasShadows
    ? 'elevated-cards'
    : hasBorders
      ? 'bordered-flat'
      : 'flat';

  const docRatio = light?.meta?.documentHeight && light?.meta?.viewport?.height
    ? light.meta.documentHeight / light.meta.viewport.height
    : 2;

  return {
    schemaVersion: '1.0.0',
    meta: {
      url: capture.url,
      title: light?.meta?.title || '',
      capturedAt: capture.capturedAt,
      statesCaptured: Object.keys(capture.states),
      crossOriginStylesheetsSkipped: light?.stylesheets?.crossOriginStylesheetsSkipped || 0,
    },
    designGrammar: {
      density: docRatio > 3 ? 'balanced' : 'airy',
      surfaceModel,
      layoutStructure: regions.some((r) => r.tag === 'aside')
        ? 'header-sidebar-main'
        : 'top-nav-stacked-sections',
      maxContentWidth: compiled.spacing.maxWidths[0]?.raw || '100%',
      baseGridUnit: compiled.spacing.baseUnit,
      breakpoints: (light?.stylesheets?.breakpoints || []).slice(0, 8),
    },
    regions,
    surfaces,
    components,
    interactions: {
      focusStrategy: focusVisibleCount > 0 ? 'visible-focus-delta' : 'browser-default-or-unprobed',
      hoverPatterns: [
        ...new Set(probes.flatMap((p) => Object.keys(p.hoverDelta || {}))),
      ],
      motionDurations: Object.keys(light?.computed?.motion?.durations || {}).slice(0, 6),
      motionEasings: Object.keys(light?.computed?.motion?.easings || {}).slice(0, 4),
    },
    invariants: {
      contrastChecks,
      headingHierarchy: {
        valid: hIssues.length === 0,
        sequence: headings.map((h) => h.tag),
        issues: hIssues,
      },
      mobileTouchTargets: touchStats,
      focusVisibility: {
        probedCount: probes.length,
        visibleFocusCount: focusVisibleCount,
      },
    },
  };
}

function buildDesignMd(capture, dtcg, ontology, compiled) {
  const { lightSem, darkSem, typo, spacing, radii, shadows } = compiled;

  const colorRows = [
    ['surface.canvas', lightSem.surface.canvas, darkSem?.surface?.canvas || '—'],
    ['surface.elevated', lightSem.surface.elevated || '—', darkSem?.surface?.elevated || '—'],
    ['surface.subtle', lightSem.surface.subtle || '—', darkSem?.surface?.subtle || '—'],
    ['text.primary', lightSem.text.primary, darkSem?.text?.primary || '—'],
    ['text.secondary', lightSem.text.secondary || '—', darkSem?.text?.secondary || '—'],
    ['text.link', lightSem.text.link || '—', darkSem?.text?.link || '—'],
    ['border.default', lightSem.border.default || '—', darkSem?.border?.default || '—'],
    ['accent.primary', lightSem.accent.primary || '—', darkSem?.accent?.primary || '—'],
    ['accent.onPrimary', lightSem.accent.onPrimary || '—', '—'],
  ];

  const contrastRows = (ontology.invariants.contrastChecks || []).map(
    (c) => `| ${c.pair} | \`${c.foreground}\` on \`${c.background}\` | ${c.ratio}:1 | ${c.aaNormal ? 'PASS' : 'FAIL'} |`
  );

  const typeRows = Object.entries(typo.scale).map(
    ([role, e]) =>
      `| \`${role}\` | ${e.fontSize} | ${e.fontWeight} | ${e.lineHeight} | ${e.letterSpacing} | ${e.sampleText ? `"${e.sampleText.slice(0, 32)}"` : '—'} |`
  );

  const regionRows = ontology.regions.map(
    (r) =>
      `| \`<${r.tag}>\` (${r.role}) | ${r.positioning} | ${r.desktopBox.width}×${r.desktopBox.height}px | ${r.mobileBox ? `${r.mobileBox.width}×${r.mobileBox.height}px` : '—'} | ${r.responsiveBehavior} |`
  );

  const componentSections = ontology.components.map((c) => {
    const slots = c.anatomy.slots.map((s) => `\`${s.name}\`${s.required ? ' (required)' : ''}`).join(', ');
    const defSig = c.states.default || {};
    const hoverKeys = Object.entries(c.states.hover || {})
      .map(([k, v]) => `${k}: \`${v.from}\` -> \`${v.to}\``)
      .join('; ');
    const focusKeys = Object.entries(c.states.focusVisible || {})
      .map(([k, v]) => `${k}: \`${v.from}\` -> \`${v.to}\``)
      .join('; ');
    return [
      `### ${c.archetype} (\`${c.id}\`, ${c.instances} instances)`,
      `- **Slots**: ${slots || 'none'}`,
      `- **Default Signature**: bg \`${defSig.background || 'transparent'}\`, color \`${defSig.color || 'inherit'}\`, radius \`${defSig.radius || '0px'}\`, padding \`${defSig.padding || '0px'}\``,
      hoverKeys ? `- **Hover Delta (measured)**: ${hoverKeys}` : '- **Hover Delta**: not observed in automated probe',
      focusKeys ? `- **Focus Delta (measured)**: ${focusKeys}` : '- **Focus Delta**: not observed in automated probe',
    ].join('\n');
  });

  return `# DESIGN.md — ${ontology.meta.title || ontology.meta.url}

> **Provenance**: Deterministically extracted from \`${ontology.meta.url}\` on ${ontology.meta.capturedAt}.
> Captured states: ${ontology.meta.statesCaptured.map((s) => `\`${s}\``).join(', ')}.

## 1. Visual Identity & Design Grammar

- **Surface Model**: \`${ontology.designGrammar.surfaceModel}\` [measured]
- **Layout Structure**: \`${ontology.designGrammar.layoutStructure}\` [measured]
- **Base Grid Unit**: \`${ontology.designGrammar.baseGridUnit}\` [measured]
- **Max Content Width**: \`${ontology.designGrammar.maxContentWidth}\` [measured]
- **Density**: \`${ontology.designGrammar.density}\` [inferred from document-to-viewport height ratio]

## 2. Color System & Contrast

| Semantic Role | Light Mode | Dark Mode |
| --- | --- | --- |
${colorRows.map(([r, l, d]) => `| \`${r}\` | \`${l}\` | \`${d}\` |`).join('\n')}

### Measured WCAG 2.1 Contrast Checks

| Pair | Colors | Ratio | AA Normal (>= 4.5:1) |
| --- | --- | --- | --- |
${contrastRows.length > 0 ? contrastRows.join('\n') : '| — | No opaque foreground/background pairs evaluated | — | — |'}

## 3. Typography Scale

- **Primary Sans Stack**: \`${typo.stacks.sans || 'system-ui, sans-serif'}\`
${typo.stacks.display ? `- **Display Stack**: \`${typo.stacks.display}\`\n` : ''}${typo.stacks.mono ? `- **Monospace Stack**: \`${typo.stacks.mono}\`\n` : ''}
| Role | Font Size | Weight | Line Height | Letter Spacing | Sample |
| --- | --- | --- | --- | --- | --- |
${typeRows.length > 0 ? typeRows.join('\n') : '| — | — | — | — | — | — |'}

## 4. Layout Grammar, Spacing & Responsive Shifts

- **Spacing Scale**: ${spacing.steps.map((s) => `\`${s}\``).join(', ') || '`8px`'}
- **Media Breakpoints**: ${ontology.designGrammar.breakpoints.map((b) => `\`${b}\``).join(', ') || 'None detected in accessible stylesheets'}

| Region | Positioning | Desktop Box | Mobile Box | Responsive Behavior |
| --- | --- | --- | --- | --- |
${regionRows.length > 0 ? regionRows.join('\n') : '| — | — | — | — | — |'}

## 5. Shape, Elevation & Motion

- **Radii**: ${Object.entries(radii).map(([k, v]) => `\`${k}=${v}\``).join(', ') || '`none=0px`'}
- **Shadows**: ${Object.entries(shadows).map(([k, v]) => `\`${k}\`: \`${v}\``).join(' | ') || 'None (flat/bordered)'}
- **Motion Durations**: ${ontology.interactions.motionDurations.map((d) => `\`${d}\``).join(', ') || 'None measured'}
- **Motion Easings**: ${ontology.interactions.motionEasings.map((e) => `\`${e}\``).join(', ') || 'None measured'}

## 6. Component Ontology

${componentSections.length > 0 ? componentSections.join('\n\n') : 'No interactive or repeating component archetypes detected.'}

## 7. Reproduction Rules & Verification Checklist

### DO
- Use the CSS variables in \`tokens.css\` or the Tailwind tokens in \`tailwind.theme.css\` instead of hardcoded hex literals.
- Preserve the measured \`${ontology.designGrammar.baseGridUnit}\` spacing cadence and \`${ontology.designGrammar.surfaceModel}\` surface treatment.
- Support both light and dark modes via \`prefers-color-scheme: dark\` / \`.dark\` overrides when present in \`tokens.css\`.

### DON'T
- Do not replace measured font families or type ramp ratios with generic defaults.
- Do not introduce unmeasured shadows or arbitrary border radii outside the extracted scale.
- Do not skip heading levels (${ontology.invariants.headingHierarchy.valid ? 'referent heading order is valid' : `referent issues: ${ontology.invariants.headingHierarchy.issues.join('; ')}`}).

### Verification Checklist
- [ ] All text/surface pairs meet WCAG AA (>= 4.5:1 normal, >= 3.0:1 large).
- [ ] Interactive controls expose visible \`:hover\` and \`:focus-visible\` states.
- [ ] Mobile interactive touch targets are at least \`44×44px\` (measured under-44px targets on referent: ${ontology.invariants.mobileTouchTargets.under44pxCount}/${ontology.invariants.mobileTouchTargets.totalChecked}).
`;
}

function main() {
  const { capturePath, outDir } = parseArgs(process.argv.slice(2));
  const capture = JSON.parse(fs.readFileSync(capturePath, 'utf8'));
  const stateKeys = Object.keys(capture.states || {});
  if (stateKeys.length === 0) {
    throw new Error('capture.json contains no captured states.');
  }

  const lightStateName =
    stateKeys.find((k) => k === 'desktop-light') ||
    stateKeys.find((k) => capture.states[k].mode === 'light') ||
    capture.primaryState ||
    stateKeys[0];
  const darkStateName =
    stateKeys.find((k) => k === 'desktop-dark') ||
    stateKeys.find((k) => capture.states[k].mode === 'dark') ||
    null;
  const mobileStateName =
    stateKeys.find((k) => k.startsWith('mobile')) ||
    stateKeys.find((k) => (capture.states[k].viewport?.width || 9999) <= 500) ||
    null;

  fs.mkdirSync(outDir, { recursive: true });

  const compiled = buildTokens(capture, lightStateName, darkStateName);
  const tokensCss = buildTokensCss(compiled.dtcg, capture, lightStateName);
  const tailwindThemeCss = buildTailwindThemeCss(compiled.dtcg);
  const tailwindConfigMjs = buildTailwindConfigMjs(compiled.dtcg);
  const ontology = buildOntology(capture, lightStateName, darkStateName, mobileStateName, compiled);
  const ontologyYaml = `${toYaml(ontology)}\n`;
  const designMd = buildDesignMd(capture, compiled.dtcg, ontology, compiled);

  fs.writeFileSync(path.join(outDir, 'tokens.dtcg.json'), JSON.stringify(compiled.dtcg, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outDir, 'tokens.css'), tokensCss, 'utf8');
  fs.writeFileSync(path.join(outDir, 'tailwind.theme.css'), tailwindThemeCss, 'utf8');
  fs.writeFileSync(path.join(outDir, 'tailwind.config.mjs'), tailwindConfigMjs, 'utf8');
  fs.writeFileSync(path.join(outDir, 'ui-ontology.json'), JSON.stringify(ontology, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(outDir, 'ui-ontology.yaml'), ontologyYaml, 'utf8');
  fs.writeFileSync(path.join(outDir, 'DESIGN.md'), designMd, 'utf8');

  console.log(`[compile] Generated 7 artifacts in ${outDir}`);
}

try {
  main();
} catch (err) {
  console.error(`[compile] ERROR: ${err.message}`);
  process.exit(1);
}

#!/usr/bin/env node
/**
 * Strict validator for generated referent extraction artifacts.
 * Zero external npm dependencies.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const VALID_DTCG_TYPES = new Set([
  'color',
  'dimension',
  'fontFamily',
  'fontWeight',
  'duration',
  'cubicBezier',
  'number',
  'strokeStyle',
  'border',
  'transition',
  'shadow',
  'gradient',
  'typography',
  'string',
]);

function checkBalancedBraces(content) {
  let depth = 0;
  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth < 0) return false;
    }
  }
  return depth === 0;
}

function validateDtcg(dtcgPath) {
  const errors = [];
  if (!fs.existsSync(dtcgPath)) return ['Missing tokens.dtcg.json'];

  const raw = fs.readFileSync(dtcgPath, 'utf8');
  if (/\b(NaN|undefined|\[object Object\])\b/.test(raw)) {
    errors.push('tokens.dtcg.json contains invalid literal (NaN/undefined/[object Object])');
  }

  let root;
  try {
    root = JSON.parse(raw);
  } catch (e) {
    return [`tokens.dtcg.json invalid JSON: ${e.message}`];
  }

  const leafMap = new Map();

  function walk(node, pathParts, inheritedType) {
    if (!node || typeof node !== 'object' || Array.isArray(node)) return;
    const currentType = node.$type || inheritedType;

    if (Object.prototype.hasOwnProperty.call(node, '$value')) {
      const fullPath = pathParts.join('.');
      if (!currentType) {
        errors.push(`Token "${fullPath}" has no direct or inherited $type`);
      } else if (!VALID_DTCG_TYPES.has(currentType)) {
        errors.push(`Token "${fullPath}" has unsupported $type "${currentType}"`);
      }
      leafMap.set(fullPath, node.$value);
      return;
    }

    for (const [k, v] of Object.entries(node)) {
      if (k.startsWith('$')) continue;
      walk(v, [...pathParts, k], currentType);
    }
  }

  walk(root, [], null);

  if (leafMap.size === 0) {
    errors.push('tokens.dtcg.json contains zero token leaves');
  }

  function extractAliases(val, out = []) {
    if (typeof val === 'string') {
      const m = val.match(/^\{([^}]+)\}$/);
      if (m) out.push(m[1]);
    } else if (Array.isArray(val)) {
      for (const item of val) extractAliases(item, out);
    } else if (val && typeof val === 'object') {
      for (const v of Object.values(val)) extractAliases(v, out);
    }
    return out;
  }

  for (const [tokenPath, val] of leafMap.entries()) {
    const aliases = extractAliases(val);
    for (const target of aliases) {
      if (!leafMap.has(target)) {
        errors.push(`Broken alias in "${tokenPath}": "{${target}}" does not resolve to a leaf token`);
        continue;
      }
      // Cycle check
      const visited = new Set([tokenPath]);
      let curTarget = target;
      for (let step = 0; step < 16; step++) {
        if (visited.has(curTarget)) {
          errors.push(`Circular alias detected starting at "${tokenPath}"`);
          break;
        }
        visited.add(curTarget);
        const nextVal = leafMap.get(curTarget);
        const nextAliases = extractAliases(nextVal);
        if (nextAliases.length === 0) break;
        curTarget = nextAliases[0];
        if (!leafMap.has(curTarget)) break;
      }
    }
  }

  return errors;
}

function validateTokensCss(cssPath) {
  const errors = [];
  if (!fs.existsSync(cssPath)) return ['Missing tokens.css'];
  const raw = fs.readFileSync(cssPath, 'utf8');
  if (!checkBalancedBraces(raw)) errors.push('tokens.css has unbalanced braces');
  if (!/--[a-z0-9-]+\s*:/.test(raw)) errors.push('tokens.css contains no CSS custom properties');
  if (/\b(NaN|undefined|\[object Object\])\b/.test(raw)) {
    errors.push('tokens.css contains invalid literal (NaN/undefined/[object Object])');
  }
  return errors;
}

function validateTailwindThemeCss(twCssPath) {
  const errors = [];
  if (!fs.existsSync(twCssPath)) return ['Missing tailwind.theme.css'];
  const raw = fs.readFileSync(twCssPath, 'utf8');
  if (!/@theme\s*\{/.test(raw)) errors.push('tailwind.theme.css missing @theme { block');
  if (!checkBalancedBraces(raw)) errors.push('tailwind.theme.css has unbalanced braces');
  if (/\b(NaN|undefined|\[object Object\])\b/.test(raw)) {
    errors.push('tailwind.theme.css contains invalid literal (NaN/undefined/[object Object])');
  }
  return errors;
}

async function validateTailwindConfigMjs(mjsPath) {
  const errors = [];
  if (!fs.existsSync(mjsPath)) return ['Missing tailwind.config.mjs'];
  const check = spawnSync(process.execPath, ['--check', mjsPath], { encoding: 'utf8' });
  if (check.status !== 0) {
    errors.push(`tailwind.config.mjs syntax error: ${(check.stderr || '').trim()}`);
    return errors;
  }
  try {
    const mod = await import(`${pathToFileURL(mjsPath).href}?t=${Date.now()}`);
    if (!mod?.default?.theme?.extend || typeof mod.default.theme.extend !== 'object') {
      errors.push('tailwind.config.mjs default export missing theme.extend object');
    }
  } catch (e) {
    errors.push(`tailwind.config.mjs import failed: ${e.message}`);
  }
  return errors;
}

function validateOntologyJson(jsonPath) {
  const errors = [];
  if (!fs.existsSync(jsonPath)) return ['Missing ui-ontology.json'];
  let obj;
  try {
    obj = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    return [`ui-ontology.json invalid JSON: ${e.message}`];
  }
  const requiredTop = [
    'meta',
    'designGrammar',
    'regions',
    'surfaces',
    'components',
    'interactions',
    'invariants',
  ];
  for (const key of requiredTop) {
    if (!(key in obj)) errors.push(`ui-ontology.json missing top-level key "${key}"`);
  }
  if (Array.isArray(obj.components)) {
    for (const [idx, comp] of obj.components.entries()) {
      for (const req of ['id', 'archetype', 'anatomy', 'states']) {
        if (!(req in comp)) {
          errors.push(`ui-ontology.json components[${idx}] missing "${req}"`);
        }
      }
    }
  } else {
    errors.push('ui-ontology.json "components" must be an array');
  }
  return errors;
}

function validateOntologyYaml(yamlPath) {
  const errors = [];
  if (!fs.existsSync(yamlPath)) return ['Missing ui-ontology.yaml'];
  const raw = fs.readFileSync(yamlPath, 'utf8').trim();
  if (!raw) return ['ui-ontology.yaml is empty'];
  for (const key of [
    'meta:',
    'designGrammar:',
    'regions:',
    'surfaces:',
    'components:',
    'interactions:',
    'invariants:',
  ]) {
    if (!raw.includes(key)) errors.push(`ui-ontology.yaml missing "${key}"`);
  }
  return errors;
}

function validateDesignMd(mdPath) {
  const errors = [];
  if (!fs.existsSync(mdPath)) return ['Missing DESIGN.md'];
  const raw = fs.readFileSync(mdPath, 'utf8').trim();
  if (!raw) return ['DESIGN.md is empty'];
  if (/\{\{[^}]+\}\}/.test(raw)) errors.push('DESIGN.md contains unresolved {{...}} placeholders');
  for (const heading of ['Color', 'Typography', 'Layout', 'Component', 'Rules']) {
    if (!new RegExp(`^#{1,3} .*${heading}`, 'mi').test(raw)) {
      errors.push(`DESIGN.md missing required section containing "${heading}"`);
    }
  }
  return errors;
}

async function main() {
  const targetDir = process.argv[2];
  if (!targetDir || targetDir === '-h' || targetDir === '--help') {
    console.log('Usage: validate-artifacts.mjs <out-dir>');
    process.exit(targetDir ? 0 : 1);
  }
  const outDir = path.resolve(process.cwd(), targetDir);
  const checks = [
    ['tokens.dtcg.json', validateDtcg(path.join(outDir, 'tokens.dtcg.json'))],
    ['tokens.css', validateTokensCss(path.join(outDir, 'tokens.css'))],
    ['tailwind.theme.css', validateTailwindThemeCss(path.join(outDir, 'tailwind.theme.css'))],
    ['tailwind.config.mjs', await validateTailwindConfigMjs(path.join(outDir, 'tailwind.config.mjs'))],
    ['ui-ontology.json', validateOntologyJson(path.join(outDir, 'ui-ontology.json'))],
    ['ui-ontology.yaml', validateOntologyYaml(path.join(outDir, 'ui-ontology.yaml'))],
    ['DESIGN.md', validateDesignMd(path.join(outDir, 'DESIGN.md'))],
  ];

  let totalErrors = 0;
  console.log(`\n[validate] Artifact Validation Report (${outDir})`);
  for (const [name, errs] of checks) {
    if (errs.length === 0) {
      console.log(`  PASS  ${name}`);
    } else {
      totalErrors += errs.length;
      console.log(`  FAIL  ${name}`);
      for (const e of errs) console.log(`        - ${e}`);
    }
  }
  console.log('');
  if (totalErrors > 0) {
    console.error(`[validate] Failed with ${totalErrors} error(s).`);
    process.exit(1);
  }
  console.log('[validate] All 7 artifacts passed.');
}

main().catch((err) => {
  console.error(`[validate] ERROR: ${err.message}`);
  process.exit(1);
});

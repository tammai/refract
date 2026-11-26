#!/usr/bin/env node
/**
 * Deterministic multi-viewport, light/dark capture orchestrator using playwright-cli.
 * Zero external npm dependencies.
 */

import { spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROBE_FUNCTION_SOURCE } from './browser-probe.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function printHelp() {
  console.log(`Usage: capture-referent.mjs <url> [options]

Options:
  --out <dir>            Output directory (default: ./referent-extract/<host>-<timestamp>)
  --viewports <list>     Comma-separated viewports (default: desktop:1440x900,mobile:390x844)
  --modes <list>         Comma-separated color schemes (default: light,dark)
  --all-matrix           Capture every viewport x mode combination
  --wait <ms>            Extra settle wait after load/resize/mode switch (default: 1000)
  --no-screenshots       Skip capturing PNG screenshots
  --no-hover-probe       Skip interactive :hover / :focus-visible style probing
  --compile              Run compile-artifacts.mjs and validate-artifacts.mjs automatically
  -h, --help             Show this help message
`);
}

function parseArgs(argv) {
  const args = {
    url: null,
    out: null,
    viewports: [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'mobile', width: 390, height: 844 },
    ],
    modes: ['light', 'dark'],
    allMatrix: false,
    wait: 1000,
    screenshots: true,
    hoverProbe: true,
    compile: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      printHelp();
      process.exit(0);
    } else if (a === '--out') {
      args.out = argv[++i];
    } else if (a === '--viewports') {
      const raw = argv[++i] || '';
      args.viewports = raw
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .map((item, idx) => {
          const hasLabel = item.includes(':');
          const [labelPart, sizePart] = hasLabel ? item.split(':') : [`vp${idx + 1}`, item];
          const [wStr, hStr] = (sizePart || '').toLowerCase().split('x');
          const width = parseInt(wStr, 10);
          const height = parseInt(hStr, 10);
          if (!width || !height) {
            throw new Error(`Invalid viewport "${item}". Expected format [name:]WxH.`);
          }
          return { name: labelPart.trim(), width, height };
        });
    } else if (a === '--modes') {
      args.modes = (argv[++i] || '')
        .split(',')
        .map((m) => m.trim().toLowerCase())
        .filter((m) => m === 'light' || m === 'dark');
      if (args.modes.length === 0) {
        throw new Error('Invalid --modes value. Supported modes: light, dark.');
      }
    } else if (a === '--all-matrix') {
      args.allMatrix = true;
    } else if (a === '--wait') {
      args.wait = Math.max(0, parseInt(argv[++i], 10) || 1000);
    } else if (a === '--no-screenshots') {
      args.screenshots = false;
    } else if (a === '--no-hover-probe') {
      args.hoverProbe = false;
    } else if (a === '--compile') {
      args.compile = true;
    } else if (!a.startsWith('-') && !args.url) {
      args.url = a;
    } else {
      throw new Error(`Unknown argument: ${a}`);
    }
  }

  if (!args.url) {
    throw new Error('Missing required <url> argument. Run with --help for usage.');
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(args.url);
  } catch {
    throw new Error(`Invalid URL: ${args.url}`);
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error(`Unsupported URL protocol "${parsedUrl.protocol}". Use http:// or https://.`);
  }

  if (!args.out) {
    const hostSlug = parsedUrl.hostname.replace(/[^a-z0-9.-]/gi, '-').toLowerCase();
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    args.out = path.resolve(process.cwd(), 'referent-extract', `${hostSlug}-${stamp}`);
  } else {
    args.out = path.resolve(process.cwd(), args.out);
  }

  return args;
}

function buildAugmentedEnv() {
  const nodeBinDir = path.dirname(process.execPath);
  const existingPath = process.env.PATH || '';
  const extraDirs = [nodeBinDir, '/opt/homebrew/bin', '/usr/local/bin'];
  const merged = [...new Set([...extraDirs, ...existingPath.split(':').filter(Boolean)])].join(':');
  return { ...process.env, PATH: merged };
}

function resolvePlaywrightCli(env) {
  if (process.env.PLAYWRIGHT_CLI_BIN && fs.existsSync(process.env.PLAYWRIGHT_CLI_BIN)) {
    return process.env.PLAYWRIGHT_CLI_BIN;
  }
  const sibling = path.join(path.dirname(process.execPath), 'playwright-cli');
  if (fs.existsSync(sibling)) return sibling;

  const which = spawnSync('which', ['playwright-cli'], { env, encoding: 'utf8' });
  if (which.status === 0 && which.stdout.trim()) {
    return which.stdout.trim();
  }
  throw new Error(
    'playwright-cli binary not found. Install playwright-cli or set PLAYWRIGHT_CLI_BIN.'
  );
}

function runPw(bin, env, session, args, { allowFail = false, cwd } = {}) {
  const fullArgs = [`-s=${session}`, ...args];
  const res = spawnSync(bin, fullArgs, {
    env,
    cwd: cwd || process.cwd(),
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (res.status !== 0 && !allowFail) {
    const details = (res.stderr || res.stdout || '').trim();
    throw new Error(`playwright-cli ${args.join(' ')} failed (exit ${res.status}): ${details}`);
  }
  return res;
}

function extractJsonFromRawStdout(stdout) {
  const trimmed = (stdout || '').trim();
  if (!trimmed) {
    throw new Error('playwright-cli run-code returned empty stdout.');
  }
  const candidates = [trimmed];
  const lines = trimmed.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('{') || line.startsWith('"')) {
      candidates.push(lines.slice(i).join('\n').trim());
    }
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }

  for (const cand of candidates) {
    try {
      let parsed = JSON.parse(cand);
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      if (parsed && typeof parsed === 'object' && parsed.meta) {
        return parsed;
      }
    } catch {
      // try next candidate
    }
  }
  throw new Error(
    `Failed to parse JSON probe payload from playwright-cli stdout (preview: ${trimmed.slice(0, 250)})`
  );
}

function buildStateMatrix(viewports, modes, allMatrix) {
  if (allMatrix || viewports.length === 1 || modes.length === 1) {
    const out = [];
    for (const vp of viewports) {
      for (const mode of modes) {
        out.push({ name: `${vp.name}-${mode}`, viewport: vp, mode });
      }
    }
    return out;
  }
  const primaryVp = viewports[0];
  const primaryMode = modes[0];
  const out = [];
  for (const mode of modes) {
    out.push({ name: `${primaryVp.name}-${mode}`, viewport: primaryVp, mode });
  }
  for (let i = 1; i < viewports.length; i++) {
    out.push({ name: `${viewports[i].name}-${primaryMode}`, viewport: viewports[i], mode: primaryMode });
  }
  return out;
}

function buildRunCodeScript({ waitMs, runHoverProbe }) {
  return `async (page) => {
  await page.evaluate(async (ms) => {
    try { await document.fonts.ready; } catch {}
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
  }, ${Math.round(waitMs)});

  const probeResult = await page.evaluate((fnSrc) => {
    const fn = eval('(' + fnSrc + ')');
    return fn();
  }, ${JSON.stringify(PROBE_FUNCTION_SOURCE)});

  const interactionProbes = [];
  if (${runHoverProbe ? 'true' : 'false'} && probeResult?.ontologyRaw?.probeTargets) {
    const styleProps = [
      'backgroundColor',
      'color',
      'borderColor',
      'boxShadow',
      'outlineStyle',
      'outlineWidth',
      'outlineColor',
      'transform',
      'opacity',
      'textDecorationLine'
    ];
    for (const target of probeResult.ontologyRaw.probeTargets.slice(0, 6)) {
      try {
        const loc = page.locator(target.selector).first();
        const count = await loc.count();
        if (!count) continue;
        const readStyles = async () => {
          return await loc.evaluate((el, props) => {
            const cs = getComputedStyle(el);
            const out = {};
            for (const p of props) out[p] = cs[p];
            return out;
          }, styleProps);
        };
        const base = await readStyles();
        let hoverStyle = null;
        const hoverDelta = {};
        try {
          await loc.hover({ timeout: 1500 });
          await page.waitForTimeout(180);
          hoverStyle = await readStyles();
          for (const p of styleProps) {
            if (hoverStyle[p] !== base[p]) hoverDelta[p] = { from: base[p], to: hoverStyle[p] };
          }
        } catch {}

        let focusStyle = null;
        const focusDelta = {};
        try {
          await loc.focus({ timeout: 1500 });
          await page.waitForTimeout(120);
          focusStyle = await readStyles();
          for (const p of styleProps) {
            if (focusStyle[p] !== base[p]) focusDelta[p] = { from: base[p], to: focusStyle[p] };
          }
        } catch {}

        await page.evaluate(() => {
          if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
        });

        interactionProbes.push({
          selector: target.selector,
          tag: target.tag,
          text: target.text,
          default: base,
          hover: hoverStyle,
          hoverDelta,
          focus: focusStyle,
          focusDelta,
        });
      } catch {
        // ignore ephemeral elements
      }
    }
  }

  probeResult.interactionProbes = interactionProbes;
  return JSON.stringify(probeResult);
}`;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const env = buildAugmentedEnv();
  const pwBin = resolvePlaywrightCli(env);
  const rawDir = path.join(opts.out, 'raw');
  fs.mkdirSync(rawDir, { recursive: true });

  const session = `ure-${crypto.randomBytes(3).toString('hex')}`;
  const states = buildStateMatrix(opts.viewports, opts.modes, opts.allMatrix);
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ure-run-'));
  const captureBundle = {
    schemaVersion: '1.0.0',
    capturedAt: new Date().toISOString(),
    url: opts.url,
    primaryState: states[0].name,
    states: {},
  };

  try {
    console.log(`[capture] Opening ${opts.url} (session ${session})...`);
    runPw(pwBin, env, session, ['open', opts.url], { cwd: rawDir });

    for (let i = 0; i < states.length; i++) {
      const st = states[i];
      console.log(
        `[capture] State "${st.name}" (${st.viewport.width}x${st.viewport.height}, ${st.mode})...`
      );
      runPw(pwBin, env, session, [
        'resize',
        String(st.viewport.width),
        String(st.viewport.height),
      ], { cwd: rawDir });
      runPw(pwBin, env, session, ['set-color-scheme', st.mode], { cwd: rawDir });

      const scriptPath = path.join(tmpDir, `probe-${st.name}.js`);
      const runHover = opts.hoverProbe && i === 0;
      fs.writeFileSync(
        scriptPath,
        buildRunCodeScript({ waitMs: opts.wait, runHoverProbe: runHover }),
        'utf8'
      );

      const res = runPw(pwBin, env, session, ['--raw', 'run-code', `--filename=${scriptPath}`], {
        cwd: rawDir,
      });
      const probeData = extractJsonFromRawStdout(res.stdout);

      const snapshotPath = path.join(rawDir, `${st.name}.snapshot.yaml`);
      runPw(pwBin, env, session, ['snapshot', '--boxes', `--filename=${snapshotPath}`], {
        cwd: rawDir,
      });

      let screenshotRel = null;
      if (opts.screenshots) {
        const pngPath = path.join(rawDir, `${st.name}.png`);
        runPw(pwBin, env, session, ['screenshot', `--filename=${pngPath}`], { cwd: rawDir });
        screenshotRel = `raw/${st.name}.png`;
      }

      captureBundle.states[st.name] = {
        viewport: st.viewport,
        mode: st.mode,
        screenshot: screenshotRel,
        snapshot: `raw/${st.name}.snapshot.yaml`,
        ...probeData,
      };
    }
  } finally {
    runPw(pwBin, env, session, ['close'], { allowFail: true, cwd: rawDir });
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }

  const capturePath = path.join(rawDir, 'capture.json');
  fs.writeFileSync(capturePath, JSON.stringify(captureBundle, null, 2), 'utf8');
  console.log(`[capture] Saved raw capture to ${capturePath}`);

  if (opts.compile) {
    const compileScript = path.join(__dirname, 'compile-artifacts.mjs');
    const validateScript = path.join(__dirname, 'validate-artifacts.mjs');

    const comp = spawnSync(
      process.execPath,
      [compileScript, capturePath, '--out', opts.out],
      { env, stdio: 'inherit' }
    );
    if (comp.status !== 0) {
      throw new Error(`compile-artifacts.mjs failed with exit code ${comp.status}`);
    }

    const val = spawnSync(process.execPath, [validateScript, opts.out], {
      env,
      stdio: 'inherit',
    });
    if (val.status !== 0) {
      throw new Error(`validate-artifacts.mjs failed with exit code ${val.status}`);
    }
  }
}

main().catch((err) => {
  console.error(`[capture] ERROR: ${err.message}`);
  process.exit(1);
});

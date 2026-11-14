import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = process.env.CAPTURE_DIR ? resolve(process.env.CAPTURE_DIR) : join(root, 'captures');
mkdirSync(outDir, { recursive: true });

const base = process.argv[2] || 'http://127.0.0.1:5173/experiments/glsl3/inversion-monolith/';
const port = 9333;
const chromeBin = process.env.CHROME_BIN || 'google-chrome';
const chromeProfile = join(tmpdir(), `chrome-inversion-monolith-${process.pid}`);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const chrome = spawn(chromeBin, [
  '--headless=new',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--remote-debugging-port=' + port,
  `--user-data-dir=${chromeProfile}`,
  '--window-size=1440,1100',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  'about:blank',
], { stdio: 'ignore' });

let ws;
let seq = 0;
const pending = new Map();

function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
  });
}

async function waitReady() {
  for (let i = 0; i < 80; i += 1) {
    const evaled = await send('Runtime.evaluate', {
      expression: 'document.body && document.body.dataset.ready === "1"',
      returnByValue: true,
    });
    if (evaled.result?.value === true) return;
    await sleep(100);
  }
  throw new Error('page did not become ready');
}

async function evalJson(expression) {
  const evaled = await send('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true,
  });
  if (evaled.exceptionDetails) {
    const details = evaled.exceptionDetails;
    throw new Error(details.exception?.description || details.text || JSON.stringify(details));
  }
  return evaled.result?.value;
}

async function open(url) {
  await send('Page.navigate', { url });
  await waitReady();
  await sleep(80);
}

async function shot(name) {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  const file = join(outDir, `${name}.png`);
  writeFileSync(file, Buffer.from(data, 'base64'));
  return file;
}

async function main() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
      if (list[0]?.webSocketDebuggerUrl) {
        ws = new WebSocket(list[0].webSocketDebuggerUrl);
        break;
      }
    } catch {
      // Chrome is still starting.
    }
    await sleep(100);
  }
  if (!ws) throw new Error('chrome debugging port did not open');
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    }
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  const shots = ['initial', 'hybrid', 'mid', 'aligned'];
  const pages = {};
  for (const name of shots) {
    await open(`${base}?shot=${name}&readback=1`);
    const sample = await evalJson(`(() => {
      const canvas = document.querySelector('#stage');
      const gl = window.__GL__;
      if (!gl) return { error: 'no gl', notice: document.querySelector('#notice').textContent, status: document.querySelector('#status').textContent, mode: window.__STUDY__.mode() };
      const center = new Uint8Array(4);
      const corner = new Uint8Array(4);
      gl.readPixels(640, 360, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, center);
      gl.readPixels(8, 8, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, corner);
      return {
        center: Array.from(center),
        corner: Array.from(corner),
        notice: document.querySelector('#notice').textContent,
        status: document.querySelector('#status').textContent,
        hash: window.__STUDY__.hash(),
        aligned: window.__STUDY__.aligned(),
        k: window.__STUDY__.getState().k,
        cut: window.__STUDY__.getState().cut,
        info: window.__STUDY__.info(),
        mode: window.__STUDY__.mode(),
      };
    })()`);
    pages[name] = { ...sample, file: await shot(name) };
  }

  await open(`${base}?readback=1`);
  const controlsAtBoot = await evalJson(`(() => {
    const stage = document.querySelector('#stage');
    const fallback = document.querySelector('#fallback');
    const light = document.querySelector('#light');
    const scrub = document.querySelector('#scrub');
    return {
      lightConnected: light.isConnected,
      scrubConnected: scrub.isConnected,
      stageVisible: !stage.hasAttribute('hidden') && stage.getClientRects().length > 0,
      fallbackHidden: fallback.hasAttribute('hidden') && fallback.getClientRects().length === 0,
    };
  })()`);
  const before = await evalJson('window.__STUDY__.hash()');
  const box = await evalJson(`(() => {
    const r = document.querySelector('#phase-inc').getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(40);
  const afterClick = await evalJson(`({ hash: window.__STUDY__.hash(), notice: document.querySelector('#notice').textContent, k: window.__STUDY__.getState().k })`);
  const stage = await evalJson(`(() => {
    const r = document.querySelector('#stage').getBoundingClientRect();
    return { x: r.x + 40, y: r.y + 40 };
  })()`);
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: stage.x, y: stage.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: stage.x, y: stage.y, button: 'left', clickCount: 1 });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, nativeVirtualKeyCode: 39 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39, nativeVirtualKeyCode: 39 });
  await sleep(40);
  const afterKey = await evalJson(`({ hash: window.__STUDY__.hash(), notice: document.querySelector('#notice').textContent, k: window.__STUDY__.getState().k })`);

  const controlInputs = await evalJson(`(() => {
    const light = document.querySelector('#light');
    light.value = '17';
    light.dispatchEvent(new Event('input', { bubbles: true }));
    const scrub = document.querySelector('#scrub');
    scrub.value = '120';
    scrub.dispatchEvent(new Event('input', { bubbles: true }));
    return {
      lightConnected: light.isConnected,
      scrubConnected: scrub.isConnected,
      lightDeg: window.__STUDY__.getState().lightDeg,
      tick: window.__STUDY__.getState().tick,
      lightText: document.querySelector('#light-value').textContent,
      tickText: document.querySelector('#tick-value').textContent,
    };
  })()`);

  const canceledRangeGesture = await evalJson(`(() => {
    const light = document.querySelector('#light');
    const historyBefore = window.__STUDY__.getState().history.length;
    light.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    light.value = '23';
    light.dispatchEvent(new Event('input', { bubbles: true }));
    light.dispatchEvent(new Event('pointercancel', { bubbles: true }));
    const afterCancel = window.__STUDY__.getState();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'BracketRight', bubbles: true }));
    const afterKeyboard = window.__STUDY__.getState();
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', bubbles: true }));
    const afterUndo = window.__STUDY__.getState();
    return {
      historyBefore,
      canceledValue: afterCancel.lightDeg,
      canceledGesture: afterCancel.gesture,
      historyAfterCancel: afterCancel.history.length,
      keyboardValue: afterKeyboard.lightDeg,
      historyAfterKeyboard: afterKeyboard.history.length,
      undoValue: afterUndo.lightDeg,
      undoGesture: afterUndo.gesture,
      historyAfterUndo: afterUndo.history.length,
    };
  })()`);

  const seedDraft = await evalJson(`(() => {
    const seed = document.querySelector('#seed');
    seed.focus();
    seed.value = '4242';
    window.__STUDY__.dispatch({ type: 'advance', ticks: 1 });
    const preserved = seed.value;
    seed.blur();
    document.querySelector('#preset-puzzle').click();
    const committed = window.__STUDY__.getState().seed;
    document.querySelector('#preset-mass').click();
    return { preserved, committed, synchronized: seed.value };
  })()`);

  await evalJson(`window.__STUDY__.dispatch({ type: 'pause', value: 1 })`);
  const pausedHash = await evalJson('window.__STUDY__.hash()');
  const loss = await evalJson(`(async () => {
    const gl = window.__GL__;
    const ext = gl && gl.getExtension('WEBGL_lose_context');
    if (!ext) return { available: false, losses: [], restores: [] };
    const losses = [];
    const restores = [];
    for (let i = 0; i < 5; i += 1) {
      ext.loseContext();
      await new Promise((r) => setTimeout(r, 50));
      losses.push({
        hash: window.__STUDY__.hash(),
        mode: window.__STUDY__.mode(),
        stageHidden: document.querySelector('#stage').hasAttribute('hidden'),
        fallbackHidden: document.querySelector('#fallback').hasAttribute('hidden'),
        fallbackRects: document.querySelector('#fallback').getClientRects().length,
      });
      ext.restoreContext();
      await new Promise((r) => setTimeout(r, 80));
      restores.push({ hash: window.__STUDY__.hash(), mode: window.__STUDY__.mode() });
    }
    return { available: true, losses, restores };
  })()`);
  loss.pausedHash = pausedHash;

  await send('Network.setCacheDisabled', { cacheDisabled: true });
  await send('Network.setBlockedURLs', { urls: ['*monolith.frag*'] });
  await open(`${base}?forced-shader-failure=1`);
  const shaderFailure = await evalJson(`(async () => {
    const stage = document.querySelector('#stage');
    const fallback = document.querySelector('#fallback');
    const before = {
      mode: window.__STUDY__.mode(),
      notice: document.querySelector('#notice').textContent,
      tick: window.__STUDY__.getState().tick,
      fallbackMarkup: fallback.innerHTML,
      stageHidden: stage.hasAttribute('hidden'),
      fallbackVisible: !fallback.hasAttribute('hidden') && fallback.getClientRects().length > 0,
    };
    document.querySelector('#phase-inc').click();
    await new Promise((resolve) => setTimeout(resolve, 1400));
    const state = window.__STUDY__.getState();
    return {
      before,
      after: {
        mode: window.__STUDY__.mode(),
        notice: document.querySelector('#notice').textContent,
        tick: state.tick,
        k: state.k,
        planOpen: Boolean(state.plan),
        fallbackMarkup: fallback.innerHTML,
      },
    };
  })()`);
  shaderFailure.file = await shot('shader-failure');
  await send('Network.setBlockedURLs', { urls: [] });
  await send('Network.setCacheDisabled', { cacheDisabled: false });

  const browserFailures = [];
  const requireCheck = (condition, label) => {
    if (!condition) browserFailures.push(label);
  };
  requireCheck(controlsAtBoot.lightConnected && controlsAtBoot.scrubConnected,
    'range inputs remain connected after initial paint');
  requireCheck(controlsAtBoot.stageVisible && controlsAtBoot.fallbackHidden,
    'inactive fallback has no layout box in WebGL mode');
  requireCheck(afterClick.k === 1 && afterKey.k === 2,
    'real pointer and keyboard inputs advance one detent each');
  requireCheck(controlInputs.lightDeg === 17 && controlInputs.lightText === 'Light 17°',
    'light range updates canonical state and visible label');
  requireCheck(controlInputs.tick === 120 && controlInputs.tickText === 'Tick 120',
    'scrub range updates canonical state and visible label');
  requireCheck(canceledRangeGesture.canceledValue === 23
    && canceledRangeGesture.canceledGesture === 0
    && canceledRangeGesture.historyAfterCancel === canceledRangeGesture.historyBefore + 1
    && canceledRangeGesture.keyboardValue === 24
    && canceledRangeGesture.historyAfterKeyboard === canceledRangeGesture.historyAfterCancel + 1
    && canceledRangeGesture.undoValue === 23
    && canceledRangeGesture.undoGesture === 0
    && canceledRangeGesture.historyAfterUndo === canceledRangeGesture.historyAfterCancel,
  'canceled range gesture closes before an independently undoable keyboard edit');
  requireCheck(seedDraft.preserved === '4242' && seedDraft.committed === 4242
    && seedDraft.synchronized === '1001',
  'focused seed draft survives repaint, commits, then resynchronizes');
  requireCheck(shaderFailure.before.mode === 'fallback'
    && shaderFailure.before.stageHidden && shaderFailure.before.fallbackVisible
    && shaderFailure.before.notice.length > 0,
  'forced shader failure reaches visible diagnostic fallback mode');
  requireCheck(shaderFailure.after.mode === 'fallback' && shaderFailure.after.k === 1
    && shaderFailure.after.tick > shaderFailure.before.tick && !shaderFailure.after.planOpen
    && shaderFailure.after.fallbackMarkup !== shaderFailure.before.fallbackMarkup,
  'shader-failure fallback clock advances and repaints a real phase action');

  const report = {
    pages,
    input: { before, afterClick, afterKey, controlsAtBoot, controlInputs, canceledRangeGesture, seedDraft },
    shaderFailure,
    contextLoss: loss,
    contextLossStable: Boolean(loss?.available)
      && loss.losses.every((item) => item.hash === loss.pausedHash)
      && loss.restores.every((item) => item.hash === loss.pausedHash),
    contextLossFallbackVisible: Boolean(loss?.available)
      && loss.losses.every((item) => item.mode === 'fallback'
        && item.stageHidden && !item.fallbackHidden && item.fallbackRects > 0),
    contextRestoreWebgl: Boolean(loss?.available)
      && loss.restores.every((item) => item.mode === 'webgl'),
    failures: browserFailures,
  };
  requireCheck(report.contextLossStable, 'context loss and restoration preserve canonical state');
  requireCheck(report.contextLossFallbackVisible, 'context loss shows only the static fallback');
  requireCheck(report.contextRestoreWebgl, 'context restoration returns to WebGL mode');
  report.pass = browserFailures.length === 0;
  writeFileSync(join(outDir, 'browser-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({
    mode: pages.initial.mode,
    status: pages.initial.status,
    center: pages.initial.center,
    corner: pages.initial.corner,
    aligned: pages.aligned.aligned,
    alignedNotice: pages.aligned.notice,
    afterClick,
    afterKey,
    controlsAtBoot,
    controlInputs,
    canceledRangeGesture,
    seedDraft,
    shaderFailure,
    contextLossStable: report.contextLossStable,
    contextLossFallbackVisible: report.contextLossFallbackVisible,
    contextRestoreWebgl: report.contextRestoreWebgl,
    failures: report.failures,
  }, null, 2));
  if (!report.pass) throw new Error(`browser checks failed: ${report.failures.join('; ')}`);
  await send('Emulation.setDeviceMetricsOverride', {
    width: 320,
    height: 568,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await open(`${base}?shot=initial&readback=1`);
  await shot('layout-320');
  await send('Emulation.clearDeviceMetricsOverride');

  await open(`${base}?shot=initial&readback=1`);
  for (let i = 0; i < 9; i += 1) {
    const clip = await evalJson(`(() => {
      const r = document.querySelector('#stage').getBoundingClientRect();
      return { x: r.x, y: r.y, width: Math.max(1, r.width), height: Math.max(1, r.height), scale: 1 };
    })()`);
    const frame = await send('Page.captureScreenshot', { format: 'png', clip });
    writeFileSync(join(outDir, `morph-${String(i).padStart(2, '0')}.png`), Buffer.from(frame.data, 'base64'));
    await evalJson(`window.__STUDY__.dispatch({ type: 'reduced', value: 1 })`);
    await evalJson(`window.__STUDY__.dispatch({ type: 'phase', delta: 1 })`);
  }

  ws.close();
  chrome.kill();
}

main().catch((error) => {
  console.error(error);
  chrome.kill();
  process.exit(1);
});

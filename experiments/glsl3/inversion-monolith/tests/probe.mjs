import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const port = 9335;
const base = 'http://127.0.0.1:5173/experiments/glsl3/inversion-monolith/?shot=initial&readback=1';

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--remote-debugging-port=' + port,
  '--user-data-dir=/tmp/chrome-inversion-probe',
  '--window-size=1440,1100',
  '--no-first-run',
  'about:blank',
], { stdio: 'ignore' });

let ws;
let seq = 0;
const pending = new Map();
const send = (method, params = {}) => {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
};

async function main() {
  for (let i = 0; i < 40; i += 1) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
      if (list[0]?.webSocketDebuggerUrl) {
        ws = new WebSocket(list[0].webSocketDebuggerUrl);
        break;
      }
    } catch { /* boot */ }
    await sleep(100);
  }
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const waiter = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) waiter.reject(new Error(JSON.stringify(msg.error)));
    else waiter.resolve(msg.result);
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: base });
  for (let i = 0; i < 50; i += 1) {
    const ready = await send('Runtime.evaluate', {
      expression: 'document.body && document.body.dataset.ready === "1"',
      returnByValue: true,
    });
    if (ready.result?.value) break;
    await sleep(100);
  }
  const probe = await send('Runtime.evaluate', {
    expression: `(() => {
      const gl = window.__GL__;
      const buf = new Uint8Array(4);
      const submit = [];
      const finished = [];
      const readback = [];
      for (let i = 0; i < 6; i += 1) {
        const t0 = performance.now();
        window.__STUDY__.draw();
        const t1 = performance.now();
        gl.finish();
        const t2 = performance.now();
        gl.readPixels(640, 360, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        const t3 = performance.now();
        submit.push(t1 - t0);
        finished.push(t2 - t0);
        readback.push(t3 - t0);
      }
      const q = (arr, p) => {
        const s = arr.slice().sort((a, b) => a - b);
        return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
      };
      return {
        submit: { n: submit.length, p50: q(submit, 0.5), p95: q(submit, 0.95), max: Math.max(...submit) },
        withFinish: { n: finished.length, p50: q(finished, 0.5), p95: q(finished, 0.95), max: Math.max(...finished) },
        withReadPixels: { n: readback.length, p50: q(readback, 0.5), p95: q(readback, 0.95), max: Math.max(...readback), sample: Array.from(buf) },
      };
    })()`,
    returnByValue: true,
  });
  await send('Emulation.setDeviceMetricsOverride', { width: 320, height: 568, deviceScaleFactor: 1, mobile: true });
  await send('Page.navigate', { url: base });
  for (let i = 0; i < 50; i += 1) {
    const ready = await send('Runtime.evaluate', {
      expression: 'document.body && document.body.dataset.ready === "1"',
      returnByValue: true,
    });
    if (ready.result?.value) break;
    await sleep(100);
  }
  await sleep(200);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(join(root, 'captures', 'layout-320.png'), Buffer.from(shot.data, 'base64'));
  const report = { drawProbeMs: probe.result.value };
  writeFileSync(join(root, 'captures', 'draw-probe.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report));
  ws.close();
  chrome.kill();
}

main().catch((error) => {
  console.error(error);
  chrome.kill();
  process.exit(1);
});
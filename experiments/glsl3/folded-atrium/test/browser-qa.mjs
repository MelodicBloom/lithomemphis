// Headless Chrome QA for the folded atrium. Reports the real renderer string.
import { mkdirSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";

const base = process.env.ATRIUM_URL || "http://127.0.0.1:4180/experiments/glsl3/folded-atrium/";
const outDir = new URL("../captures/", import.meta.url);
mkdirSync(outDir, { recursive: true });

const chrome = spawn("google-chrome", [
  "--headless=new",
  "--use-angle=swiftshader",
  "--enable-unsafe-swiftshader",
  "--remote-debugging-port=9222",
  "--window-size=1440,980",
  "--no-first-run",
  "--disable-extensions",
  `--user-data-dir=/tmp/chrome-atrium-${process.pid}`,
  "about:blank",
], { stdio: "ignore" });

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function debuggerUrl() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch("http://127.0.0.1:9222/json/version");
      if (res.ok) return (await res.json()).webSocketDebuggerUrl;
    } catch { /* starting */ }
    await sleep(100);
  }
  throw new Error("Chrome debugger did not start");
}

class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.ws.addEventListener("message", (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const message = { id, method, params };
    if (sessionId) message.sessionId = sessionId;
    this.ws.send(JSON.stringify(message));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

const shots = [
  ["misaligned", `${base}?shot=stagger&size=1280x720`],
  ["mid-transition", `${base}?shot=mid&size=1280x720`],
  ["aligned", `${base}?shot=seam&size=1280x720`],
];

const report = { shots: [], occlusion: null, controls: null, context: null };

try {
  const wsUrl = await debuggerUrl();
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });
  const cdp = new Cdp(ws);
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  const send = (method, params = {}) => cdp.send(method, params, sessionId);
  await send("Page.enable");
  await send("Runtime.enable");

  async function open(url) {
    await send("Page.navigate", { url });
    for (let i = 0; i < 40; i++) {
      const probe = await send("Runtime.evaluate", {
        expression: "Boolean(window.__atrium)",
        returnByValue: true,
      });
      if (probe.result?.value) break;
      await sleep(150);
    }
    const ready = await send("Runtime.evaluate", {
      expression: "window.__atrium ? window.__atrium.ready : Promise.reject('missing atrium')",
      awaitPromise: true,
      returnByValue: true,
    });
    if (ready.exceptionDetails) throw new Error(JSON.stringify(ready.exceptionDetails));
    await sleep(250);
  }

  async function shot(name) {
    const image = await send("Page.captureScreenshot", { format: "png" });
    const file = new URL(`${name}.png`, outDir);
    writeFileSync(file, Buffer.from(image.data, "base64"));
    return file.pathname;
  }

  async function evalJson(expression) {
    const result = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }

  for (const [name, url] of shots) {
    await open(url);
    const info = await evalJson(`({
      renderer: window.__atrium.renderer(),
      hash: window.__atrium.getHash(),
      status: document.querySelector('#status-line').textContent,
      hint: document.querySelector('#hint').textContent,
      buffer: window.__atrium.buffer(),
      fallback: document.querySelector('#fallback').hidden,
      notice: document.querySelector('#notice').textContent
    })`);
    const file = await shot(name);
    report.shots.push({ name, file, ...info });
  }

  await open(`${base}?shot=seam&size=1280x720&probe=1`);
  const seamPx = await evalJson(`(() => {
    window.__atrium.setProbe(true);
    const b = window.__atrium.buffer();
    const samples = [];
    for (let y = 80; y < b.height; y += 40) {
      for (let x = 80; x < b.width; x += 40) {
        const p = window.__atrium.readPixel(x, y);
        const kind = p[1] > 200 && p[0] < 40 ? 'rib' : (p[0] > 200 && p[2] > 200 ? 'portal' : 'void');
        samples.push(kind);
      }
    }
    return { buffer: b, rib: samples.filter(k=>k==='rib').length, portal: samples.filter(k=>k==='portal').length, void: samples.filter(k=>k==='void').length };
  })()`);
  await open(`${base}?shot=stagger&size=1280x720&probe=1`);
  const stagPx = await evalJson(`(() => {
    window.__atrium.setProbe(true);
    const b = window.__atrium.buffer();
    const samples = [];
    for (let y = 80; y < b.height; y += 40) {
      for (let x = 80; x < b.width; x += 40) {
        const p = window.__atrium.readPixel(x, y);
        const kind = p[1] > 200 && p[0] < 40 ? 'rib' : (p[0] > 200 && p[2] > 200 ? 'portal' : 'void');
        samples.push(kind);
      }
    }
    return { rib: samples.filter(k=>k==='rib').length, portal: samples.filter(k=>k==='portal').length, void: samples.filter(k=>k==='void').length };
  })()`);
  report.occlusion = { aligned: seamPx, misaligned: stagPx };

  await open(`${base}?size=1280x720`);
  const controls = await evalJson(`(async () => {
    const before = window.__atrium.getHash();
    const phase = document.querySelector('#phase-control');
    phase.focus();
    phase.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    const afterKey = window.__atrium.getController().scene.k;
    document.querySelector('#phase-minus').click();
    document.querySelector('#phase-minus').click();
    document.querySelector('[data-ratio="2"]').click();
    document.querySelector('#undo').click();
    const queue = [];
    document.querySelector('#phase-plus').click();
    document.querySelector('#phase-plus').click();
    document.querySelector('#phase-plus').click();
    const refused = document.querySelector('#notice').textContent;
    const q = document.querySelector('#queue-readout').textContent;
    document.querySelector('#reset').click();
    return { before, afterKey, refused, queue: q, hashAfterReset: window.__atrium.getHash(), scene: window.__atrium.getController().scene.k };
  })()`);
  report.controls = controls;

  const losses = await evalJson(`(async () => {
    window.__atrium.dispatch({ type: 'pause', paused: true });
    const hashes = [];
    for (let i = 0; i < 5; i++) {
      const before = window.__atrium.getHash();
      window.__atrium.loseContext();
      await new Promise(r => setTimeout(r, 60));
      window.__atrium.restoreContext();
      await new Promise(r => setTimeout(r, 100));
      hashes.push({ before, after: window.__atrium.getHash(), same: before === window.__atrium.getHash() });
    }
    return hashes;
  })()`);
  report.context = losses;

  const perf = await evalJson(`(async () => {
    const samples = [];
    let last = performance.now();
    await new Promise((resolve) => {
      const start = performance.now();
      function tick(now) {
        samples.push(now - last);
        last = now;
        if (now - start < 4000) requestAnimationFrame(tick);
        else resolve();
      }
      requestAnimationFrame(tick);
    });
    samples.sort((a,b)=>a-b);
    const q = (p) => samples[Math.min(samples.length-1, Math.max(0, Math.ceil(p*samples.length)-1))];
    const cpu = [];
    for (let i = 0; i < 30; i++) {
      const t = performance.now();
      window.__atrium.dispatch({ type: 'advance', ticks: 1 });
      cpu.push(performance.now() - t);
    }
    cpu.sort((a,b)=>a-b);
    return {
      renderer: window.__atrium.renderer(),
      n: samples.length,
      p50: q(0.5), p95: q(0.95), p99: q(0.99),
      over25: samples.filter(v => v > 25).length / samples.length,
      cpuP95: cpu[Math.ceil(0.95*cpu.length)-1],
      buffer: window.__atrium.buffer()
    };
  })()`);
  report.perf = perf;
  writeFileSync(new URL("../captures/browser-qa.json", import.meta.url), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  chrome.kill("SIGKILL");
}

import { spawn } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const base = process.argv[2] || 'http://127.0.0.1:5173/experiments/glsl3/inversion-monolith/?bench=1';
const port = 9334;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const chrome = spawn('google-chrome', [
  '--headless=new',
  '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader',
  '--remote-debugging-port=' + port,
  '--user-data-dir=/tmp/chrome-inversion-bench',
  '--window-size=1440,1100',
  '--no-first-run',
  '--disable-extensions',
  'about:blank',
], { stdio: 'ignore' });

let ws;
let seq = 0;
const pending = new Map();

function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function main() {
  for (let i = 0; i < 50; i += 1) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json());
      if (list[0]?.webSocketDebuggerUrl) {
        ws = new WebSocket(list[0].webSocketDebuggerUrl);
        break;
      }
    } catch {
      // still booting
    }
    await sleep(100);
  }
  if (!ws) throw new Error('chrome did not open');
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve);
    ws.addEventListener('error', reject);
  });
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (!msg.id || !pending.has(msg.id)) return;
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    if (msg.error) reject(new Error(JSON.stringify(msg.error)));
    else resolve(msg.result);
  });
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Page.navigate', { url: base });
  let report = null;
  for (let i = 0; i < 240; i += 1) {
    const evaled = await send('Runtime.evaluate', {
      expression: 'document.body && document.body.dataset.ready === "bench" ? document.body.dataset.bench : ""',
      returnByValue: true,
    });
    if (evaled.result?.value) {
      report = JSON.parse(evaled.result.value);
      break;
    }
    await sleep(1000);
  }
  if (!report) throw new Error('bench did not finish');
  writeFileSync(join(root, 'captures', 'bench.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  ws.close();
  chrome.kill();
}

main().catch((error) => {
  console.error(error);
  chrome.kill();
  process.exit(1);
});
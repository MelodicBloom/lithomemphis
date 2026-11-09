import {
  createController,
  dispatch,
  clockStep,
  hint,
  statusText,
  hashController,
  bridgeVisual,
} from "./state.mjs";
import { createRenderer, drawScene, readPixel } from "./render.mjs";
import { sha256Hex, TICK_HZ, RATIOS } from "./analytic.mjs";

const canvas = document.querySelector("#view");
const fallback = document.querySelector("#fallback");
const statusLine = document.querySelector("#status-line");
const phaseReadout = document.querySelector("#phase-readout");
const queueReadout = document.querySelector("#queue-readout");
const hintEl = document.querySelector("#hint");
const noticeEl = document.querySelector("#notice");
const foot = document.querySelector("#foot");
const phaseControl = document.querySelector("#phase-control");

const params = new URLSearchParams(location.search);
const reducedPref = window.matchMedia("(prefers-reduced-motion: reduce)").matches || params.get("reduced") === "1";
let controller = createController(20261109, params.get("preset") || "stagger", reducedPref);
let hidden = document.visibilityState === "hidden";
let raf = 0;
let last = performance.now();
let acc = 0;
const frameIntervals = [];
let collecting = false;
let gpu = null;
let sources = null;
let fixedSize = null;

function noteFrom(next) {
  controller = next;
  if (next.notice && (next.refused || next.evicted || next.notice.kind === "evict" || next.notice.kind === "reset")) {
    noticeEl.textContent = next.notice.text;
  } else if (next.refused) {
    noticeEl.textContent = next.notice?.text || "";
  }
}

function act(action) {
  const next = dispatch(controller, action);
  noteFrom(next);
  paint();
  return next;
}

async function loadSources() {
  const names = ["rib.vert.glsl", "rib.frag.glsl", "portal.vert.glsl", "portal.frag.glsl"];
  const texts = await Promise.all(names.map((name) => fetch(`./shaders/${name}`).then((r) => r.text())));
  return {
    ribVert: texts[0],
    ribFrag: texts[1],
    portalVert: texts[2],
    portalFrag: texts[3],
    hash: sha256Hex(texts.join("\n")),
  };
}

function bufferSize() {
  if (fixedSize) return fixedSize;
  const rect = canvas.getBoundingClientRect();
  const dpr = 1;
  return {
    width: Math.max(2, Math.round(rect.width * dpr)),
    height: Math.max(2, Math.round(rect.height * dpr)),
  };
}

function paint() {
  const h = hint(controller.scene);
  statusLine.textContent = statusText(controller.scene);
  phaseReadout.textContent = `k ${String(controller.scene.k).padStart(2, "0")} / 23 · ${RATIOS[controller.scene.ratio].label}`;
  queueReadout.textContent = `queue ${controller.scene.queue.length}/2`;
  hintEl.textContent = h ? h.text : "Free explore";
  document.querySelector("#pause").textContent = controller.scene.paused ? "Run" : "Pause";
  document.querySelector("#pause").setAttribute("aria-pressed", controller.scene.paused ? "true" : "false");
  document.querySelector("#mode").textContent = controller.scene.mode === "puzzle" ? "Puzzle" : "Free";
  document.querySelectorAll("[data-ratio]").forEach((button) => {
    button.setAttribute("aria-pressed", String(Number(button.dataset.ratio) === controller.scene.ratio));
  });
  document.querySelector("#light").value = String(controller.scene.azimuth);
  document.querySelector("#mist").value = String(controller.scene.sigmaMicros);
  document.querySelector("#reduced").checked = controller.scene.reduced;
  document.querySelector("#tick").value = String(controller.scene.tick);
  document.querySelector("#tick").disabled = !controller.scene.paused;
  if (gpu?.ok && !gpu.lost) {
    const size = bufferSize();
    drawScene(gpu, controller.scene, size.width, size.height);
  }
  const bridge = bridgeVisual(controller.scene);
  foot.textContent = gpu?.ok
    ? `${gpu.renderer} · tick ${controller.scene.tick} · bridge ${bridge} · ${sources?.hash?.slice(0, 12) || ""}`
    : "WebGL2 unavailable";
}

function frame(now) {
  const dt = Math.min(100, now - last);
  if (collecting) frameIntervals.push(dt);
  last = now;
  const stepped = clockStep(controller, dt, { hidden });
  if (!hidden && !controller.scene.paused) acc += dt - stepped.applied * (1000 / TICK_HZ);
  controller = stepped.controller;
  paint();
  raf = requestAnimationFrame(frame);
}

function quantiles(samples) {
  if (!samples.length) return null;
  const s = [...samples].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))];
  const over25 = s.filter((v) => v > 25).length / s.length;
  const over20 = s.filter((v) => v > 20).length / s.length;
  return { n: s.length, p50: q(0.5), p95: q(0.95), p99: q(0.99), fractionOver25ms: over25, fractionOver20ms: over20 };
}

phaseControl.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    act({ type: "phase", sign: event.key === "ArrowRight" ? 1 : -1 });
  }
});
canvas.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    act({ type: "phase", sign: event.key === "ArrowRight" ? 1 : -1 });
  }
});
document.querySelector("#phase-minus").addEventListener("click", () => act({ type: "phase", sign: -1 }));
document.querySelector("#phase-plus").addEventListener("click", () => act({ type: "phase", sign: 1 }));
document.querySelectorAll("[data-ratio]").forEach((button) => {
  button.addEventListener("click", () => act({ type: "ratio", id: Number(button.dataset.ratio) }));
});
document.querySelector("#undo").addEventListener("click", () => act({ type: "undo" }));
document.querySelector("#redo").addEventListener("click", () => act({ type: "redo" }));
document.querySelector("#reset").addEventListener("click", () => act({ type: "reset" }));
document.querySelector("#pause").addEventListener("click", () => act({ type: "pause", paused: !controller.scene.paused }));
document.querySelector("#mode").addEventListener("click", () => act({ type: "mode", mode: controller.scene.mode === "puzzle" ? "free" : "puzzle" }));
document.querySelectorAll("[data-preset]").forEach((button) => {
  button.addEventListener("click", () => act({ type: "preset", id: button.dataset.preset }));
});
document.querySelector("#light").addEventListener("input", (event) => act({ type: "azimuth", deg: Number(event.target.value) }));
document.querySelector("#mist").addEventListener("input", (event) => act({ type: "sigma", micros: Number(event.target.value) }));
document.querySelector("#mist-off").addEventListener("click", () => act({ type: "sigma", micros: 0 }));
document.querySelector("#reduced").addEventListener("change", (event) => act({ type: "reduced", reduced: event.target.checked }));
document.querySelector("#tick").addEventListener("change", (event) => act({ type: "seek", tick: Number(event.target.value) }));
document.querySelectorAll("[data-look]").forEach((button) => {
  button.addEventListener("click", () => {
    const sign = Number(button.dataset.sign);
    const yaw = controller.scene.yawMilli + (button.dataset.look === "yaw" ? sign * 2000 : 0);
    const pitch = controller.scene.pitchMilli + (button.dataset.look === "pitch" ? sign * 2000 : 0);
    act({ type: "inspect", yawMilli: yaw, pitchMilli: pitch });
  });
});

let look = null;
canvas.addEventListener("pointerdown", (event) => {
  if (controller.scene.mode !== "free") {
    noticeEl.textContent = "Camera fixed in puzzle";
    return;
  }
  look = { x: event.clientX, y: event.clientY, yaw: controller.scene.yawMilli, pitch: controller.scene.pitchMilli };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!look) return;
  const yaw = look.yaw - (event.clientX - look.x) * 40;
  const pitch = look.pitch + (event.clientY - look.y) * 30;
  const next = dispatch(controller, { type: "inspect", yawMilli: yaw, pitchMilli: pitch });
  if (!next.refused) controller = next;
});
canvas.addEventListener("pointerup", () => { look = null; });

document.addEventListener("visibilitychange", () => {
  hidden = document.visibilityState === "hidden";
  last = performance.now();
});

function showFallback(text) {
  fallback.hidden = false;
  fallback.textContent = text;
  canvas.hidden = true;
}

async function boot() {
  try {
    sources = await loadSources();
  } catch (error) {
    showFallback(`Shader sources did not load (${error.message}). This is not the folded chamber.`);
    paint();
    return;
  }
  gpu = createRenderer(canvas, sources);
  if (!gpu.ok) {
    showFallback(gpu.reason === "no-webgl2"
      ? "WebGL2 is unavailable. The ribs and the folded chamber are not being drawn. The controls below still update the canonical study state; this is not the shader view."
      : `The shaders did not compile (${gpu.detail}). The controls still update canonical state. This is not the folded chamber.`);
    paint();
    return;
  }
  gpu.onStatus = (text) => { noticeEl.textContent = text; };
  if (params.get("portal") === "0") gpu.portal = false;
  if (params.get("probe") === "1") gpu.probe = true;
  if (params.get("size")) {
    const [w, h] = params.get("size").split("x").map(Number);
    if (w > 0 && h > 0) fixedSize = { width: w, height: h };
  }
  const shot = params.get("shot");
  if (shot === "mid") {
    controller = createController(20261109, "threshold", reducedPref);
    const h = hint(controller.scene);
    controller = dispatch(controller, { type: "phase", sign: h.sign });
    controller = dispatch(controller, { type: "seek", tick: 8 });
    controller = dispatch(controller, { type: "pause", paused: true });
  } else if (shot === "seam" || shot === "threshold" || shot === "stagger") {
    controller = createController(20261109, shot, reducedPref);
    if (shot !== "stagger") controller = dispatch(controller, { type: "pause", paused: true });
  }
  paint();
  last = performance.now();
  raf = requestAnimationFrame(frame);
  if (params.get("bench") === "1") runBench().catch((error) => { noticeEl.textContent = String(error.message || error); });
}

async function runBench() {
  fixedSize = { width: 1280, height: 720 };
  const runs = [];
  for (const portal of [true, false]) {
    gpu.portal = portal;
    frameIntervals.length = 0;
    collecting = false;
    await wait(3000);
    frameIntervals.length = 0;
    collecting = true;
    await wait(20000);
    collecting = false;
    const cpu = [];
    for (let i = 0; i < 120; i++) {
      const size = bufferSize();
      const result = drawScene(gpu, controller.scene, size.width, size.height);
      if (result.cpuMs != null) cpu.push(result.cpuMs);
    }
    runs.push({ portal, frames: quantiles(frameIntervals), cpu: quantiles(cpu) });
  }
  const payload = {
    renderer: gpu.renderer,
    timerSupported: gpu.timerSupported,
    drawingBuffer: { width: 1280, height: 720, dpr: 1 },
    runs,
    note: "Wall-clock requestAnimationFrame intervals. Software renderers are not a pass of the 20 ms p95 target. Warmup 3s, sample 20s, one run per portal state.",
  };
  window.__BENCH__ = payload;
  noticeEl.textContent = "Bench recorded on window.__BENCH__";
}

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

window.__atrium = {
  getController: () => controller,
  getHash: () => hashController(controller),
  dispatch: (action) => act(action),
  readPixel: (x, y) => (gpu?.ok ? readPixel(gpu, x, y) : null),
  renderer: () => gpu?.renderer || null,
  setProbe: (on) => { if (gpu) gpu.probe = !!on; paint(); },
  setPortal: (on) => { if (gpu) gpu.portal = !!on; paint(); },
  loseContext: () => gpu?.lose?.loseContext(),
  restoreContext: () => gpu?.lose?.restoreContext(),
  buffer: () => ({ width: gpu?.gl?.drawingBufferWidth || 0, height: gpu?.gl?.drawingBufferHeight || 0 }),
  ready: boot(),
};

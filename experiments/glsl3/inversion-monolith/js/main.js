import { DRAW_HEIGHT, DRAW_WIDTH } from './constants.js';
import { drawFallback } from './fallback.js';
import { createProgram, draw, rendererInfo } from './renderer.js';
import {
  createState,
  hashState,
  hint,
  isAligned,
  reduce,
} from './state.js';
import { bindControls, paintControls } from './ui.js';

const params = new URLSearchParams(location.search);
const dom = {
  stage: document.querySelector('#stage'),
  fallback: document.querySelector('#fallback'),
  status: document.querySelector('#status'),
  notice: document.querySelector('#notice'),
  hint: document.querySelector('#hint'),
  kicker: document.querySelector('#kicker'),
  detent: document.querySelector('#detent'),
  angle: document.querySelector('#angle'),
  section: document.querySelector('#section'),
  queue: document.querySelector('#queue'),
  light: document.querySelector('#light'),
  lightValue: document.querySelector('#light-value'),
  fog: document.querySelector('#fog'),
  pause: document.querySelector('#pause'),
  reduced: document.querySelector('#reduced'),
  scrub: document.querySelector('#scrub'),
  tickValue: document.querySelector('#tick-value'),
  seed: document.querySelector('#seed'),
  phaseDec: document.querySelector('#phase-dec'),
  phaseInc: document.querySelector('#phase-inc'),
  cut0: document.querySelector('#cut-0'),
  cut1: document.querySelector('#cut-1'),
  cut2: document.querySelector('#cut-2'),
  undo: document.querySelector('#undo'),
  redo: document.querySelector('#redo'),
  reset: document.querySelector('#reset'),
  modeFree: document.querySelector('#mode-free'),
  modePuzzle: document.querySelector('#mode-puzzle'),
  presetMass: document.querySelector('#preset-mass'),
  presetVault: document.querySelector('#preset-vault'),
  presetAperture: document.querySelector('#preset-aperture'),
  presetPuzzle: document.querySelector('#preset-puzzle'),
};

let state = createState('mass');
let notice = 'Detent 00. Section 1/2.';
let gl = null;
let gpu = null;
let vertSrc = '';
let fragSrc = '';
let mode = 'pending';

const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (motion.matches) state = reduce(state, { type: 'reduced', value: 1 }).state;

function dispatch(action) {
  const result = reduce(state, action);
  state = result.state;
  notice = result.notice;
  paint();
  render();
  return result;
}

function paint() {
  paintControls(dom, state, notice);
  if (mode !== 'webgl') drawFallback(dom.fallback, state);
}

function render() {
  if (!gl || !gpu) return;
  const result = draw(gl, gpu, state);
  if (!result.ok) {
    notice = `Rejected uniform: ${result.violations.join(', ')}.`;
    dom.notice.textContent = notice;
  }
}

function setMode(next, message) {
  mode = next;
  document.body.dataset.renderer = next;
  dom.status.textContent = message;
  dom.stage.toggleAttribute('hidden', next !== 'webgl');
  dom.fallback.toggleAttribute('hidden', next === 'webgl');
}

async function loadShaders() {
  const [vert, frag] = await Promise.all([
    fetch('./shaders/monolith.vert'),
    fetch('./shaders/monolith.frag'),
  ]);
  if (!vert.ok || !frag.ok) throw new Error('shader files missing');
  vertSrc = await vert.text();
  fragSrc = await frag.text();
}

function bootGl() {
  gl = dom.stage.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false,
    preserveDrawingBuffer: params.has('readback'),
  });
  if (!gl) return false;
  gpu = createProgram(gl, vertSrc, fragSrc);
  const info = rendererInfo(gl);
  const label = info.software ? 'SwiftShader (software)' : info.renderer;
  dom.status.title = `${info.vendor} · ${info.renderer}`;
  setMode('webgl', label);
  window.__GL__ = gl;
  dom.stage.addEventListener('webglcontextlost', (event) => {
    event.preventDefault();
    gpu = null;
    notice = 'WebGL context lost. CPU state kept.';
    setMode('fallback', 'WebGL context lost. Static section only.');
    paint();
  });
  dom.stage.addEventListener('webglcontextrestored', () => {
    try {
      gpu = createProgram(gl, vertSrc, fragSrc);
      const restoredInfo = rendererInfo(gl);
      const restoredLabel = restoredInfo.software ? 'SwiftShader (software)' : restoredInfo.renderer;
      dom.status.title = `${restoredInfo.vendor} · ${restoredInfo.renderer}`;
      setMode('webgl', restoredLabel);
      notice = 'WebGL context restored from CPU state.';
      paint();
      render();
    } catch (error) {
      gpu = null;
      setMode('fallback', 'WebGL context restore failed. Static section only.');
      notice = `WebGL context restore failed: ${String(error.message || error)}`;
      paint();
    }
  });
  return true;
}

function solveByHints(start) {
  let current = start;
  for (let i = 0; i < 48; i += 1) {
    if (isAligned(current)) return current;
    const next = hint(current);
    if (!next.action) {
      current = reduce(current, { type: 'advance', ticks: 80 }).state;
      continue;
    }
    const result = reduce(current, next.action);
    current = result.mutated ? result.state : reduce(current, { type: 'advance', ticks: 80 }).state;
  }
  return current;
}

function applyShot(name) {
  if (name === 'initial') {
    state = reduce(createState('mass'), { type: 'pause', value: 1 }).state;
    notice = 'Initial mass.';
    return;
  }
  if (name === 'hybrid') {
    let s = createState('mass', { reduced: 1 });
    for (let i = 0; i < 4; i += 1) s = reduce(s, { type: 'phase', delta: 1 }).state;
    s = reduce(s, { type: 'cut', index: 1 }).state;
    s = reduce(s, { type: 'reduced', value: 0 }).state;
    s = reduce(s, { type: 'pause', value: 1 }).state;
    state = s;
    notice = 'Hybrid vault.';
    return;
  }
  if (name === 'mid') {
    let s = reduce(createState('mass'), { type: 'phase', delta: 1 }).state;
    s = reduce(s, { type: 'seek', tick: 8 }).state;
    s = reduce(s, { type: 'pause', value: 1 }).state;
    state = s;
    notice = 'Mid seat.';
    return;
  }
  if (name === 'aligned') {
    let s = solveByHints(createState('puzzle', { seed: 1 }));
    s = reduce(s, { type: 'advance', ticks: 200 }).state;
    s = reduce(s, { type: 'pause', value: 1 }).state;
    state = s;
    notice = isAligned(s) ? 'Aligned.' : 'Solve failed.';
  }
}

let acc = 0;
let last = performance.now();
let loopStarted = false;

function startLoop() {
  if (loopStarted || params.get('shot') || params.has('bench')) return false;
  loopStarted = true;
  requestAnimationFrame(loop);
  return true;
}

function loop(now) {
  const dt = Math.min(100, now - last);
  last = now;
  if (!state.paused && !state.hidden && !params.get('shot')) {
    acc += dt;
    const ticks = Math.floor((acc * 120) / 1000);
    if (ticks > 0) {
      acc -= (ticks * 1000) / 120;
      const result = reduce(state, { type: 'advance', ticks });
      if (result.mutated) {
        state = result.state;
        paint();
      }
    }
  }
  render();
  if (!params.get('shot')) requestAnimationFrame(loop);
}

function quantile(sorted, p) {
  if (!sorted.length) return null;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[index];
}

function summarizeFrames(samples) {
  const sorted = samples.slice().sort((a, b) => a - b);
  const over = (limit) => sorted.filter((n) => n > limit).length / sorted.length;
  return {
    n: sorted.length,
    p50: quantile(sorted, 0.5),
    p95: quantile(sorted, 0.95),
    p99: quantile(sorted, 0.99),
    max: sorted[sorted.length - 1],
    fractionOver20ms: over(20),
    fractionOver25ms: over(25),
  };
}

function runBench() {
  if (!gl) {
    document.body.dataset.bench = JSON.stringify({ error: 'no webgl' });
    document.body.dataset.ready = 'bench';
    return;
  }
  state = reduce(state, { type: 'pause', value: 1 }).state;
  paint();
  const timer = gl.getExtension('EXT_disjoint_timer_query_webgl2');
  const runs = [];
  const samples = [];
  let modeName = 'warm';
  let origin = performance.now();
  let last = origin;
  const finish = () => {
    document.body.dataset.bench = JSON.stringify({
      runs,
      timerQuery: timer ? 'EXT_disjoint_timer_query_webgl2 present; per-frame GPU time not sampled in this run' : 'unavailable',
      renderer: rendererInfo(gl),
      drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight],
      method: 'requestAnimationFrame interval, paused scene, 10s warmup then 3x60s, nearest-rank quantiles',
    });
    document.body.dataset.ready = 'bench';
  };
  const tick = (now) => {
    const dt = now - last;
    last = now;
    render();
    if (modeName === 'warm') {
      if (now - origin >= 10000) {
        modeName = 'run';
        origin = now;
      }
    } else {
      samples.push(dt);
      if (now - origin >= 60000) {
        runs.push(summarizeFrames(samples.splice(0)));
        if (runs.length === 3) {
          finish();
          return;
        }
        origin = now;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

document.addEventListener('visibilitychange', () => {
  dispatch({ type: 'hidden', value: document.hidden ? 1 : 0 });
});

bindControls(dom, () => state, dispatch);

window.__STUDY__ = {
  getState: () => state,
  dispatch,
  hash: () => hashState(state),
  hint: () => hint(state),
  aligned: () => isAligned(state),
  mode: () => mode,
  info: () => (gl ? rendererInfo(gl) : null),
  draw: () => render(),
};

dom.stage.width = DRAW_WIDTH;
dom.stage.height = DRAW_HEIGHT;

loadShaders()
  .then(() => {
    const ok = bootGl();
    if (!ok) setMode('fallback', 'WebGL2 unavailable. Static section only.');
    const shot = params.get('shot');
    if (shot) applyShot(shot);
    paint();
    render();
    document.body.dataset.ready = '1';
    if (params.has('bench')) runBench();
    else startLoop();
  })
  .catch((error) => {
    setMode('fallback', 'Shader files failed to load. Static section only.');
    notice = String(error.message || error);
    paint();
    document.body.dataset.ready = '1';
    if (params.has('bench')) runBench();
    else startLoop();
  });

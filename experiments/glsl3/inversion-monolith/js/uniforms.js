import {
  CUT_X,
  DRAW_HEIGHT,
  DRAW_WIDTH,
  FOG_SIGMA,
  IDLE_AMP,
  IDLE_HZ,
  LIGHT_AZIMUTH_MAX,
  LIGHT_AZIMUTH_MIN,
  MAX_DIST,
  TICK_HZ,
  cutZ,
} from './constants.js';
import { cameraBasis, evaluateVisual, lightDirection, seamSegment } from './geometry.js';
import { bridgeProgress } from './state.js';

function finiteVec(v, lo, hi) {
  return v.length === 3 && v.every((n) => Number.isFinite(n) && n >= lo && n <= hi);
}

export function deriveUniforms(state, view = { width: DRAW_WIDTH, height: DRAW_HEIGHT }) {
  const visual = evaluateVisual(state);
  const cam = cameraBasis(state.camYaw, state.camPitch);
  const seamNow = seamSegment(visual.phaseRad, visual.cutZ, visual.cutOffset);
  let veinA;
  let veinB;
  let edgeA;
  let edgeB;
  let carveEdge;
  if (state.mode === 'puzzle' && state.puzzle) {
    const ref = seamSegment(
      (state.puzzle.kStar * Math.PI) / 12,
      cutZ(state.puzzle.cutStar),
      CUT_X[state.puzzle.cutStar],
    );
    veinA = ref[0];
    veinB = ref[1];
    edgeA = seamNow[0];
    edgeB = seamNow[1];
    carveEdge = 1;
  } else {
    veinA = seamNow[0];
    veinB = seamNow[1];
    edgeA = seamNow[0];
    edgeB = seamNow[1];
    carveEdge = 0;
  }
  const t = state.tick / TICK_HZ;
  const idle = state.mode === 'free' && !state.reduced
    ? IDLE_AMP * Math.sin(2 * Math.PI * IDLE_HZ * t)
    : 0;
  return {
    phase: visual.phaseRad,
    cutZ: visual.cutZ,
    light: lightDirection(state.lightDeg),
    lightDeg: state.lightDeg,
    fogSigma: state.fog ? FOG_SIGMA : 0,
    idle,
    bridge: bridgeProgress(state),
    yaw: (state.camYaw * Math.PI) / 180,
    pitch: (state.camPitch * Math.PI) / 180,
    eye: cam.eye,
    forward: cam.forward,
    right: cam.right,
    up: cam.up,
    fovTan: cam.fovTan,
    veinA,
    veinB,
    edgeA,
    edgeB,
    carveEdge,
    showVein: 1,
    resolution: [view.width, view.height],
    tone: 'gamma-2.2',
    quality: 'standard',
    maxSteps: 64,
    maxDist: MAX_DIST,
    shadowSteps: 16,
    aoSteps: 4,
  };
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

/** Empty array means every uploaded value is inside the declared domain. */
export function uniformViolations(u) {
  const v = [];
  const num = (name, value, lo, hi) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < lo || value > hi) {
      v.push(name);
    }
  };
  num('phase', u.phase, -0.3, 6.4);
  num('cutZ', u.cutZ, -0.56, 0.02);
  num('fogSigma', u.fogSigma, 0, 0.06);
  if (u.fogSigma !== 0 && u.fogSigma !== FOG_SIGMA) v.push('fogSigma-set');
  num('idle', u.idle, -IDLE_AMP - 1e-9, IDLE_AMP + 1e-9);
  num('bridge', u.bridge, 0, 1);
  num('yaw', u.yaw, (-12 * Math.PI) / 180 - 1e-9, (12 * Math.PI) / 180 + 1e-9);
  num('pitch', u.pitch, (-8 * Math.PI) / 180 - 1e-9, (8 * Math.PI) / 180 + 1e-9);
  num('fovTan', u.fovTan, 0.05, 1.2);
  num('lightDeg', u.lightDeg, LIGHT_AZIMUTH_MIN, LIGHT_AZIMUTH_MAX);
  if (!Number.isInteger(u.lightDeg)) v.push('lightDeg-int');
  if (!finiteVec(u.light, -1, 1)) v.push('light');
  else {
    const len = Math.hypot(u.light[0], u.light[1], u.light[2]);
    if (Math.abs(len - 1) > 1e-6) v.push('light-norm');
  }
  for (const name of ['eye', 'forward', 'right', 'up', 'veinA', 'veinB', 'edgeA', 'edgeB']) {
    if (!finiteVec(u[name], -40, 40)) v.push(name);
  }
  const bases = [u.forward, u.right, u.up];
  if (bases.every((b) => finiteVec(b, -2, 2))) {
    if (Math.abs(Math.hypot(...u.forward) - 1) > 1e-6) v.push('forward-norm');
    if (Math.abs(Math.hypot(...u.right) - 1) > 1e-6) v.push('right-norm');
    if (Math.abs(dot(u.forward, u.right)) > 1e-6) v.push('forward-right');
    if (Math.abs(dot(u.forward, u.up)) > 1e-6) v.push('forward-up');
    if (Math.abs(dot(u.right, u.up)) > 1e-6) v.push('right-up');
  }
  if (!Array.isArray(u.resolution) || u.resolution.length !== 2) v.push('resolution');
  else {
    num('width', u.resolution[0], 1, 8192);
    num('height', u.resolution[1], 1, 8192);
  }
  if (u.carveEdge !== 0 && u.carveEdge !== 1) v.push('carveEdge');
  if (u.maxDist !== MAX_DIST) v.push('maxDist');
  if (u.tone !== 'gamma-2.2' || u.quality !== 'standard') v.push('tone');
  return v;
}

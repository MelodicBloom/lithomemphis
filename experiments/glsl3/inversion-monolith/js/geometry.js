import {
  CAM_BASE_PITCH,
  CAM_BASE_YAW,
  CAM_DIST,
  CAM_TARGET,
  CUT_X,
  FOV_Y_DEG,
  LIGHT_ELEVATION_DEG,
  PHASE_COUNT,
  cutZ,
} from './constants.js';
import { clamp01, lerp, quartic, smoothstep } from './ease.js';

const TAU = Math.PI * 2;
const PHASE_STEP = TAU / PHASE_COUNT;

export function wrapDetent(k) {
  return ((k % PHASE_COUNT) + PHASE_COUNT) % PHASE_COUNT;
}

export function detentToRad(k) {
  return wrapDetent(k) * PHASE_STEP;
}

export function lobe(delta) {
  const c = Math.cos(delta);
  return c > 0 ? c * c : 0;
}

/** Partition of unity over three vault families, 120° apart. */
export function lobes(phi) {
  const a = TAU / 3;
  const n = lobe(phi);
  const c = lobe(phi - a);
  const p = lobe(phi - 2 * a);
  const s = n + c + p;
  return [n / s, c / s, p / s];
}

export function lightDirection(deg) {
  const az = (deg * Math.PI) / 180;
  const el = (LIGHT_ELEVATION_DEG * Math.PI) / 180;
  const x = Math.cos(el) * Math.sin(az);
  const y = Math.sin(el);
  const z = Math.cos(el) * Math.cos(az);
  const len = Math.hypot(x, y, z);
  return [x / len, y / len, z / len];
}

export function transmittance(sigma, distance) {
  const d = Math.min(Math.max(distance, 0), 40);
  return Math.exp(-sigma * d);
}

function sub(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function cross(a, b) {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}

function normalize(v) {
  const len = Math.hypot(v[0], v[1], v[2]);
  return [v[0] / len, v[1] / len, v[2] / len];
}

export function cameraBasis(yawDeg, pitchDeg) {
  const yaw = CAM_BASE_YAW + (yawDeg * Math.PI) / 180;
  const pitch = CAM_BASE_PITCH + (pitchDeg * Math.PI) / 180;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const sy = Math.sin(yaw);
  const cy = Math.cos(yaw);
  const eye = [
    CAM_TARGET[0] + CAM_DIST * sy * cp,
    CAM_TARGET[1] + CAM_DIST * sp,
    CAM_TARGET[2] + CAM_DIST * cy * cp,
  ];
  const forward = normalize(sub(CAM_TARGET, eye));
  const right = normalize(cross(forward, [0, 1, 0]));
  const up = cross(right, forward);
  return {
    eye,
    forward,
    right,
    up,
    fovTan: Math.tan(((FOV_Y_DEG * Math.PI) / 180) / 2),
  };
}

/** gl_FragCoord convention: origin bottom-left, y up. */
export function project(world, cam, width, height) {
  const rel = sub(world, cam.eye);
  const camX = dot(rel, cam.right);
  const camY = dot(rel, cam.up);
  const camZ = dot(rel, cam.forward);
  if (camZ <= 0.05) return null;
  const px = camX / (camZ * 2 * cam.fovTan);
  const py = camY / (camZ * 2 * cam.fovTan);
  return [px * height + 0.5 * width, py * height + 0.5 * height];
}

/**
 * Amber / joint segment. Both endpoints lie on the cut plane.
 * x encodes sin(phase), cos(phase), and the non-collinear cut offset.
 */
export function seamSegment(phaseRad, z, cutOffset) {
  const s = Math.sin(phaseRad);
  const c = Math.cos(phaseRad);
  const yShift = cutOffset * 0.85;
  const x = 0.88 * s + cutOffset * 0.10;
  return [
    [x, 1.05 + yShift, z],
    [x + 0.38 * c, -0.85 + yShift, z],
  ];
}

export function planEnd(plan) {
  if (!plan || plan.steps.length === 0) return 0;
  const last = plan.steps[plan.steps.length - 1];
  return last.startTick + last.durationTicks;
}

/** Visual sculpture parameters from the immutable plan and the integer tick. */
export function evaluateVisual(state) {
  if (!state.plan) {
    return {
      phaseRad: detentToRad(state.k),
      cutZ: cutZ(state.cut),
      cutOffset: CUT_X[state.cut],
      settled: true,
    };
  }

  let phaseRad = detentToRad(state.plan.originK);
  let z = cutZ(state.plan.originCut);
  let offset = CUT_X[state.plan.originCut];
  let settled = true;

  for (const step of state.plan.steps) {
    const end = step.startTick + step.durationTicks;
    if (state.tick >= end) {
      if (step.kind === 'phase') phaseRad = detentToRad(step.to);
      else {
        z = cutZ(step.to);
        offset = CUT_X[step.to];
      }
      continue;
    }
    settled = false;
    if (state.tick < step.startTick) break;
    const u = clamp01((state.tick - step.startTick) / step.durationTicks);
    if (step.kind === 'phase') {
      phaseRad = (step.from + step.signedDelta * quartic(u)) * PHASE_STEP;
    } else {
      const e = smoothstep(u);
      z = lerp(cutZ(step.from), cutZ(step.to), e);
      offset = lerp(CUT_X[step.from], CUT_X[step.to], e);
    }
    break;
  }

  return { phaseRad, cutZ: z, cutOffset: offset, settled };
}

export function seamErrorPx(current, reference, cam, width, height) {
  let max = 0;
  for (let i = 0; i < 2; i += 1) {
    const a = project(current[i], cam, width, height);
    const b = project(reference[i], cam, width, height);
    if (!a || !b) return Infinity;
    max = Math.max(max, Math.hypot(a[0] - b[0], a[1] - b[1]));
  }
  return max;
}

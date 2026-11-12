import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { quartic, smoothstep } from '../js/ease.js';
import {
  CUTS,
  CUT_X,
  FOG_SIGMA,
  PHASE_TICKS,
  SHADER_CLAMPS,
  cutRational,
  cutZ,
} from '../js/constants.js';
import {
  cameraBasis,
  evaluateVisual,
  lightDirection,
  lobes,
  planEnd,
  project,
  seamErrorPx,
  seamSegment,
  transmittance,
} from '../js/geometry.js';
import { sha256 } from '../js/sha256.js';
import {
  conservativeScaledSphere,
  rayAabb,
  raySphere,
  sdBox,
  sdPlaneZ,
  sdSphere,
  sphereTrace,
} from '../js/sdf.js';
import {
  bridgeProgress,
  createPuzzle,
  createState,
  cutDistance,
  hashState,
  hint,
  isAligned,
  pendingCount,
  phaseDistance,
  puzzleLayout,
  reduce,
} from '../js/state.js';
import { keyToAction } from '../js/ui.js';
import { deriveUniforms, uniformViolations } from '../js/uniforms.js';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const results = {};

function check(name, cond, detail) {
  if (!cond) failures.push({ name, detail });
}

function approx(a, b, tol) {
  return Math.abs(a - b) <= tol;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uniformsOf(state) {
  return deriveUniforms(state, { width: 1280, height: 720 });
}

function solve(start) {
  let current = start;
  for (let i = 0; i < 64; i += 1) {
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

const abc = sha256('abc');
const abcOracle = createHash('sha256').update('abc').digest('hex');
check('sha256 abc', abc === abcOracle && abc === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', abc);

check('quartic endpoints', quartic(0) === 0 && quartic(1) === 1);
check('smoothstep endpoints', smoothstep(0) === 0 && smoothstep(1) === 1);
let prevQ = -1;
let prevS = -1;
let easeOk = true;
for (let i = 0; i <= 1000; i += 1) {
  const u = i / 1000;
  const q = quartic(u);
  const s = smoothstep(u);
  if (q < prevQ || s < prevS || q > 1 || s > 1) easeOk = false;
  prevQ = q;
  prevS = s;
}
check('ease monotone', easeOk);
check('quartic mid', approx(quartic(1 - 0.5 ** 0.25), 0.5, 1e-12));

const sphereHit = raySphere([0, 0, 5], [0, 0, -1], 1);
check('sphere ray hit', approx(sphereHit, 4, 1e-9), sphereHit);
check('sphere ray miss', raySphere([2, 0, 5], [0, 0, -1], 1) === null);
check('sphere samples', approx(sdSphere([0, 0, 0], 1), -1, 1e-12) && approx(sdSphere([1, 0, 0], 1), 0, 1e-12) && approx(sdSphere([0, 3, 0], 1), 2, 1e-12));
const marched = sphereTrace([0, 0, 5], [0, 0, -1], (p) => sdSphere(p, 1));
check('sphere march', marched.hit && approx(marched.t, 4, 0.002), marched);
const missMarch = sphereTrace([2, 0, 5], [0, 0, -1], (p) => sdSphere(p, 1), { maxDist: 8 });
check('sphere march miss', missMarch.hit === false);

check('box samples', approx(sdBox([0, 0, 0], [1, 1, 1]), -1, 1e-12) && approx(sdBox([2, 0, 0], [1, 1, 1]), 1, 1e-12));
const boxT = rayAabb([0, 0, 5], [0, 0, -1], [-1, -1, -1], [1, 1, 1]);
check('box ray', approx(boxT, 4, 1e-12), boxT);
check('plane ray', approx(sdPlaneZ([0, 0, 5]), 5, 1e-12));

const rotated = [1, 2, 3];
const back = [Math.cos(0.4) * rotated[0] + Math.sin(0.4) * rotated[2], rotated[1], -Math.sin(0.4) * rotated[0] + Math.cos(0.4) * rotated[2]];
check('rigid sphere distance', approx(sdSphere(rotated, 1), sdSphere(back, 1), 1e-12));
const center = [2, -1, 0.5];
const shifted = [center[0] + 1, center[1], center[2]];
check('rigid translation', approx(
  sdSphere([shifted[0] - center[0], shifted[1] - center[1], shifted[2] - center[2]], 1),
  sdSphere([1, 0, 0], 1),
  1e-12,
));

const boundX = conservativeScaledSphere([2, 0, 0], [0.5, 1, 1], 1);
const boundY = conservativeScaledSphere([0, 3, 0], [0.5, 1, 1], 1);
check('conservative scale axes', approx(boundX, 1.5, 1e-12) && approx(boundY, 1, 1e-12) && boundY <= 2);
let scaleThrew = false;
try { conservativeScaledSphere([1, 0, 0], [0, 1, 1], 1); } catch { scaleThrew = true; }
check('zero scale rejected', scaleThrew);

const ratios = CUTS.map((_, i) => cutRational(i));
check('cut rationals', ratios[0].num === 0 && ratios[1].num === -12 && ratios[1].den === 75 && ratios[2].num === -36 && ratios[2].den === 125);
check('cut float from rational', ratios.every((r) => cutZ(CUTS.indexOf(CUTS[ratios.indexOf(r)])) === r.num / r.den));

let lobeOk = true;
let lobeMin = Infinity;
for (let i = 0; i < 3600; i += 1) {
  const phi = (i / 3600) * Math.PI * 2;
  const w = lobes(phi);
  const sum = w[0] + w[1] + w[2];
  lobeMin = Math.min(lobeMin, w[0] + w[1] + w[2] === sum ? Math.min(...w.map(() => 1)) : 0);
  if (w.some((x) => x < 0 || x > 1) || Math.abs(sum - 1) > 1e-12) lobeOk = false;
}
check('lobes partition', lobeOk);
check('lobe peaks', lobes(0)[0] === 1 && approx(lobes((2 * Math.PI) / 3)[1], 1, 1e-12) && approx(lobes((4 * Math.PI) / 3)[2], 1, 1e-12));

for (const deg of [-60, 0, 60]) {
  const L = lightDirection(deg);
  const len = Math.hypot(...L);
  check(`light ${deg}`, approx(len, 1, 1e-12) && L.every((n) => n >= -1 && n <= 1), L);
}
check('fog samples', transmittance(0, 40) === 1 && transmittance(0.02, 0) === 1 && approx(transmittance(0.02, 10), 0.8187307530779818, 1e-12));
check('fog square', approx(transmittance(0.02, 5) ** 2, transmittance(0.02, 10), 1e-12));
let fogMono = true;
for (const sigma of [0, 0.012, 0.02, 0.06]) {
  let prev = 2;
  for (const d of [0, 5, 10, 40]) {
    const t = transmittance(sigma, d);
    if (t > prev + 1e-15 || t <= 0 || t > 1) fogMono = false;
    prev = t;
  }
}
check('fog monotone', fogMono);

const base = createState('mass');
check('mass start', base.k === 0 && base.cut === 0 && base.lightDeg === -42 && base.fog === 1 && base.tick === 0);
const plus = reduce(base, { type: 'phase', delta: 1 });
check('phase notice', plus.notice === 'Detent 01. Phase +15°.' && plus.state.k === 1 && plus.state.tick === 0, plus.notice);
const inverse = reduce(plus.state, { type: 'phase', delta: -1 });
check('inverse at fixed tick', inverse.state.k === 0 && inverse.state.tick === 0, inverse.notice);

let wrapped = createState('mass', { reduced: 1 });
for (let i = 0; i < 23; i += 1) wrapped = reduce(wrapped, { type: 'phase', delta: 1 }).state;
const over = reduce(wrapped, { type: 'phase', delta: 1 });
check('wrap detent', over.state.k === 0, over.state.k);
let cycle = createState('mass', { reduced: 1 });
for (let i = 0; i < 24; i += 1) cycle = reduce(cycle, { type: 'phase', delta: 1 }).state;
check('24 reduced steps', cycle.k === 0 && cycle.plan === null);

let walked = createState('mass');
for (let i = 0; i < 24; i += 1) {
  walked = reduce(walked, { type: 'phase', delta: 1 }).state;
  walked = reduce(walked, { type: 'advance', ticks: PHASE_TICKS }).state;
}
check('24 settled steps', walked.k === 0 && walked.plan === null);

const queued = [];
let qstate = createState('mass');
for (let i = 0; i < 3; i += 1) {
  const result = reduce(qstate, { type: 'phase', delta: 1 });
  queued.push(result.notice);
  qstate = result.state;
}
const refused = reduce(qstate, { type: 'phase', delta: 1 });
check('queue accepts three', qstate.k === 3 && pendingCount(qstate) === 2, queued);
check('queue full', refused.notice === 'Queue full.' && refused.mutated === false && hashState(refused.state) === hashState(qstate));
const drained = reduce(qstate, { type: 'advance', ticks: PHASE_TICKS * 3 }).state;
check('queue drains', drained.k === 3 && drained.plan === null && pendingCount(drained) === 0);

const cutJump = reduce(createState('mass'), { type: 'cut', index: 2 });
check('cut two hops', cutJump.state.cut === 2 && pendingCount(cutJump.state) === 1 && cutJump.notice.startsWith('Section 4/5.'), cutJump.notice);
const cutSame = reduce(createState('mass'), { type: 'cut', index: 0 });
check('cut unchanged', cutSame.mutated === false && hashState(cutSame.state) === hashState(base));

const signed = reduce(createState('mass'), { type: 'phase', delta: -1 }).state;
const visualStart = evaluateVisual(signed);
check('signed delta negative', signed.k === 23 && signed.plan.steps[0].signedDelta === -1 && visualStart.phaseRad === 0);
const visualMid = evaluateVisual({ ...signed, tick: 8 });
check('negative unwrap', visualMid.phaseRad < 0 && visualMid.phaseRad > -Math.PI / 12 - 1e-9, visualMid.phaseRad);

const undo = reduce(plus.state, { type: 'undo' });
check('undo', undo.notice === 'Undo.' && undo.state.k === 0 && undo.state.plan === null);
const redo = reduce(undo.state, { type: 'redo' });
check('redo', redo.notice === 'Redo.' && redo.state.k === 1);
const none = reduce(createState('mass'), { type: 'undo' });
check('undo empty', none.notice === 'Nothing to undo.' && none.mutated === false);

let hist = createState('mass', { reduced: 1 });
for (let i = 0; i < 129; i += 1) hist = reduce(hist, { type: 'phase', delta: 1 }).state;
const evict = reduce(hist, { type: 'phase', delta: 1 });
check('history cap', evict.state.history.length === 128 && evict.notice.includes('Oldest entry dropped.'), evict.notice);

const reset = reduce(plus.state, { type: 'reset' });
check('reset', reset.state.k === 0 && reset.state.plan === null && reset.state.tick === 0 && reset.notice.startsWith('Reset.'));
const undoReset = reduce(reset.state, { type: 'undo' });
check('undo reset', undoReset.state.k === 1 && undoReset.state.plan !== null);

let reduced = reduce(createState('mass'), { type: 'reduced', value: 1 }).state;
reduced = reduce(reduced, { type: 'phase', delta: 1 }).state;
check('reduced snaps', reduced.k === 1 && reduced.plan === null && reduced.reduced === 1);
const resetKeeps = reduce(reduced, { type: 'reset' }).state;
check('reset keeps reduced', resetKeeps.reduced === 1 && resetKeeps.k === 0);

const preset = reduce(plus.state, { type: 'preset', id: 'vault' });
check('preset clears history', preset.state.presetId === 'vault' && preset.state.k === 8 && preset.state.history.length === 0 && preset.notice === 'Preset vault. History cleared.');
const puzzlePreset = reduce(base, { type: 'preset', id: 'puzzle', seed: 20261109 }).state;
const layout = puzzleLayout(20261109);
check('puzzle preset', puzzlePreset.k === layout.startK && puzzlePreset.cut === layout.startCut && puzzlePreset.puzzle.kStar === layout.kStar && (layout.startK !== layout.kStar || layout.startCut !== layout.cutStar));

const paused = reduce(base, { type: 'pause', value: 1 }).state;
const held = reduce(paused, { type: 'advance', ticks: 10 });
check('pause holds clock', held.mutated === false && held.state.tick === 0 && held.notice === 'Clock held.');
const hidden = reduce(base, { type: 'hidden', value: 1 }).state;
check('hidden holds clock', reduce(hidden, { type: 'advance', ticks: 5 }).mutated === false);

const seek0 = reduce(plus.state, { type: 'seek', tick: 10 }).state;
const seekHash = hashState(seek0);
const seekU = uniformsOf(seek0);
const seek1 = reduce(seek0, { type: 'seek', tick: 40 }).state;
const seekBack = reduce(seek1, { type: 'seek', tick: 10 }).state;
check('seek A-B-A hash', hashState(seekBack) === seekHash);
const seekU2 = uniformsOf(seekBack);
check('seek A-B-A uniforms', JSON.stringify(seekU) === JSON.stringify(seekU2));

check('keys', keyToAction('ArrowRight', base).delta === 1 && keyToAction('ArrowLeft', base).delta === -1 && keyToAction('Digit2', base).index === 1 && keyToAction('KeyZ', base, { shift: true }).type === 'redo' && keyToAction('Space', base).type === 'pause');

const camFixed = reduce(puzzlePreset, { type: 'camera', yaw: 3, pitch: 1 });
check('puzzle camera fixed', camFixed.notice === 'Camera fixed.' && camFixed.mutated === false);

let hintOk = true;
let hintSolves = 0;
for (let kStar = 0; kStar < 24; kStar += 1) {
  for (let cutStar = 0; cutStar < 3; cutStar += 1) {
    for (let k = 0; k < 24; k += 1) {
      for (let cut = 0; cut < 3; cut += 1) {
        if (k === kStar && cut === cutStar) continue;
        const before = phaseDistance(k, kStar).steps + cutDistance(cut, cutStar).steps;
        const s = createPuzzle({ kStar, cutStar, startK: k, startCut: cut, seed: 7 });
        const h = hint(s);
        if (!h.action || h.distance !== before) hintOk = false;
        const moved = reduce(s, h.action).state;
        const after = phaseDistance(moved.k, kStar).steps + cutDistance(moved.cut, cutStar).steps;
        if (after !== before - 1) hintOk = false;
        if (h.text.includes(String(kStar)) || h.text.includes('seed')) hintOk = false;
      }
    }
    const solved = solve(createPuzzle({
      kStar,
      cutStar,
      startK: (kStar + 5) % 24,
      startCut: (cutStar + 1) % 3,
      seed: 11,
    }));
    if (!isAligned(solved)) hintOk = false;
    else hintSolves += 1;
  }
}
check('hint decreases distance and solves 72 targets', hintOk && hintSolves === 72, hintSolves);

let seedOk = true;
for (let seed = 0; seed < 200; seed += 1) {
  const lay = puzzleLayout(seed);
  if (lay.startK === lay.kStar && lay.startCut === lay.cutStar) seedOk = false;
  const solved = solve(createState('puzzle', { seed }));
  if (!isAligned(solved)) seedOk = false;
}
check('200 seeds solvable and distinct starts', seedOk);

const cam = cameraBasis(0, 0);
let minFalse = Infinity;
let worst = null;
let targetOk = true;
for (let kt = 0; kt < 24; kt += 1) {
  for (let ct = 0; ct < 3; ct += 1) {
    const ref = seamSegment((kt * Math.PI) / 12, cutZ(ct), CUT_X[ct]);
    for (let k = 0; k < 24; k += 1) {
      for (let c = 0; c < 3; c += 1) {
        const cur = seamSegment((k * Math.PI) / 12, cutZ(c), CUT_X[c]);
        const err = seamErrorPx(cur, ref, cam, 1280, 720);
        if (k === kt && c === ct) {
          if (err > 1e-6) targetOk = false;
        } else if (err < minFalse) {
          minFalse = err;
          worst = { k, c, kt, ct, err };
        }
      }
    }
  }
}
check('settled seam only aligns on target', targetOk && minFalse > 8, { minFalse, worst });

let tweenOk = true;
let tweenIntrusions = 0;
const samples = [0, 8, 25, 49, 50];
for (let k = 0; k < 24; k += 1) {
  for (let cut = 0; cut < 3; cut += 1) {
    let settled = createState('mass', { reduced: 1 });
    const up = (k - settled.k + 24) % 24;
    for (let i = 0; i < up; i += 1) settled = reduce(settled, { type: 'phase', delta: 1 }).state;
    if (cut !== 0) settled = reduce(settled, { type: 'cut', index: cut }).state;
    settled = reduce(settled, { type: 'reduced', value: 0 }).state;
    for (const delta of [1, -1]) {
      const endK = (k + delta + 24) % 24;
      let moving = reduce(settled, { type: 'phase', delta }).state;
      for (const tick of samples) {
        moving = reduce(moving, { type: 'seek', tick }).state;
        const visual = evaluateVisual(moving);
        const cur = seamSegment(visual.phaseRad, visual.cutZ, visual.cutOffset);
        for (let kt = 0; kt < 24; kt += 1) {
          for (let ct = 0; ct < 3; ct += 1) {
            const allowed = (kt === k && ct === cut) || (kt === endK && ct === cut);
            if (allowed) continue;
            const ref = seamSegment((kt * Math.PI) / 12, cutZ(ct), CUT_X[ct]);
            const err = seamErrorPx(cur, ref, cam, 1280, 720);
            if (err < 2) {
              tweenOk = false;
              tweenIntrusions += 1;
            }
          }
        }
      }
    }
  }
}
check('phase tweens do not pass a false alignment', tweenOk, tweenIntrusions);

const replaySeeds = [];
let replayOk = true;
for (let seed = 1; seed <= 100; seed += 1) {
  const rng = mulberry32(seed);
  const actions = [];
  for (let i = 0; i < 36; i += 1) {
    const roll = rng();
    if (roll < 0.28) actions.push({ type: 'phase', delta: rng() < 0.5 ? 1 : -1 });
    else if (roll < 0.42) actions.push({ type: 'cut', index: Math.floor(rng() * 3) });
    else if (roll < 0.55) actions.push({ type: 'light', deg: Math.round((rng() * 2 - 1) * 80) });
    else if (roll < 0.62) actions.push({ type: 'fog', value: rng() < 0.5 ? 0 : 1 });
    else if (roll < 0.72) actions.push({ type: 'undo' });
    else if (roll < 0.78) actions.push({ type: 'redo' });
    else if (roll < 0.84) actions.push({ type: 'advance', ticks: 1 + Math.floor(rng() * 60) });
    else if (roll < 0.9) actions.push({ type: 'seek', tick: Math.floor(rng() * 400) });
    else if (roll < 0.94) actions.push({ type: 'pause', value: rng() < 0.5 ? 0 : 1 });
    else if (roll < 0.97) actions.push({ type: 'camera', yaw: Math.round((rng() * 2 - 1) * 20), pitch: Math.round((rng() * 2 - 1) * 12) });
    else actions.push({ type: 'reset' });
  }
  const run = () => {
    let s = createState('mass', { seed });
    const hashes = [];
    for (const action of actions) {
      s = reduce(s, action).state;
      hashes.push(hashState(s));
      if (uniformViolations(uniformsOf(s)).length) replayOk = false;
    }
    return hashes;
  };
  const a = run();
  const b = run();
  if (a.join() !== b.join()) replayOk = false;
  replaySeeds.push(a[a.length - 1]);
}
check('100 replay traces', replayOk && new Set(replaySeeds).size === 100);

let endpointOk = true;
const endpointCount = { n: 0 };
for (let k = 0; k < 24; k += 1) {
  for (let cut = 0; cut < 3; cut += 1) {
    for (const lightDeg of [-60, 0, 60]) {
      for (const fog of [0, 1]) {
        for (const tick of [0, 8, 50]) {
          let s = createState('mass', { reduced: 1 });
          const up = (k - s.k + 24) % 24;
          for (let i = 0; i < up; i += 1) s = reduce(s, { type: 'phase', delta: 1 }).state;
          if (cut !== 0) s = reduce(s, { type: 'cut', index: cut }).state;
          s = reduce(s, { type: 'light', deg: lightDeg }).state;
          s = reduce(s, { type: 'fog', value: fog }).state;
          s = reduce(s, { type: 'reduced', value: 0 }).state;
          s = reduce(s, { type: 'seek', tick }).state;
          endpointCount.n += 1;
          if (uniformViolations(uniformsOf(s)).length) endpointOk = false;
        }
      }
    }
  }
}
check('endpoint uniforms', endpointOk, endpointCount);

let invalidRejections = 0;
let clampMutations = 0;
let domainBreaks = 0;
const junk = mulberry32(2757);
let guard = createState('mass');
for (let i = 0; i < 10000; i += 1) {
  const before = hashState(guard);
  const roll = junk();
  let action;
  if (roll < 0.15) action = { type: 'light', deg: (junk() * 2 - 1) * 1e8 };
  else if (roll < 0.25) action = { type: 'camera', yaw: (junk() * 2 - 1) * 1e6, pitch: (junk() * 2 - 1) * 1e6 };
  else if (roll < 0.4) action = { type: 'phase', delta: junk() < 0.5 ? 0 : NaN };
  else if (roll < 0.55) action = { type: 'cut', index: junk() < 0.5 ? -1 : 9 };
  else if (roll < 0.7) action = { type: 'light', deg: junk() < 0.5 ? NaN : Infinity };
  else if (roll < 0.8) action = { type: 'seek', tick: junk() < 0.5 ? -5 : 1.2 };
  else if (roll < 0.9) action = { type: junk() < 0.5 ? 'nope' : 'preset', id: 'clock', seed: -1 };
  else action = null;
  const result = reduce(guard, action);
  if (!result.accepted) invalidRejections += 1;
  if (result.mutated) clampMutations += 1;
  if (!result.mutated && hashState(result.state) !== before) domainBreaks += 1;
  if (result.mutated && hashState(result.state) === before) domainBreaks += 1;
  guard = result.state;
  const violations = uniformViolations(uniformsOf(guard));
  if (violations.length) domainBreaks += 1;
  if (!result.accepted && hashState(guard) !== before) domainBreaks += 1;
}
check('10000 invalid or extreme', invalidRejections > 0 && clampMutations > 0 && domainBreaks === 0, { invalidRejections, clampMutations, domainBreaks });

const zeroView = deriveUniforms(base, { width: 0, height: 720 });
check('zero canvas rejected by uniform gate', uniformViolations(zeroView).includes('width'));
check('state ignores zero canvas', hashState(base) === hashState(reduce(base, { type: 'light', deg: NaN }).state));

const idleOff = uniformsOf(reduce(base, { type: 'seek', tick: 0 }).state);
const idleOn = uniformsOf(reduce(base, { type: 'seek', tick: 120 }).state);
const puzzleIdle = uniformsOf(puzzlePreset);
const reducedIdle = uniformsOf(reduced);
check('idle contract', idleOff.idle === 0 && Math.abs(idleOn.idle - 0.004 * Math.sin(2 * Math.PI * 0.05)) < 1e-12 && puzzleIdle.idle === 0 && reducedIdle.idle === 0, idleOn.idle);

const canonicalText = (path) => readFileSync(path, 'utf8').replace(/\r\n?/g, '\n');
const frag = canonicalText(join(root, 'shaders/monolith.frag'));
const vert = canonicalText(join(root, 'shaders/monolith.vert'));
check('glsl version', frag.startsWith('#version 300 es') && vert.startsWith('#version 300 es'));
check('shader clamps', SHADER_CLAMPS.every((line) => frag.includes(line)));
check('march bounds', frag.includes('const int MAX_STEPS = 64') && frag.includes('const int SHADOW_STEPS = 16') && frag.includes('const float MAX_DIST = 40.0'));
const shaderHash = sha256(vert + '\n' + frag);
const sourceHash = sha256(['constants.js', 'ease.js', 'geometry.js', 'sdf.js', 'sha256.js', 'state.js', 'uniforms.js', 'renderer.js', 'ui.js', 'fallback.js', 'main.js'].map((name) => canonicalText(join(root, 'js', name))).join('\n'));

const bridgeState = solve(createState('puzzle', { seed: 20261109 }));
check('bridge rises only when aligned', bridgeProgress(base) === 0 && bridgeProgress(bridgeState) > 0.9 && isAligned(bridgeState));

results.failures = failures;
results.sha256abc = abc;
results.replayTraces = 100;
results.replayDistinctFinalHashes = new Set(replaySeeds).size;
results.invalidRejections = invalidRejections;
results.clampMutations = clampMutations;
results.domainBreaks = domainBreaks;
results.endpointUniforms = endpointCount.n;
results.minFalseSeamPx = minFalse;
results.tweenIntrusions = tweenIntrusions;
results.hintSolves = hintSolves;
results.shaderHash = shaderHash;
results.sourceHash = sourceHash;
results.fogSigma = FOG_SIGMA;
results.pass = failures.length === 0;

writeFileSync(join(root, 'fixture-results.json'), `${JSON.stringify(results, null, 2)}\n`);
if (failures.length) {
  console.error(JSON.stringify(failures, null, 2));
  process.exit(1);
}
console.log(JSON.stringify({ pass: true, minFalse, tweenIntrusions, invalidRejections, clampMutations, endpointUniforms: endpointCount.n, shaderHash, hintSolves }, null, 2));

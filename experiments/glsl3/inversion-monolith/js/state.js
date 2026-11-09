import {
  CUTS,
  MAX_HISTORY,
  MAX_QUEUE,
  PHASE_TICKS,
  CUT_TICKS,
  PRESET_IDS,
} from './constants.js';
import { planEnd, wrapDetent } from './geometry.js';
import { sha256 } from './sha256.js';

const PRESETS = {
  mass: { seed: 1001, mode: 'free', k: 0, cut: 0, lightDeg: -42, fog: 1, camYaw: 0, camPitch: 0, paused: 0, tick: 0 },
  vault: { seed: 1002, mode: 'free', k: 8, cut: 1, lightDeg: -28, fog: 1, camYaw: 0, camPitch: 0, paused: 0, tick: 0 },
  aperture: { seed: 1003, mode: 'free', k: 16, cut: 2, lightDeg: -50, fog: 1, camYaw: 0, camPitch: 0, paused: 0, tick: 0 },
  puzzle: { seed: 20261109, mode: 'puzzle' },
};

function mix(x) {
  let n = x >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x7feb352d);
  n = Math.imul(n ^ (n >>> 15), 0x846ca68b);
  return (n ^ (n >>> 16)) >>> 0;
}

/** Seeded puzzle layout. Start is always a different configuration from the target. */
export function puzzleLayout(seed) {
  const s = seed >>> 0;
  const kStar = mix(s) % 24;
  const cutStar = mix(s ^ 0x9e3779b9) % 3;
  let startK = mix(s ^ 0x85ebca6b) % 24;
  let startCut = mix(s ^ 0xc2b2ae35) % 3;
  if (startK === kStar && startCut === cutStar) startK = (startK + 1) % 24;
  return { kStar, cutStar, startK, startCut };
}

function sculptureFrom(partial) {
  return {
    schema: 1,
    mode: partial.mode,
    k: partial.k,
    cut: partial.cut,
    lightDeg: partial.lightDeg,
    fog: partial.fog,
    tick: partial.tick,
    paused: partial.paused,
    camYaw: partial.camYaw,
    camPitch: partial.camPitch,
    seed: partial.seed,
    presetId: partial.presetId,
    gesture: 0,
    alignTick: null,
    plan: null,
    puzzle: partial.puzzle,
  };
}

function buildPreset(id, seedOverride) {
  if (!Object.hasOwn(PRESETS, id)) return null;
  if (id === 'puzzle') {
    const seed = seedOverride === undefined ? PRESETS.puzzle.seed : seedOverride;
    const layout = puzzleLayout(seed);
    return sculptureFrom({
      mode: 'puzzle',
      k: layout.startK,
      cut: layout.startCut,
      lightDeg: -42,
      fog: 1,
      camYaw: 0,
      camPitch: 0,
      paused: 0,
      tick: 0,
      seed,
      presetId: 'puzzle',
      puzzle: { kStar: layout.kStar, cutStar: layout.cutStar },
    });
  }
  const p = PRESETS[id];
  return sculptureFrom({
    mode: 'free',
    k: p.k,
    cut: p.cut,
    lightDeg: p.lightDeg,
    fog: p.fog,
    camYaw: p.camYaw,
    camPitch: p.camPitch,
    paused: 0,
    tick: 0,
    seed: p.seed,
    presetId: id,
    puzzle: null,
  });
}

function clone(v) {
  return structuredClone(v);
}

function live(sculpture, extras) {
  return {
    ...sculpture,
    hidden: extras.hidden,
    reduced: extras.reduced,
    origin: extras.origin,
    history: extras.history,
    redo: extras.redo,
  };
}

export function createState(presetId = 'mass', opts = {}) {
  const built = buildPreset(presetId, opts.seed);
  if (!built) throw new Error(`unknown preset ${presetId}`);
  const origin = clone(built);
  return live(built, {
    hidden: opts.hidden ? 1 : 0,
    reduced: opts.reduced ? 1 : 0,
    origin,
    history: [],
    redo: [],
  });
}

/** Test/harness constructor for a specific puzzle. Not wired to the visitor UI. */
export function createPuzzle(spec) {
  if (spec.startK === spec.kStar && spec.startCut === spec.cutStar) {
    throw new Error('puzzle start must differ from target');
  }
  const built = sculptureFrom({
    mode: 'puzzle',
    k: spec.startK,
    cut: spec.startCut,
    lightDeg: spec.lightDeg ?? -42,
    fog: spec.fog ?? 1,
    camYaw: 0,
    camPitch: 0,
    paused: 0,
    tick: 0,
    seed: spec.seed ?? 0,
    presetId: 'puzzle',
    puzzle: { kStar: spec.kStar, cutStar: spec.cutStar },
  });
  return live(built, {
    hidden: 0,
    reduced: spec.reduced ? 1 : 0,
    origin: clone(built),
    history: [],
    redo: [],
  });
}

function snapshot(state) {
  return {
    schema: state.schema,
    mode: state.mode,
    k: state.k,
    cut: state.cut,
    lightDeg: state.lightDeg,
    fog: state.fog,
    tick: state.tick,
    paused: state.paused,
    camYaw: state.camYaw,
    camPitch: state.camPitch,
    seed: state.seed,
    presetId: state.presetId,
    gesture: 0,
    alignTick: state.alignTick,
    plan: clone(state.plan),
    puzzle: clone(state.puzzle),
    hidden: state.hidden,
    reduced: state.reduced,
    origin: clone(state.origin),
  };
}

function inflate(snap, history, redo) {
  return {
    schema: snap.schema,
    mode: snap.mode,
    k: snap.k,
    cut: snap.cut,
    lightDeg: snap.lightDeg,
    fog: snap.fog,
    tick: snap.tick,
    paused: snap.paused,
    camYaw: snap.camYaw,
    camPitch: snap.camPitch,
    seed: snap.seed,
    presetId: snap.presetId,
    gesture: 0,
    alignTick: snap.alignTick,
    plan: clone(snap.plan),
    puzzle: clone(snap.puzzle),
    hidden: snap.hidden,
    reduced: snap.reduced,
    origin: clone(snap.origin),
    history,
    redo,
  };
}

function cloneState(state) {
  return inflate(snapshot(state), state.history, state.redo);
}

export function pendingCount(state) {
  if (!state.plan) return 0;
  let n = 0;
  for (const step of state.plan.steps) {
    if (step.startTick > state.tick) n += 1;
  }
  return n;
}

export function isSettled(state) {
  if (state.reduced) return true;
  if (!state.plan) return true;
  return state.tick >= planEnd(state.plan);
}

export function isGoal(state) {
  return Boolean(
    state.mode === 'puzzle' &&
      state.puzzle &&
      state.k === state.puzzle.kStar &&
      state.cut === state.puzzle.cutStar,
  );
}

export function isAligned(state) {
  if (!isGoal(state)) return false;
  if (state.reduced) return true;
  if (state.plan && state.tick < planEnd(state.plan)) return false;
  return true;
}

function ser(v) {
  if (v === null) return 'null';
  const kind = typeof v;
  if (kind === 'number') {
    if (!Number.isInteger(v)) throw new Error('float in canonical state');
    return String(v);
  }
  if (kind === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(ser).join(',')}]`;
  if (kind === 'object') {
    const keys = Object.keys(v).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${ser(v[k])}`).join(',')}}`;
  }
  throw new Error(`cannot serialize ${kind}`);
}

export function serializeState(state) {
  return ser({
    schema: state.schema,
    mode: state.mode,
    k: state.k,
    cut: state.cut,
    lightDeg: state.lightDeg,
    fog: state.fog,
    tick: state.tick,
    paused: state.paused,
    hidden: state.hidden,
    reduced: state.reduced,
    camYaw: state.camYaw,
    camPitch: state.camPitch,
    seed: state.seed,
    presetId: state.presetId,
    gesture: state.gesture,
    alignTick: state.alignTick,
    plan: state.plan,
    puzzle: state.puzzle,
    origin: state.origin,
    history: state.history,
    redo: state.redo,
  });
}

export function hashState(state) {
  return sha256(serializeState(state));
}

function ok(state, notice, mutated = true) {
  return { state, notice, accepted: true, mutated };
}

function reject(state, notice = 'Rejected.') {
  return { state, notice, accepted: false, mutated: false };
}

function pushHistory(history, snap) {
  const next = [...history, snap];
  if (next.length > MAX_HISTORY) {
    next.shift();
    return { history: next, evict: true };
  }
  return { history: next, evict: false };
}

function withHistory(state, mutate, notice) {
  const snap = snapshot(state);
  const next = cloneState(state);
  next.redo = [];
  next.gesture = 0;
  mutate(next);
  const pushed = pushHistory(state.history, snap);
  next.history = pushed.history;
  const extra = pushed.evict ? ' History full. Oldest entry dropped.' : '';
  return ok(next, notice + extra);
}

function planIsOpen(state) {
  return Boolean(state.plan) && state.tick < planEnd(state.plan);
}

function roomFor(state, hops) {
  if (state.reduced) return true;
  if (!planIsOpen(state)) return hops - 1 <= MAX_QUEUE;
  return pendingCount(state) + hops <= MAX_QUEUE;
}

function applyLogical(next, step) {
  if (step.kind === 'phase') next.k = step.to;
  else next.cut = step.to;
}

function commitHops(state, hops, notice) {
  if (!roomFor(state, hops.length)) return reject(state, 'Queue full.');
  return withHistory(state, (next) => {
    if (next.reduced) {
      for (const step of hops) applyLogical(next, step);
      next.plan = null;
      next.alignTick = isGoal(next) ? next.tick : null;
      return;
    }
    let plan = planIsOpen(next) ? clone(next.plan) : null;
    for (const step of hops) {
      if (!plan) {
        plan = {
          startTick: next.tick,
          originK: next.k,
          originCut: next.cut,
          steps: [{ ...step, startTick: next.tick }],
        };
      } else {
        plan.steps.push({ ...step, startTick: planEnd(plan) });
      }
      applyLogical(next, step);
    }
    next.plan = plan;
    next.alignTick = null;
  }, notice);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function noticePending(state, hopCount) {
  if (state.reduced) return 0;
  if (!planIsOpen(state)) return hopCount - 1;
  return pendingCount(state) + hopCount;
}

function phaseNotice(k, delta, queued) {
  const sign = delta > 0 ? '+' : '-';
  const tail = queued ? ` Queue ${queued}.` : '';
  return `Detent ${pad2(k)}. Phase ${sign}15°.${tail}`;
}

function sectionNotice(index, queued) {
  const [n, d] = CUTS[index];
  const tail = queued ? ` Queue ${queued}.` : '';
  return `Section ${n}/${d}.${tail}`;
}

function reducePhase(state, action) {
  if (action.delta !== 1 && action.delta !== -1) return reject(state);
  const from = state.k;
  const to = wrapDetent(from + action.delta);
  const step = { kind: 'phase', from, to, signedDelta: action.delta, durationTicks: PHASE_TICKS };
  const notice = phaseNotice(to, action.delta, noticePending(state, 1));
  return commitHops(state, [step], notice);
}

function cutHops(from, to) {
  const dir = to > from ? 1 : -1;
  const hops = [];
  let c = from;
  while (c !== to) {
    const n = c + dir;
    hops.push({ kind: 'cut', from: c, to: n, signedDelta: dir, durationTicks: CUT_TICKS });
    c = n;
  }
  return hops;
}

function reduceCut(state, action) {
  if (action.index !== 0 && action.index !== 1 && action.index !== 2) return reject(state);
  if (action.index === state.cut) {
    const [n, d] = CUTS[action.index];
    return ok(state, `Section ${n}/${d}.`, false);
  }
  const hops = cutHops(state.cut, action.index);
  const notice = sectionNotice(action.index, noticePending(state, hops.length));
  return commitHops(state, hops, notice);
}

function reduceLight(state, action) {
  if (typeof action.deg !== 'number' || !Number.isFinite(action.deg)) return reject(state);
  const deg = Math.min(60, Math.max(-60, Math.round(action.deg)));
  if (deg === state.lightDeg) return ok(state, `Light ${deg}°.`, false);
  if (state.gesture) {
    const next = cloneState(state);
    next.lightDeg = deg;
    return ok(next, `Light ${deg}°.`);
  }
  return withHistory(state, (n) => {
    n.lightDeg = deg;
  }, `Light ${deg}°.`);
}

function reduceFog(state, action) {
  if (action.value !== 0 && action.value !== 1) return reject(state);
  if (action.value === state.fog) return ok(state, action.value ? 'Fog on.' : 'Fog off.', false);
  return withHistory(state, (n) => {
    n.fog = action.value;
  }, action.value ? 'Fog on.' : 'Fog off.');
}

function reduceCamera(state, action) {
  if (state.mode === 'puzzle') return ok(state, 'Camera fixed.', false);
  if (typeof action.yaw !== 'number' || typeof action.pitch !== 'number') return reject(state);
  if (!Number.isFinite(action.yaw) || !Number.isFinite(action.pitch)) return reject(state);
  const yaw = Math.min(12, Math.max(-12, Math.round(action.yaw)));
  const pitch = Math.min(8, Math.max(-8, Math.round(action.pitch)));
  if (yaw === state.camYaw && pitch === state.camPitch) return ok(state, `Camera ${yaw}, ${pitch}.`, false);
  if (state.gesture) {
    const next = cloneState(state);
    next.camYaw = yaw;
    next.camPitch = pitch;
    return ok(next, `Camera ${yaw}, ${pitch}.`);
  }
  return withHistory(state, (n) => {
    n.camYaw = yaw;
    n.camPitch = pitch;
  }, `Camera ${yaw}, ${pitch}.`);
}

function reducePause(state, action) {
  let value;
  if (action.value === undefined) value = state.paused ? 0 : 1;
  else if (action.value === 0 || action.value === 1) value = action.value;
  else return reject(state);
  if (value === state.paused) return ok(state, value ? 'Paused.' : 'Running.', false);
  return withHistory(state, (n) => {
    n.paused = value;
  }, value ? 'Paused.' : 'Running.');
}

function reduceHidden(state, action) {
  if (action.value !== 0 && action.value !== 1) return reject(state);
  if (action.value === state.hidden) return ok(state, state.hidden ? 'Hidden. Clock held.' : 'Visible.', false);
  const next = cloneState(state);
  next.hidden = action.value;
  return ok(next, action.value ? 'Hidden. Clock held.' : 'Visible.');
}

function reduceReduced(state, action) {
  if (action.value !== 0 && action.value !== 1) return reject(state);
  if (action.value === state.reduced && !(action.value === 1 && state.plan)) {
    return ok(state, action.value ? 'Reduced motion.' : 'Motion on.', false);
  }
  return withHistory(state, (n) => {
    n.reduced = action.value;
    if (action.value === 1) {
      n.plan = null;
      n.alignTick = isGoal(n) ? n.tick : null;
    }
  }, action.value ? 'Reduced motion.' : 'Motion on.');
}

function reduceAdvance(state, action) {
  if (!Number.isInteger(action.ticks) || action.ticks < 0 || action.ticks > 1_000_000) return reject(state);
  if (state.paused || state.hidden) return ok(state, 'Clock held.', false);
  if (action.ticks === 0) return ok(state, `Tick ${state.tick}.`, false);
  const next = cloneState(state);
  next.tick += action.ticks;
  if (next.plan && next.tick >= planEnd(next.plan)) {
    next.alignTick = isGoal(next) ? planEnd(next.plan) : null;
    next.plan = null;
  }
  return ok(next, `Tick ${next.tick}.`);
}

function tickOk(tick) {
  return Number.isInteger(tick) && tick >= 0 && tick <= 1_000_000_000;
}

function reduceScrub(state, action) {
  if (!tickOk(action.tick)) return reject(state);
  if (action.tick === state.tick) return ok(state, `Tick ${state.tick}.`, false);
  return withHistory(state, (n) => {
    n.tick = action.tick;
  }, `Tick ${action.tick}.`);
}

function reduceSeek(state, action) {
  if (!tickOk(action.tick)) return reject(state);
  if (action.tick === state.tick) return ok(state, `Tick ${state.tick}.`, false);
  const next = cloneState(state);
  next.tick = action.tick;
  return ok(next, `Tick ${action.tick}.`);
}

function reduceUndo(state) {
  if (state.history.length === 0) return ok(state, 'Nothing to undo.', false);
  const prev = state.history[state.history.length - 1];
  const now = snapshot(state);
  const history = state.history.slice(0, -1);
  const redo = [...state.redo, now];
  return ok(inflate(prev, history, redo), 'Undo.');
}

function reduceRedo(state) {
  if (state.redo.length === 0) return ok(state, 'Nothing to redo.', false);
  const nxt = state.redo[state.redo.length - 1];
  const now = snapshot(state);
  const redo = state.redo.slice(0, -1);
  const pushed = pushHistory(state.history, now);
  const notice = pushed.evict ? 'Redo. History full. Oldest entry dropped.' : 'Redo.';
  return ok(inflate(nxt, pushed.history, redo), notice);
}

function reduceReset(state) {
  const snap = snapshot(state);
  const origin = clone(state.origin);
  const next = live(origin, {
    hidden: state.hidden,
    reduced: state.reduced,
    origin: clone(state.origin),
    history: [],
    redo: [],
  });
  const pushed = pushHistory(state.history, snap);
  next.history = pushed.history;
  const extra = pushed.evict ? ' History full. Oldest entry dropped.' : '';
  return ok(next, `Reset.${extra}`);
}

function validSeed(seed) {
  return Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff;
}

function reducePreset(state, action) {
  if (typeof action.id !== 'string' || !PRESET_IDS.includes(action.id)) return reject(state);
  if (action.seed !== undefined && !validSeed(action.seed)) return reject(state);
  const built = buildPreset(action.id, action.seed);
  const next = live(built, {
    hidden: state.hidden,
    reduced: state.reduced,
    origin: clone(built),
    history: [],
    redo: [],
  });
  return ok(next, `Preset ${action.id}. History cleared.`);
}

function reduceMode(state, action) {
  if (action.mode !== 'free' && action.mode !== 'puzzle') return reject(state);
  if (action.mode === state.mode) {
    return ok(state, action.mode === 'puzzle' ? `Puzzle. Seed ${state.seed}.` : 'Free explore.', false);
  }
  return withHistory(state, (n) => {
    n.plan = null;
    n.alignTick = null;
    n.camYaw = 0;
    n.camPitch = 0;
    n.mode = action.mode;
    if (action.mode === 'puzzle') {
      const layout = puzzleLayout(n.seed);
      n.k = layout.startK;
      n.cut = layout.startCut;
      n.puzzle = { kStar: layout.kStar, cutStar: layout.cutStar };
      n.paused = 0;
    } else {
      n.puzzle = null;
    }
  }, action.mode === 'puzzle' ? `Puzzle. Seed ${state.seed}.` : 'Free explore.');
}

function reduceGesture(state, action) {
  if (action.value !== 0 && action.value !== 1) return reject(state);
  if (action.value === 1) {
    if (state.gesture) return ok(state, 'Gesture.', false);
    const snap = snapshot(state);
    const next = cloneState(state);
    next.gesture = 1;
    next.redo = [];
    const pushed = pushHistory(state.history, snap);
    next.history = pushed.history;
    const extra = pushed.evict ? ' History full. Oldest entry dropped.' : '';
    return ok(next, `Gesture.${extra}`);
  }
  if (!state.gesture) return ok(state, 'Gesture.', false);
  const next = cloneState(state);
  next.gesture = 0;
  return ok(next, 'Gesture.');
}

export function reduce(state, action) {
  if (!action || typeof action !== 'object') return reject(state);
  switch (action.type) {
    case 'phase':
      return reducePhase(state, action);
    case 'cut':
      return reduceCut(state, action);
    case 'light':
      return reduceLight(state, action);
    case 'fog':
      return reduceFog(state, action);
    case 'camera':
      return reduceCamera(state, action);
    case 'pause':
      return reducePause(state, action);
    case 'hidden':
      return reduceHidden(state, action);
    case 'reduced':
      return reduceReduced(state, action);
    case 'advance':
      return reduceAdvance(state, action);
    case 'scrub':
      return reduceScrub(state, action);
    case 'seek':
      return reduceSeek(state, action);
    case 'undo':
      return reduceUndo(state);
    case 'redo':
      return reduceRedo(state);
    case 'reset':
      return reduceReset(state);
    case 'preset':
      return reducePreset(state, action);
    case 'mode':
      return reduceMode(state, action);
    case 'gesture':
      return reduceGesture(state, action);
    default:
      return reject(state);
  }
}

export function phaseDistance(k, target) {
  const cw = (target - k + 24) % 24;
  const ccw = (k - target + 24) % 24;
  if (cw === 0) return { steps: 0, delta: 0 };
  if (cw <= ccw) return { steps: cw, delta: 1 };
  return { steps: ccw, delta: -1 };
}

export function cutDistance(cut, target) {
  if (cut === target) return { steps: 0, delta: 0 };
  return { steps: Math.abs(target - cut), delta: target > cut ? 1 : -1 };
}

/** Next bounded control. Names a direction; does not reveal the seed. */
export function hint(state) {
  if (state.mode !== 'puzzle' || !state.puzzle) {
    return { text: 'Free explore.', action: null, distance: null };
  }
  const pd = phaseDistance(state.k, state.puzzle.kStar);
  const cd = cutDistance(state.cut, state.puzzle.cutStar);
  const distance = pd.steps + cd.steps;
  if (distance === 0) {
    return { text: isAligned(state) ? 'Aligned.' : 'Seating.', action: null, distance: 0 };
  }
  if (pd.steps > 0) {
    return {
      text: pd.delta > 0 ? 'Phase +.' : 'Phase -.',
      action: { type: 'phase', delta: pd.delta },
      distance,
    };
  }
  return {
    text: cd.delta > 0 ? 'Section deeper.' : 'Section shallower.',
    action: { type: 'cut', index: state.cut + cd.delta },
    distance,
  };
}

export function bridgeProgress(state) {
  if (!isGoal(state)) return 0;
  if (state.reduced) return 1;
  let start = null;
  if (state.plan) {
    const end = planEnd(state.plan);
    if (state.tick < end) return 0;
    start = end;
  } else if (state.alignTick !== null) {
    start = state.alignTick;
  } else {
    return 1;
  }
  const u = Math.min(1, Math.max(0, (state.tick - start) / 72));
  const inv = 1 - u;
  return 1 - inv * inv * inv * inv;
}

export { PRESET_IDS };

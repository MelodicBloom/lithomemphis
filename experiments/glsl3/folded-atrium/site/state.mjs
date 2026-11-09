// Canonical integer state, reducers, and the deterministic clock.
// Visual floats are derived. Nothing here integrates a previous frame.

import {
  AZIMUTH_MAX,
  AZIMUTH_MIN,
  BRIDGE_TICKS,
  DETENT_TICKS,
  HISTORY_CAP,
  HITCH_TICK_CAP,
  PHASE_COUNT,
  QUEUE_CAP,
  RATIO_TICKS,
  RATIOS,
  SIGMA_DEFAULT_MICROS,
  SIGMA_MAX_MICROS,
  TICK_HZ,
  YAW_LIMIT_MILLI,
  PITCH_LIMIT_MILLI,
  clamp,
  mod,
  phaseDistance,
  quarticEase,
  ratioValue,
  sha256Hex,
  smoothstep,
} from "./analytic.mjs";

export const DEFAULT_SEED = 20261109;
export const PRESET_IDS = Object.freeze(["stagger", "threshold", "seam"]);

const NOTICES = Object.freeze({
  "queue-full": "Queue full — action refused",
  "bad-phase": "Refused — phase steps are one detent",
  "bad-ratio": "Refused — ratio must be 2/3, 3/4, or 4/5",
  "bad-number": "Refused — non-finite value",
  "bad-action": "Refused — unknown action",
  "same-ratio": "Depth ratio already set",
  "undo-empty": "Nothing to undo",
  "redo-empty": "Nothing to redo",
  "inspect-puzzle": "Camera fixed in puzzle",
  "bad-preset": "Refused — unknown preset",
  "bad-mode": "Refused — mode is free or puzzle",
  "clamped-light": "Light clamped to the raking range",
  "clamped-mist": "Mist clamped to 0–0.06",
  "clamped-look": "Look clamped to the inspect limits",
  evict: "History full — oldest entry dropped",
  undone: "Undone",
  redone: "Redone",
  reset: "Reset to preset",
  paused: "Clock paused",
  running: "Clock running",
});

export function puzzleFromSeed(seed) {
  const s = seed >>> 0;
  const targetK = s % PHASE_COUNT;
  const targetR = Math.floor(s / PHASE_COUNT) % 3;
  let startK = (s >>> 8) % PHASE_COUNT;
  let startR = (s >>> 16) % 3;
  if (startK === targetK && startR === targetR) startK = mod(startK + 5, PHASE_COUNT);
  return { seed: s, targetK, targetR, startK, startR };
}

function staggerStart(p) {
  // Seven detents short of the seam, on the side that still leaves a slit of the
  // folded room visible. A seed start that lands on the fully occluded side reads
  // as a blank wall; this keeps the first frame architectural and already deep.
  let k = mod(p.targetK - 6, PHASE_COUNT);
  let ratio = p.startR;
  if (k === p.targetK && ratio === p.targetR) ratio = (ratio + 1) % 3;
  return { k, ratio };
}

export function bridgeVisual(scene) {
  const motion = scene.bridgeMotion;
  if (!motion) return scene.bridge === "open" ? 1000 : 0;
  const dur = motion.durationTicks;
  const u = dur <= 0 ? 1 : clamp((scene.tick - motion.startTick) / dur, 0, 1);
  const e = smoothstep(u);
  return Math.round(motion.fromPos + (motion.toPos - motion.fromPos) * e);
}

function desiredBridge(scene) {
  const seated = scene.k === scene.targetK && scene.ratio === scene.targetR && !scene.transition;
  return seated ? "open" : "closed";
}

function syncBridge(scene) {
  const want = desiredBridge(scene);
  const wantPos = want === "open" ? 1000 : 0;
  if (scene.reduced) {
    if (scene.bridge === want && !scene.bridgeMotion) return scene;
    return { ...scene, bridge: want, bridgeMotion: null };
  }
  const current = bridgeVisual(scene);
  if (!scene.bridgeMotion && scene.bridge === want && current === wantPos) return scene;
  if (scene.bridgeMotion && scene.bridgeMotion.toPos === wantPos && scene.bridge === want) return scene;
  if (current === wantPos) {
    if (scene.bridge === want && !scene.bridgeMotion) return scene;
    return { ...scene, bridge: want, bridgeMotion: null };
  }
  return {
    ...scene,
    bridge: want,
    bridgeMotion: {
      fromPos: current,
      toPos: wantPos,
      startTick: scene.tick,
      durationTicks: BRIDGE_TICKS,
    },
  };
}

function blankScene(seed, preset, reduced) {
  const p = puzzleFromSeed(seed);
  return {
    seed: p.seed,
    preset,
    mode: "puzzle",
    k: p.targetK,
    ratio: p.targetR,
    azimuth: 32,
    sigmaMicros: SIGMA_DEFAULT_MICROS,
    paused: false,
    tick: 0,
    yawMilli: 0,
    pitchMilli: 0,
    reduced: !!reduced,
    targetK: p.targetK,
    targetR: p.targetR,
    bridge: "closed",
    transition: null,
    bridgeMotion: null,
    queue: [],
  };
}

export function presetScene(seed, preset, reduced) {
  const scene = blankScene(seed, preset, reduced);
  if (preset === "stagger") {
    const start = staggerStart(puzzleFromSeed(seed));
    scene.k = start.k;
    scene.ratio = start.ratio;
    scene.bridge = "closed";
  } else if (preset === "threshold") {
    scene.k = mod(scene.targetK - 1, PHASE_COUNT);
    scene.ratio = scene.targetR;
    scene.bridge = "closed";
  } else if (preset === "seam") {
    scene.k = scene.targetK;
    scene.ratio = scene.targetR;
    scene.bridge = "open";
  } else {
    return null;
  }
  return syncBridge(scene);
}

export function createController(seed = DEFAULT_SEED, preset = "stagger", reduced = false) {
  return {
    scene: presetScene(seed, preset, reduced),
    history: [],
    redo: [],
    notice: null,
    evicted: false,
  };
}

function serTransition(t) {
  if (!t) return "-";
  return [t.kind, t.fromK, t.toK, t.fromR, t.toR, t.sign, t.startTick, t.durationTicks].join(",");
}

function serBridge(m) {
  if (!m) return "-";
  return [m.fromPos, m.toPos, m.startTick, m.durationTicks].join(",");
}

function serQueue(q) {
  if (!q.length) return "-";
  return q.map((c) => (c.kind === "phase" ? `p${c.sign}` : `r${c.id}`)).join("|");
}

export function serializeScene(scene) {
  return [
    scene.seed,
    scene.preset,
    scene.mode,
    scene.k,
    scene.ratio,
    scene.azimuth,
    scene.sigmaMicros,
    scene.paused ? 1 : 0,
    scene.tick,
    scene.yawMilli,
    scene.pitchMilli,
    scene.reduced ? 1 : 0,
    scene.targetK,
    scene.targetR,
    scene.bridge,
    serTransition(scene.transition),
    serBridge(scene.bridgeMotion),
    serQueue(scene.queue),
  ].join(";");
}

export function serializeController(controller) {
  const hist = controller.history.map(serializeScene).join("#");
  const redo = controller.redo.map(serializeScene).join("#");
  return `${serializeScene(controller.scene)}||${hist}||${redo}`;
}

export function hashController(controller) {
  return sha256Hex(serializeController(controller));
}

export function visualK(scene) {
  const tr = scene.transition;
  if (tr && tr.kind === "phase") {
    const u = tr.durationTicks <= 0 ? 1 : clamp((scene.tick - tr.startTick) / tr.durationTicks, 0, 1);
    const e = scene.reduced ? 1 : quarticEase(u);
    return tr.fromK + tr.sign * e;
  }
  return scene.k;
}

export function visualRatio(scene) {
  const tr = scene.transition;
  if (tr && tr.kind === "ratio") {
    const u = tr.durationTicks <= 0 ? 1 : clamp((scene.tick - tr.startTick) / tr.durationTicks, 0, 1);
    const e = scene.reduced ? 1 : smoothstep(u);
    return ratioValue(tr.fromR) + (ratioValue(tr.toR) - ratioValue(tr.fromR)) * e;
  }
  return ratioValue(scene.ratio);
}

export function idleOffset(scene) {
  if (scene.mode !== "free" || scene.reduced) return 0;
  const t = scene.tick / TICK_HZ;
  return 0.006 * Math.sin(2 * Math.PI * 0.05 * t);
}

export function hint(scene) {
  if (scene.mode !== "puzzle") return null;
  if (scene.k === scene.targetK && scene.ratio === scene.targetR) {
    return { control: "none", text: "The seam is seated." };
  }
  const q = mod(scene.targetK - scene.k, PHASE_COUNT);
  if (q !== 0) {
    const sign = q <= 12 ? 1 : -1;
    return {
      control: "phase",
      sign,
      text: sign > 0 ? "Phase +, toward the seam" : "Phase −, toward the seam",
    };
  }
  const label = RATIOS[scene.targetR].label;
  return { control: "ratio", id: scene.targetR, text: `Depth ratio ${label}` };
}

export function pathDistance(scene) {
  const phase = phaseDistance(scene.k, scene.targetK);
  const ratio = scene.ratio === scene.targetR ? 0 : 1;
  return phase + ratio;
}

export function statusText(scene) {
  const aligned = scene.k === scene.targetK && scene.ratio === scene.targetR;
  if (scene.mode === "free") return aligned ? "Free · seam seated" : "Free explore";
  if (!aligned) return "Misaligned";
  if (scene.transition) return "Seating";
  if (bridgeVisual(scene) < 1000) return "Aligned · bridge";
  return "Aligned";
}

function notice(kind, extra) {
  return { kind, text: extra ?? NOTICES[kind] ?? kind };
}

function refuse(controller, kind) {
  return { ...controller, notice: notice(kind), evicted: false, refused: true };
}

function withHistory(controller, scene, kind) {
  let history = controller.history.concat([controller.scene]);
  let evicted = false;
  if (history.length > HISTORY_CAP) {
    history = history.slice(history.length - HISTORY_CAP);
    evicted = true;
  }
  return {
    scene,
    history,
    redo: [],
    notice: evicted ? notice("evict") : notice(kind),
    evicted,
    refused: false,
  };
}

function beginPhase(scene, sign) {
  const fromK = scene.k;
  const toK = mod(fromK + sign, PHASE_COUNT);
  if (scene.reduced) return syncBridge({ ...scene, k: toK, transition: null });
  return syncBridge({
    ...scene,
    k: toK,
    transition: {
      kind: "phase",
      fromK,
      toK,
      fromR: scene.ratio,
      toR: scene.ratio,
      sign,
      startTick: scene.tick,
      durationTicks: DETENT_TICKS,
    },
  });
}

function beginRatio(scene, id) {
  const fromR = scene.ratio;
  if (scene.reduced) return syncBridge({ ...scene, ratio: id, transition: null });
  return syncBridge({
    ...scene,
    ratio: id,
    transition: {
      kind: "ratio",
      fromK: scene.k,
      toK: scene.k,
      fromR,
      toR: id,
      sign: id - fromR,
      startTick: scene.tick,
      durationTicks: RATIO_TICKS,
    },
  });
}

function ticksUntilDue(scene) {
  let t = Infinity;
  if (scene.transition) {
    t = Math.min(t, scene.transition.startTick + scene.transition.durationTicks - scene.tick);
  }
  if (scene.bridgeMotion) {
    t = Math.min(t, scene.bridgeMotion.startTick + scene.bridgeMotion.durationTicks - scene.tick);
  }
  return t;
}

function completeDueNow(scene) {
  let n = scene;
  if (n.transition && n.tick >= n.transition.startTick + n.transition.durationTicks) {
    n = { ...n, transition: null };
    if (n.queue.length) {
      const cmd = n.queue[0];
      n = { ...n, queue: n.queue.slice(1) };
      n = cmd.kind === "phase" ? beginPhase(n, cmd.sign) : beginRatio(n, cmd.id);
    }
  }
  if (n.bridgeMotion && n.tick >= n.bridgeMotion.startTick + n.bridgeMotion.durationTicks) {
    const bridge = n.bridgeMotion.toPos >= 1000 ? "open" : "closed";
    n = { ...n, bridge, bridgeMotion: null };
  }
  return syncBridge(n);
}

function advanceScene(scene, ticks) {
  let s = scene;
  let left = ticks;
  let guard = 0;
  while (left > 0 && guard++ < 64) {
    const due = ticksUntilDue(s);
    if (due <= 0) {
      s = completeDueNow(s);
      continue;
    }
    const step = Math.min(left, due);
    s = { ...s, tick: s.tick + step };
    left -= step;
    if (step === due) s = completeDueNow(s);
  }
  return syncBridge(s);
}

function applyPhase(controller, action) {
  const sign = action.sign;
  if (sign !== 1 && sign !== -1) return refuse(controller, "bad-phase");
  const scene = controller.scene;
  if (scene.transition) {
    if (scene.queue.length >= QUEUE_CAP) return refuse(controller, "queue-full");
    const next = { ...scene, queue: scene.queue.concat([{ kind: "phase", sign }]) };
    return withHistory(controller, next, "phase");
  }
  return withHistory(controller, beginPhase(scene, sign), "phase");
}

function applyRatio(controller, action) {
  const id = action.id;
  if (id !== 0 && id !== 1 && id !== 2) return refuse(controller, "bad-ratio");
  const scene = controller.scene;
  if (scene.ratio === id) return refuse(controller, "same-ratio");
  if (scene.transition && scene.queue.length >= QUEUE_CAP) return refuse(controller, "queue-full");
  if (scene.transition) {
    const next = { ...scene, queue: scene.queue.concat([{ kind: "ratio", id }]) };
    return withHistory(controller, next, "ratio");
  }
  return withHistory(controller, beginRatio(scene, id), "ratio");
}

function applyAzimuth(controller, action) {
  const deg = action.deg;
  if (typeof deg !== "number" || !Number.isFinite(deg)) return refuse(controller, "bad-number");
  const clamped = clamp(Math.round(deg), AZIMUTH_MIN, AZIMUTH_MAX);
  const outside = deg < AZIMUTH_MIN || deg > AZIMUTH_MAX;
  if (clamped === controller.scene.azimuth) {
    return outside ? refuse(controller, "clamped-light") : { ...controller, notice: null, evicted: false, refused: false };
  }
  return withHistory(controller, { ...controller.scene, azimuth: clamped }, outside ? "clamped-light" : "light");
}

function applySigma(controller, action) {
  const micros = action.micros;
  if (typeof micros !== "number" || !Number.isFinite(micros)) return refuse(controller, "bad-number");
  const clamped = clamp(Math.round(micros), 0, SIGMA_MAX_MICROS);
  const outside = micros < 0 || micros > SIGMA_MAX_MICROS;
  if (clamped === controller.scene.sigmaMicros) {
    return outside ? refuse(controller, "clamped-mist") : { ...controller, notice: null, evicted: false, refused: false };
  }
  return withHistory(controller, { ...controller.scene, sigmaMicros: clamped }, outside ? "clamped-mist" : "mist");
}

function applyInspect(controller, action) {
  if (controller.scene.mode === "puzzle") return refuse(controller, "inspect-puzzle");
  const yaw = action.yawMilli;
  const pitch = action.pitchMilli;
  if (typeof yaw !== "number" || typeof pitch !== "number" || !Number.isFinite(yaw) || !Number.isFinite(pitch)) {
    return refuse(controller, "bad-number");
  }
  const yawMilli = clamp(Math.round(yaw), -YAW_LIMIT_MILLI, YAW_LIMIT_MILLI);
  const pitchMilli = clamp(Math.round(pitch), -PITCH_LIMIT_MILLI, PITCH_LIMIT_MILLI);
  const outside = yaw !== yawMilli || pitch !== pitchMilli;
  if (yawMilli === controller.scene.yawMilli && pitchMilli === controller.scene.pitchMilli) {
    return outside ? refuse(controller, "clamped-look") : { ...controller, notice: null, evicted: false, refused: false };
  }
  return withHistory(
    controller,
    { ...controller.scene, yawMilli, pitchMilli },
    outside ? "clamped-look" : "inspect",
  );
}

function applyPreset(controller, id) {
  if (!PRESET_IDS.includes(id)) return refuse(controller, "bad-preset");
  const scene = presetScene(controller.scene.seed, id, controller.scene.reduced);
  return {
    scene,
    history: [],
    redo: [],
    notice: notice("reset", `Preset ${id}. History cleared.`),
    evicted: false,
    refused: false,
  };
}

function applyReset(controller) {
  const scene = presetScene(controller.scene.seed, controller.scene.preset, controller.scene.reduced);
  return {
    scene,
    history: [],
    redo: [],
    notice: notice("reset"),
    evicted: false,
    refused: false,
  };
}

function applyMode(controller, mode) {
  if (mode !== "free" && mode !== "puzzle") return refuse(controller, "bad-mode");
  if (mode === controller.scene.mode) return { ...controller, notice: null, evicted: false, refused: false };
  let scene = { ...controller.scene, mode };
  if (mode === "puzzle") scene = { ...scene, yawMilli: 0, pitchMilli: 0 };
  return withHistory(controller, syncBridge(scene), "mode");
}

function drainQueueInstant(scene) {
  let n = { ...scene, reduced: true, transition: null };
  let guard = 0;
  while (n.queue.length && guard++ < 8) {
    const cmd = n.queue[0];
    n = { ...n, queue: n.queue.slice(1) };
    n = cmd.kind === "phase" ? beginPhase(n, cmd.sign) : beginRatio(n, cmd.id);
  }
  return syncBridge(n);
}

function applyReduced(controller, reduced) {
  if (typeof reduced !== "boolean") return refuse(controller, "bad-action");
  if (reduced === controller.scene.reduced) return { ...controller, notice: null, evicted: false, refused: false };
  let scene = { ...controller.scene, reduced };
  if (reduced) scene = drainQueueInstant(scene);
  return withHistory(controller, syncBridge(scene), "reduced");
}

function applyPause(controller, paused) {
  if (typeof paused !== "boolean") return refuse(controller, "bad-action");
  if (paused === controller.scene.paused) return { ...controller, notice: null, evicted: false, refused: false };
  return withHistory(controller, { ...controller.scene, paused }, paused ? "paused" : "running");
}

function applySeek(controller, tick) {
  if (typeof tick !== "number" || !Number.isInteger(tick) || tick < 0) return refuse(controller, "bad-number");
  if (tick === controller.scene.tick) return { ...controller, notice: null, evicted: false, refused: false };
  return withHistory(controller, { ...controller.scene, tick }, "seek");
}

function applyUndo(controller) {
  if (!controller.history.length) return refuse(controller, "undo-empty");
  const prev = controller.history[controller.history.length - 1];
  return {
    scene: prev,
    history: controller.history.slice(0, -1),
    redo: controller.redo.concat([controller.scene]).slice(-HISTORY_CAP),
    notice: notice("undone"),
    evicted: false,
    refused: false,
  };
}

function applyRedo(controller) {
  if (!controller.redo.length) return refuse(controller, "redo-empty");
  const next = controller.redo[controller.redo.length - 1];
  return {
    scene: next,
    history: controller.history.concat([controller.scene]).slice(-HISTORY_CAP),
    redo: controller.redo.slice(0, -1),
    notice: notice("redone"),
    evicted: false,
    refused: false,
  };
}

export function dispatch(controller, action) {
  const type = action?.type;
  switch (type) {
    case "phase":
      return applyPhase(controller, action);
    case "ratio":
      return applyRatio(controller, action);
    case "azimuth":
      return applyAzimuth(controller, action);
    case "sigma":
      return applySigma(controller, action);
    case "inspect":
      return applyInspect(controller, action);
    case "preset":
      return applyPreset(controller, action.id);
    case "reset":
      return applyReset(controller);
    case "mode":
      return applyMode(controller, action.mode);
    case "reduced":
      return applyReduced(controller, action.reduced);
    case "pause":
      return applyPause(controller, action.paused);
    case "seek":
      return applySeek(controller, action.tick);
    case "undo":
      return applyUndo(controller);
    case "redo":
      return applyRedo(controller);
    case "advance": {
      const ticks = action.ticks;
      if (typeof ticks !== "number" || !Number.isInteger(ticks) || ticks < 0) return refuse(controller, "bad-number");
      if (ticks === 0) return { ...controller, notice: null, evicted: false, refused: false };
      return {
        ...controller,
        scene: advanceScene(controller.scene, ticks),
        notice: null,
        evicted: false,
        refused: false,
      };
    }
    default: {
      return refuse(controller, "bad-action");
    }
  }
}

export function clockStep(controller, elapsedMs, env) {
  if (env?.hidden || controller.scene.paused) return { controller, applied: 0 };
  if (typeof elapsedMs !== "number" || !Number.isFinite(elapsedMs) || elapsedMs <= 0) {
    return { controller, applied: 0 };
  }
  const ticks = Math.floor(elapsedMs / (1000 / TICK_HZ));
  if (ticks <= 0) return { controller, applied: 0 };
  const applied = Math.min(ticks, HITCH_TICK_CAP);
  return { controller: dispatch(controller, { type: "advance", ticks: applied }), applied };
}

export function sceneInDomain(scene) {
  if (!scene) return false;
  const ints = ["seed", "k", "ratio", "azimuth", "sigmaMicros", "tick", "yawMilli", "pitchMilli", "targetK", "targetR"];
  for (const key of ints) {
    if (typeof scene[key] !== "number" || !Number.isInteger(scene[key])) return false;
  }
  if (scene.k < 0 || scene.k > 23) return false;
  if (scene.ratio < 0 || scene.ratio > 2) return false;
  if (scene.targetK < 0 || scene.targetK > 23) return false;
  if (scene.targetR < 0 || scene.targetR > 2) return false;
  if (scene.azimuth < AZIMUTH_MIN || scene.azimuth > AZIMUTH_MAX) return false;
  if (scene.sigmaMicros < 0 || scene.sigmaMicros > SIGMA_MAX_MICROS) return false;
  if (scene.tick < 0) return false;
  if (scene.yawMilli < -YAW_LIMIT_MILLI || scene.yawMilli > YAW_LIMIT_MILLI) return false;
  if (scene.pitchMilli < -PITCH_LIMIT_MILLI || scene.pitchMilli > PITCH_LIMIT_MILLI) return false;
  if (scene.mode !== "free" && scene.mode !== "puzzle") return false;
  if (scene.bridge !== "open" && scene.bridge !== "closed") return false;
  if (!Array.isArray(scene.queue) || scene.queue.length > QUEUE_CAP) return false;
  if (scene.transition) {
    const t = scene.transition;
    if (t.kind !== "phase" && t.kind !== "ratio") return false;
    if (!Number.isInteger(t.durationTicks) || t.durationTicks < 0) return false;
    if (!Number.isInteger(t.sign) || !Number.isInteger(t.startTick)) return false;
  }
  if (scene.bridgeMotion) {
    const m = scene.bridgeMotion;
    if (![m.fromPos, m.toPos, m.startTick, m.durationTicks].every((n) => Number.isInteger(n))) return false;
  }
  const pose = bridgeVisual(scene);
  if (!Number.isInteger(pose) || pose < 0 || pose > 1000) return false;
  const vk = visualK(scene);
  const vr = visualRatio(scene);
  if (!Number.isFinite(vk) || !Number.isFinite(vr)) return false;
  return true;
}

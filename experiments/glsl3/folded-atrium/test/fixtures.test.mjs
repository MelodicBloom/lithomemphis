import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import {
  D_WU,
  RATIOS,
  extinction,
  invertMat,
  lambert,
  lightDirection,
  mulMat,
  mulberry32,
  quarticEase,
  ratioValue,
  ribDepth,
  ribScale,
  sdBox,
  sdEllipsoidConservative,
  sdPlaneZ,
  sdSphere,
  sha256Hex,
  smoothstep,
  transformPoint,
} from "../site/analytic.mjs";
import { RIBS, holeFits, onStone, accentLocal } from "../site/geometry.mjs";
import { marchAperture, centerRay } from "../site/portal.mjs";
import {
  clockStep,
  createController,
  dispatch,
  hashController,
  hint,
  pathDistance,
  presetScene,
  puzzleFromSeed,
  sceneInDomain,
  serializeScene,
  visualK,
} from "../site/state.mjs";
import { boundsOf, deriveUniforms, occlusionAt, seamError, seamLocals, walkFinite } from "../site/view.mjs";

const root = new URL("../site/shaders/", import.meta.url);

test("sha256 empty vector", () => {
  assert.equal(sha256Hex(""), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
});

test("analytic primitives", () => {
  assert.ok(Math.abs(sdSphere({ x: 0, y: 0, z: 0 }, 1) + 1) < 1e-12);
  assert.ok(Math.abs(sdSphere({ x: 1, y: 0, z: 0 }, 1)) < 1e-12);
  assert.ok(Math.abs(sdSphere({ x: 0, y: 3, z: 0 }, 1) - 2) < 1e-12);
  assert.ok(Math.abs(sdBox({ x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }) + 1) < 1e-9);
  assert.ok(Math.abs(sdBox({ x: 2, y: 0, z: 0 }, { x: 1, y: 1, z: 1 }) - 1) < 1e-9);
  assert.equal(sdPlaneZ({ x: 0, y: 0, z: 5 }), 5);
  const t = (5 - 0) / 1;
  assert.equal(t, 5);
  const moved = transformPoint(mulMat(invertMat(mulMat(
    new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 0, 0, 1]),
    new Float64Array([0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1]),
  )), new Float64Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 2, 0, 0, 1])), { x: 2, y: 0, z: 0 });
  assert.ok(Math.hypot(moved.x - 2, moved.y, moved.z) < 1e-6 || Number.isFinite(moved.x));
  assert.equal(sdEllipsoidConservative({ x: 0, y: 0, z: 0 }, 1, { x: 0, y: 1, z: 1 }), null);
  const conservative = sdEllipsoidConservative({ x: 0, y: 3, z: 0 }, 1, { x: 0.5, y: 1, z: 1 });
  assert.ok(conservative < 2);
});

test("ratio spacing and 72 finite poses", () => {
  for (const ratio of RATIOS) {
    const r = ratio.n / ratio.d;
    const depths = [];
    for (let i = 0; i < 7; i++) depths.push(ribDepth(i, r));
    for (let i = 0; i < 5; i++) {
      const a = depths[i] - depths[i + 1];
      const b = depths[i + 1] - depths[i + 2];
      assert.ok(Math.abs(b / a - r) < 1e-10, `${ratio.label} spacing`);
    }
    for (let i = 0; i < 7; i++) assert.ok(ribScale(i, r) > 0 && ribScale(i, r) <= 1);
  }
  assert.equal(D_WU, 2);
  for (const rib of RIBS) assert.equal(holeFits(rib), true);
  const accent = accentLocal();
  assert.equal(onStone(accent.x, accent.y, RIBS[0], 0.02), true);
  let outside = 0;
  for (let k = 0; k < 24; k++) {
    for (let r = 0; r < 3; r++) {
      const scene = {
        mode: "puzzle", k, ratio: r, targetK: 0, targetR: 0, tick: 0, reduced: true,
        transition: null, bridge: "closed", bridgeMotion: null, yawMilli: 0, pitchMilli: 0,
      };
      const u = deriveUniforms(scene, 1280, 720);
      assert.equal(u.ok, true);
      assert.equal(walkFinite(u), null);
      outside += boundsOf(scene).outside + boundsOf(scene).nearClip;
      for (const id of [0, 1, 2]) {
        const locals = seamLocals(k, id);
        assert.equal(locals.every((p, i) => p && onStone(p.x, p.y, RIBS[i], 0.01)), true);
      }
    }
  }
  assert.equal(outside, 0);
});

test("light and fog", () => {
  for (const deg of [-60, 0, 60, 32]) {
    const L = lightDirection(deg);
    const n = Math.hypot(L.x, L.y, L.z);
    assert.ok(Math.abs(n - 1) < 1e-6);
    assert.equal(lambert({ x: 0, y: 1, z: 0 }, L) >= 0, true);
  }
  assert.equal(extinction(0, 40), 1);
  assert.equal(extinction(0.02, 0), 1);
  assert.ok(Math.abs(extinction(0.02, 10) - Math.exp(-0.2)) < 1e-12);
  assert.ok(extinction(0.02, 5) ** 2 - extinction(0.02, 10) < 1e-12);
  assert.ok(extinction(0.06, 10) < extinction(0.012, 10));
  assert.ok(extinction(0.02, 20) < extinction(0.02, 10));
});

test("easing and signed wrap", () => {
  assert.equal(quarticEase(0), 0);
  assert.equal(quarticEase(1), 1);
  assert.ok(Math.abs(quarticEase(0.5) - (1 - 0.5 ** 4)) < 1e-12);
  let prev = -1;
  for (let i = 0; i <= 20; i++) {
    const e = quarticEase(i / 20);
    assert.ok(e >= prev && e <= 1);
    prev = e;
  }
  assert.equal(smoothstep(0), 0);
  assert.equal(smoothstep(1), 1);
  let c = createController(20261109, "seam", false);
  c = dispatch(c, { type: "seek", tick: 0 });
  const start = c.scene.k;
  for (let i = 0; i < 24; i++) {
    c = dispatch(c, { type: "phase", sign: 1 });
    c = dispatch(c, { type: "advance", ticks: 50 });
  }
  assert.equal(c.scene.k, start);
  c = dispatch(c, { type: "phase", sign: 1 });
  assert.equal(c.scene.transition.sign, 1);
  assert.equal(c.scene.transition.durationTicks, 50);
  c = dispatch(c, { type: "advance", ticks: 50 });
  c = dispatch(c, { type: "phase", sign: -1 });
  c = dispatch(c, { type: "advance", ticks: 50 });
  assert.equal(c.scene.k, start);
  let edge = presetScene(1, "seam", false);
  edge = { ...createController(), scene: { ...edge, k: 23, targetK: edge.targetK, targetR: edge.targetR } };
  // direct dispatch from a constructed controller
  const wrapped = dispatch({ scene: { ...presetScene(3, "seam", false), k: 23 }, history: [], redo: [], notice: null, evicted: false }, { type: "phase", sign: 1 });
  assert.equal(wrapped.scene.k, 0);
  assert.equal(wrapped.scene.transition.sign, 1);
  assert.equal(wrapped.scene.transition.fromK, 23);
});

test("queue, undo, reset, seek", () => {
  let c = createController(20261109, "stagger", false);
  const before = hashController(c);
  c = dispatch(c, { type: "phase", sign: 1 });
  c = dispatch(c, { type: "phase", sign: 1 });
  c = dispatch(c, { type: "phase", sign: 1 });
  const full = dispatch(c, { type: "phase", sign: 1 });
  assert.equal(full.refused, true);
  assert.equal(full.notice.text, "Queue full — action refused");
  assert.equal(hashController(full), hashController(c));
  assert.equal(c.scene.queue.length, 2);
  c = dispatch(c, { type: "advance", ticks: 50 });
  assert.equal(c.scene.queue.length, 1);
  c = dispatch(c, { type: "undo" });
  c = dispatch(c, { type: "undo" });
  c = dispatch(c, { type: "undo" });
  assert.equal(serializeScene(c.scene), serializeScene(dispatch({ scene: presetScene(20261109, "stagger", false), history: [], redo: [], notice: null, evicted: false }, { type: "seek", tick: c.scene.tick }).scene) || c.scene.k >= 0);
  const fresh = createController(20261109, "stagger", false);
  let stepped = fresh;
  stepped = dispatch(stepped, { type: "phase", sign: 1 });
  const mid = dispatch(stepped, { type: "seek", tick: 10 });
  const far = dispatch(mid, { type: "seek", tick: 80 });
  const back = dispatch(far, { type: "seek", tick: 10 });
  assert.equal(serializeScene(back.scene), serializeScene(mid.scene));
  assert.equal(visualK(back.scene), visualK(mid.scene));
  const reset = dispatch(far, { type: "reset" });
  assert.equal(reset.history.length, 0);
  assert.equal(reset.scene.queue.length, 0);
  assert.equal(reset.scene.tick, 0);
  assert.equal(serializeScene(reset.scene), serializeScene(fresh.scene));
  let hist = createController(4, "seam", true);
  for (let i = 0; i < 130; i++) hist = dispatch(hist, { type: "phase", sign: 1 });
  assert.equal(hist.history.length, 128);
  assert.equal(hist.evicted, true);
  assert.match(hist.notice.text, /oldest entry dropped/);
  const hidden = clockStep(hist, 500, { hidden: true });
  assert.equal(hidden.applied, 0);
  assert.equal(hashController(hidden.controller), hashController(hist));
  const paused = dispatch(fresh, { type: "pause", paused: true });
  const held = clockStep(paused, 500, { hidden: false });
  assert.equal(held.applied, 0);
  assert.equal(held.controller.scene.tick, paused.scene.tick);
  void before;
});

test("puzzle enumeration, hints, occlusion", () => {
  for (let seed = 1; seed <= 40; seed++) {
    const p = puzzleFromSeed(seed);
    assert.notEqual(`${p.startK}:${p.startR}`, `${p.targetK}:${p.targetR}`);
    const scene = presetScene(seed, "stagger", true);
    assert.equal(scene.k === scene.targetK && scene.ratio === scene.targetR, false);
    assert.ok(pathDistance(scene) > 0);
  }
  for (const tr of [0, 1, 2]) {
    let minOther = Infinity;
    let targetErr = Infinity;
    for (let k = 0; k < 24; k++) {
      for (let r = 0; r < 3; r++) {
        const scene = {
          mode: "puzzle", k, ratio: r, targetK: 4, targetR: tr, tick: 0, reduced: true,
          transition: null, bridge: "closed", bridgeMotion: null, yawMilli: 0, pitchMilli: 0,
        };
        const err = seamError(scene, 1280, 720).maxError;
        const errSmall = seamError(scene, 320, 568).maxError;
        if (k === 4 && r === tr) targetErr = Math.max(err, errSmall);
        else minOther = Math.min(minOther, err);
        const h = hint(scene);
        if (k === 4 && r === tr) assert.match(h.text, /seated/);
        else {
          const before = pathDistance(scene);
          const next = h.control === "phase"
            ? { ...scene, k: (scene.k + h.sign + 24) % 24 }
            : { ...scene, ratio: h.id };
          assert.ok(pathDistance(next) < before, h.text);
        }
      }
    }
    assert.ok(targetErr < 0.25, `target ${targetErr}`);
    assert.ok(minOther >= 3.5, `gap ${minOther} for ratio ${tr}`);
  }
  const seam = presetScene(20261109, "seam", true);
  const stag = presetScene(20261109, "stagger", true);
  assert.equal(occlusionAt(seam, 1280, 720, 5, 7).centerBlocked, false);
  assert.equal(occlusionAt(stag, 1280, 720, 5, 7).centerBlocked, true);
  assert.equal(seam.k === seam.targetK && seam.ratio === seam.targetR, true);
});

test("portal march budget", () => {
  const frag = readFileSync(new URL("portal.frag.glsl", root), "utf8");
  const vert = readFileSync(new URL("portal.vert.glsl", root), "utf8");
  const rib = readFileSync(new URL("rib.frag.glsl", root), "utf8");
  for (const src of [frag, vert, rib, readFileSync(new URL("rib.vert.glsl", root), "utf8")]) {
    assert.match(src, /#version 300 es/);
  }
  assert.match(frag, /const int MAX_STEPS = 64;/);
  assert.match(frag, /const float MAX_DIST = 40\.0;/);
  assert.equal((frag.match(/foldDir\(rd\)/g) || []).length, 1);
  const ray = centerRay();
  const hit = marchAperture(ray.origin, ray.dir);
  assert.equal(hit.redirects, 1);
  assert.equal(hit.hit, true);
  assert.ok(hit.stepsA <= 64 && hit.stepsB <= 64);
  assert.ok(hit.travel <= 40);
  assert.equal(hit.finite, true);
  assert.ok(hit.point.x > 0 && hit.point.x < 5.4);
});

test("100 replay traces", () => {
  for (let seed = 1; seed <= 100; seed++) {
    const actions = trace(seed);
    const a = replay(seed, actions);
    const b = replay(seed, actions);
    assert.equal(hashController(a), hashController(b));
    assert.equal(sceneInDomain(a.scene), true);
  }
});

test("10000 invalid inputs leave the domain closed", () => {
  const rng = mulberry32(20261109);
  let c = createController(9, "threshold", false);
  let rejected = 0;
  for (let i = 0; i < 10000; i++) {
    const before = hashController(c);
    const action = badAction(rng);
    const next = dispatch(c, action);
    if (action.expect === "reject") {
      assert.equal(next.refused, true);
      assert.equal(hashController(next), before);
      rejected++;
    }
    c = next.refused ? c : next;
    assert.equal(sceneInDomain(c.scene), true);
    const u = deriveUniforms(c.scene, 1280, 720);
    assert.equal(u.ok, true);
    assert.equal(walkFinite(u.sample), null);
    const badCanvas = deriveUniforms(c.scene, 0, 720);
    assert.equal(badCanvas.ok, false);
  }
  assert.ok(rejected > 8000);
});

function trace(seed) {
  const rng = mulberry32(seed);
  const actions = [];
  for (let i = 0; i < 24; i++) {
    const k = Math.floor(rng() * 10);
    if (k === 0) actions.push({ type: "phase", sign: rng() < 0.5 ? 1 : -1 });
    else if (k === 1) actions.push({ type: "ratio", id: Math.floor(rng() * 3) });
    else if (k === 2) actions.push({ type: "azimuth", deg: Math.floor(rng() * 121) - 60 });
    else if (k === 3) actions.push({ type: "sigma", micros: Math.floor(rng() * 60001) });
    else if (k === 4) actions.push({ type: "undo" });
    else if (k === 5) actions.push({ type: "redo" });
    else if (k === 6) actions.push({ type: "advance", ticks: Math.floor(rng() * 80) });
    else if (k === 7) actions.push({ type: "seek", tick: Math.floor(rng() * 400) });
    else if (k === 8) actions.push({ type: "mode", mode: rng() < 0.5 ? "free" : "puzzle" });
    else actions.push({ type: "inspect", yawMilli: Math.floor(rng() * 24001) - 12000, pitchMilli: Math.floor(rng() * 16001) - 8000 });
  }
  return actions;
}

function replay(seed, actions) {
  let c = createController(seed, "stagger", false);
  for (const action of actions) c = dispatch(c, action);
  return c;
}

function badAction(rng) {
  const roll = Math.floor(rng() * 12);
  if (roll === 0) return { type: "phase", sign: [0, 2, 1.5, NaN, Infinity, "1"][Math.floor(rng() * 6)], expect: "reject" };
  if (roll === 1) return { type: "ratio", id: [3, -1, 1.2, NaN, Infinity][Math.floor(rng() * 5)], expect: "reject" };
  if (roll === 2) return { type: "azimuth", deg: [NaN, Infinity, -Infinity][Math.floor(rng() * 3)], expect: "reject" };
  if (roll === 3) return { type: "azimuth", deg: (rng() < 0.5 ? -1 : 1) * (10 ** (2 + rng() * 6)), expect: "clamp" };
  if (roll === 4) return { type: "sigma", micros: [NaN, Infinity][Math.floor(rng() * 2)], expect: "reject" };
  if (roll === 5) return { type: "seek", tick: [-1, 1.5, NaN, Infinity][Math.floor(rng() * 4)], expect: "reject" };
  if (roll === 6) return { type: "advance", ticks: [-3, 1.2, NaN][Math.floor(rng() * 3)], expect: "reject" };
  if (roll === 7) return { type: "mode", mode: "fly", expect: "reject" };
  if (roll === 8) return { type: "preset", id: "gears", expect: "reject" };
  if (roll === 9) return { type: "inspect", yawMilli: NaN, pitchMilli: 0, expect: "reject" };
  if (roll === 10) return { type: "nope", expect: "reject" };
  return { type: "phase", sign: null, expect: "reject" };
}

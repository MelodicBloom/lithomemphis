// Derived poses and uniforms. Every value is recomputed from the scene and tick.

import {
  CAMERA,
  APERTURE,
  RIBS,
  SEAM,
  SCENE_BOUNDS,
  SPINE_Y,
  accentLocal,
  foldZ,
  onStone,
  portalQuadZ,
} from "./geometry.mjs";
import {
  add,
  cross,
  ident,
  invertMat,
  length,
  lightDirection,
  lookAt,
  mulMat,
  normalize,
  normalMatrixFromYaw,
  perspective,
  ribDepth,
  ribScale,
  rotY,
  scale,
  scaling,
  structuralOffset,
  sub,
  transformPoint,
  transformVector,
  translation,
} from "./analytic.mjs";
import { bridgeVisual, idleOffset, visualK, visualRatio } from "./state.mjs";

export function inspectedTarget(yawMilli, pitchMilli) {
  const yaw = (yawMilli / 1000) * Math.PI / 180;
  const pitch = (pitchMilli / 1000) * Math.PI / 180;
  let dir = normalize(sub(CAMERA.target, CAMERA.eye));
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  dir = { x: dir.x * cy + dir.z * sy, y: dir.y, z: -dir.x * sy + dir.z * cy };
  const worldUp = { x: 0, y: 1, z: 0 };
  const right = normalize(cross(dir, worldUp));
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const rotated = add(scale(dir, cp), add(scale(cross(right, dir), sp), scale(right, (dir.x * right.x + dir.y * right.y + dir.z * right.z) * (1 - cp))));
  const dist = length(sub(CAMERA.target, CAMERA.eye));
  return add(CAMERA.eye, scale(normalize(rotated), dist));
}

export function cameraFor(scene) {
  const yaw = scene.mode === "puzzle" ? 0 : scene.yawMilli;
  const pitch = scene.mode === "puzzle" ? 0 : scene.pitchMilli;
  const target = yaw === 0 && pitch === 0 ? CAMERA.target : inspectedTarget(yaw, pitch);
  return { eye: CAMERA.eye, target, up: CAMERA.up };
}

export function ribPoses(scene) {
  const kVis = visualK(scene);
  const rVis = visualRatio(scene);
  const idle = idleOffset(scene);
  const poses = [];
  for (let i = 0; i < RIBS.length; i++) {
    const rib = RIBS[i];
    const off = structuralOffset(i, kVis, scene.targetK);
    const z = ribDepth(i, rVis);
    const yaw = rib.yaw + off.yaw;
    const s = ribScale(i, rVis);
    const y = SPINE_Y + rib.lift + idle + off.y;
    // Hinge on the right stile so a phase yaw swings the seam mark. Rotating
    // about the slab center left the mark's screen position almost unchanged.
    const x = rib.lateral + off.x + s * (rib.w / 2);
    const model = mulMat(
      translation(x, y, z),
      mulMat(rotY(yaw), mulMat(scaling(s), translation(-rib.w / 2, -rib.h / 2, 0))),
    );
    poses.push({
      i, x, y, z, yaw, scale: s, model,
      normal: normalMatrixFromYaw(yaw),
      base: { x: rib.lateral + off.x, z, radius: Math.max(0.35, rib.w * s * 0.42) },
    });
  }
  return { poses, r: rVis, kVis, idle };
}

export function seamLocals(targetK, targetR) {
  const scene = {
    mode: "puzzle",
    k: targetK,
    ratio: targetR,
    targetK,
    targetR,
    tick: 0,
    reduced: true,
    transition: null,
    bridge: "open",
    bridgeMotion: null,
  };
  const { poses } = ribPoses(scene);
  const locals = [];
  for (let i = 0; i < RIBS.length; i++) {
    const rib = RIBS[i];
    const inv = invertMat(poses[i].model);
    const hit = linePlane(SEAM.a, SEAM.b, poses[i], rib.d / 2);
    if (!hit) {
      locals.push(null);
      continue;
    }
    const local = transformPoint(inv, hit);
    locals.push(local);
  }
  return locals;
}

function linePlane(a, b, pose, localZ) {
  const origin = transformPoint(pose.model, { x: 0, y: 0, z: localZ });
  const normal = transformVector(pose.model, { x: 0, y: 0, z: 1 });
  const n = normalize(normal);
  const dir = sub(b, a);
  const denom = dir.x * n.x + dir.y * n.y + dir.z * n.z;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((origin.x - a.x) * n.x + (origin.y - a.y) * n.y + (origin.z - a.z) * n.z) / denom;
  return add(a, scale(dir, t));
}

export function markModel(pose, local) {
  const world = transformPoint(pose.model, { x: local.x, y: local.y, z: local.z });
  const n = transformVector(rotY(pose.yaw), { x: 0, y: 0, z: 1 });
  const at = add(world, scale(normalize(n), 0.012));
  return mulMat(translation(at.x, at.y, at.z), rotY(pose.yaw));
}

export function markWorld(scene, locals) {
  const { poses } = ribPoses(scene);
  return locals.map((local, i) => {
    if (!local) return null;
    return transformPoint(poses[i].model, { x: local.x, y: local.y, z: local.z });
  });
}

export function projectPoint(viewProj, p, width, height) {
  const c = transformPoint(viewProj, p);
  if (!(c.w > 0)) return null;
  const ndcX = c.x;
  const ndcY = c.y;
  return {
    x: (ndcX * 0.5 + 0.5) * width,
    y: (1 - (ndcY * 0.5 + 0.5)) * height,
    ndcX,
    ndcY,
  };
}

export function viewProjFor(scene, width, height) {
  const cam = cameraFor(scene);
  const view = lookAt(cam.eye, cam.target, cam.up);
  const proj = perspective(CAMERA.fovY, width / height, CAMERA.near, CAMERA.far);
  return { cam, view, proj, viewProj: mulMat(proj, view) };
}

function distToLine(p, a, b) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len = Math.hypot(vx, vy);
  if (!(len > 1e-8)) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs((p.x - a.x) * vy - (p.y - a.y) * vx) / len;
}

export function seamError(scene, width, height) {
  const locals = seamLocals(scene.targetK, scene.targetR);
  const worlds = markWorld(scene, locals);
  const { viewProj } = viewProjFor(scene, width, height);
  const pa = projectPoint(viewProj, SEAM.a, width, height);
  const pb = projectPoint(viewProj, SEAM.b, width, height);
  const points = worlds.map((w) => (w ? projectPoint(viewProj, w, width, height) : null));
  const errors = points.map((p) => (p && pa && pb ? distToLine(p, pa, pb) : Infinity));
  const finite = errors.filter((e) => Number.isFinite(e));
  const maxError = finite.length ? Math.max(...finite) : Infinity;
  return { errors, maxError, points, locals };
}

export function rayFrameT(origin, dir, pose, rib) {
  const inv = invertMat(pose.model);
  const o = transformPoint(inv, origin);
  const d = transformVector(inv, dir);
  let best = null;
  for (const zPlane of [rib.d / 2, -rib.d / 2]) {
    if (Math.abs(d.z) < 1e-9) continue;
    const t = (zPlane - o.z) / d.z;
    if (t < 0.001) continue;
    const x = o.x + t * d.x;
    const y = o.y + t * d.y;
    if (!onStone(x, y, rib, 0)) continue;
    if (!best || t < best) best = t;
  }
  return best;
}

export function apertureCenter() {
  return { x: APERTURE.centerX, y: APERTURE.centerY, z: portalQuadZ() };
}

export function occlusionAt(scene, width, height, samplesX = 5, samplesY = 7) {
  const { poses } = ribPoses(scene);
  const { cam } = viewProjFor(scene, width, height);
  let open = 0;
  let blocked = 0;
  const center = apertureCenter();
  let centerBlocked = false;
  for (let iy = 0; iy < samplesY; iy++) {
    for (let ix = 0; ix < samplesX; ix++) {
      const u = samplesX === 1 ? 0.5 : ix / (samplesX - 1);
      const v = samplesY === 1 ? 0.5 : iy / (samplesY - 1);
      const px = APERTURE.centerX + (u - 0.5) * 2 * APERTURE.halfW * 0.86;
      const py = APERTURE.centerY + (v - 0.5) * 2 * APERTURE.halfH * 0.86;
      const target = { x: px, y: py, z: portalQuadZ() };
      const dir = normalize(sub(target, cam.eye));
      let hit = false;
      for (let i = 0; i < poses.length; i++) {
        const t = rayFrameT(cam.eye, dir, poses[i], RIBS[i]);
        if (t != null) {
          const at = add(cam.eye, scale(dir, t));
          if (at.z > portalQuadZ() + 0.02) {
            hit = true;
            break;
          }
        }
      }
      if (hit) blocked++;
      else open++;
      if (Math.abs(px - center.x) < 1e-6 && Math.abs(py - center.y) < 1e-6) centerBlocked = hit;
    }
  }
  const centerDir = normalize(sub(center, cam.eye));
  centerBlocked = false;
  for (let i = 0; i < poses.length; i++) {
    const t = rayFrameT(cam.eye, centerDir, poses[i], RIBS[i]);
    if (t != null) {
      const at = add(cam.eye, scale(centerDir, t));
      if (at.z > portalQuadZ() + 0.02) centerBlocked = true;
    }
  }
  return { open, blocked, centerBlocked };
}

export function boundsOf(scene) {
  const { poses } = ribPoses(scene);
  let outside = 0;
  let nearClip = 0;
  const { view } = viewProjFor(scene, 1280, 720);
  for (let i = 0; i < poses.length; i++) {
    const rib = RIBS[i];
    const corners = [
      { x: -rib.w / 2, y: 0, z: -rib.d / 2 },
      { x: rib.w / 2, y: 0, z: -rib.d / 2 },
      { x: rib.w / 2, y: rib.h, z: rib.d / 2 },
      { x: -rib.w / 2, y: rib.h, z: rib.d / 2 },
    ];
    for (const c of corners) {
      const w = transformPoint(poses[i].model, c);
      if (w.x < SCENE_BOUNDS.min.x || w.x > SCENE_BOUNDS.max.x || w.y < SCENE_BOUNDS.min.y || w.y > SCENE_BOUNDS.max.y || w.z < SCENE_BOUNDS.min.z || w.z > SCENE_BOUNDS.max.z) {
        outside++;
      }
      const viewP = transformPoint(view, w);
      if (viewP.z > -CAMERA.near) nearClip++;
      if (!Number.isFinite(w.x) || !Number.isFinite(viewP.z)) outside++;
    }
    const inv = invertMat(poses[i].model);
    if (!inv) outside++;
  }
  return { outside, nearClip };
}

export function deriveUniforms(scene, width, height) {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) {
    return { ok: false, reason: "canvas" };
  }
  const pack = ribPoses(scene);
  const camPack = viewProjFor(scene, width, height);
  const light = lightDirection(Number.isFinite(scene.azimuth) ? scene.azimuth : 32);
  const sigma = (Number.isFinite(scene.sigmaMicros) ? scene.sigmaMicros : 12000) / 1e6;
  const locals = seamLocals(scene.targetK, scene.targetR);
  const accent = accentLocal();
  const rib0 = pack.poses[0];
  const accentModel = mulMat(rib0.model, translation(accent.x, accent.y, accent.z));
  const capModel = mulMat(rib0.model, translation(accent.x, accent.y - accent.h * 0.38, accent.z));
  const bridgeT = bridgeVisual(scene) / 1000;
  const bridgeModel = mulMat(
    translation(APERTURE.centerX + bridgeT * (APERTURE.halfW + 0.46), APERTURE.centerY, portalQuadZ() + 0.07),
    ident(),
  );
  const numbers = [];
  const push = (v) => {
    numbers.push(v);
    return Number.isFinite(v);
  };
  let finite = true;
  for (const p of pack.poses) for (const v of p.model) if (!push(v)) finite = false;
  if (!push(light.x) || !push(light.y) || !push(light.z)) finite = false;
  if (!push(sigma) || !push(pack.r) || !push(bridgeT)) finite = false;
  if (!finite || Math.abs(length(light) - 1) > 1e-6) return { ok: false, reason: "uniform" };
  return {
    ok: true,
    eye: camPack.cam.eye,
    target: camPack.cam.target,
    light,
    sigma,
    view: camPack.view,
    proj: camPack.proj,
    viewProj: camPack.viewProj,
    poses: pack.poses,
    r: pack.r,
    bridgeT,
    bridgeModel,
    accentModel,
    capModel,
    locals,
    aperture: {
      centerX: APERTURE.centerX,
      centerY: APERTURE.centerY,
      halfW: APERTURE.halfW,
      halfH: APERTURE.halfH,
      z: portalQuadZ(),
      foldZ: foldZ(),
    },
    width,
    height,
    sample: numbers,
  };
}

export function walkFinite(value, path = "root") {
  if (typeof value === "number") return Number.isFinite(value) ? null : path;
  if (!value || typeof value !== "object") return null;
  if (ArrayBuffer.isView(value)) {
    for (let i = 0; i < value.length; i++) if (!Number.isFinite(value[i])) return `${path}[${i}]`;
    return null;
  }
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      const hit = walkFinite(value[i], `${path}[${i}]`);
      if (hit) return hit;
    }
    return null;
  }
  for (const key of Object.keys(value)) {
    const hit = walkFinite(value[key], `${path}.${key}`);
    if (hit) return hit;
  }
  return null;
}

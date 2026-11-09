// Authored rib solids, the aperture, and the seam line.
// Meshes are local, flat-shaded, and chamfered. No borrowed assets.

import { add, cross, dot, length, scale, sub, v3 } from "./analytic.mjs";

export const SCENE_BOUNDS = Object.freeze({
  min: Object.freeze({ x: -7, y: -0.9, z: -12 }),
  max: Object.freeze({ x: 7, y: 6.5, z: 8 }),
});

export const CAMERA = Object.freeze({
  eye: Object.freeze({ x: 1.55, y: 1.78, z: 8.6 }),
  target: Object.freeze({ x: 0.05, y: 1.48, z: -2.4 }),
  up: Object.freeze({ x: 0, y: 1, z: 0 }),
  fovY: (28 * Math.PI) / 180,
  near: 0.15,
  far: 52,
});

export const APERTURE = Object.freeze({
  centerX: -0.06,
  centerY: 1.58,
  halfW: 0.5,
  halfH: 0.78,
  wallZ: -8.2,
  wallW: 7.2,
  wallH: 4.7,
  wallD: 0.24,
  foldGap: 1.18,
});

export function foldZ() {
  return APERTURE.wallZ - APERTURE.foldGap;
}

export function portalQuadZ() {
  return APERTURE.wallZ + APERTURE.wallD / 2 + 0.015;
}

// World line threaded across the left piers and aimed at the aperture's left jamb.
export const SEAM = Object.freeze({
  // Above the spine so a ratio scale change moves marks across the seam.
  a: Object.freeze({ x: -0.68, y: 2.28, z: 0.3 }),
  b: Object.freeze({ x: -0.16, y: 2.02, z: -8.2 }),
});

// Scale is about a shared spine (see SPINE_Y), not the floor. Far ribs at r=2/3
// would otherwise shrink into a sub-WU stump and the aperture ray would pass over them.
export const SPINE_Y = 1.7;

export const RIBS = Object.freeze([
  Object.freeze({ w: 3.05, h: 3.6, d: 0.36, c: 0.07, hw: 1.28, hh: 2.15, ox: 0.55, oy: 0.02, lateral: -0.08, lift: 0, yaw: 0.012 }),
  Object.freeze({ w: 2.7, h: 3.2, d: 0.26, c: 0.055, hw: 1.2, hh: 1.95, ox: 0.48, oy: -0.03, lateral: 0.04, lift: 0.015, yaw: -0.01 }),
  Object.freeze({ w: 2.9, h: 3.35, d: 0.3, c: 0.08, hw: 1.28, hh: 2.0, ox: 0.52, oy: 0.04, lateral: -0.05, lift: 0, yaw: 0.014 }),
  Object.freeze({ w: 2.45, h: 2.95, d: 0.22, c: 0.048, hw: 1.15, hh: 1.8, ox: 0.42, oy: 0.0, lateral: 0.05, lift: 0.02, yaw: -0.008 }),
  Object.freeze({ w: 2.7, h: 3.45, d: 0.26, c: 0.06, hw: 1.22, hh: 1.85, ox: 0.46, oy: -0.02, lateral: -0.02, lift: 0.01, yaw: 0.01 }),
  Object.freeze({ w: 2.35, h: 3.55, d: 0.18, c: 0.04, hw: 1.12, hh: 1.65, ox: 0.4, oy: 0.02, lateral: 0.03, lift: 0.015, yaw: -0.008 }),
  Object.freeze({ w: 2.5, h: 3.9, d: 0.2, c: 0.05, hw: 1.18, hh: 1.72, ox: 0.42, oy: 0.0, lateral: 0.0, lift: 0, yaw: 0.008 }),
]);

export function holeFits(rib) {
  const c = rib.c;
  const left = rib.ox - rib.hw / 2;
  const right = rib.ox + rib.hw / 2;
  const cy = rib.h / 2 + rib.oy;
  const bottom = cy - rib.hh / 2;
  const top = cy + rib.hh / 2;
  return left > -rib.w / 2 + c * 2 && right < rib.w / 2 - c * 2 && bottom > c * 2 && top < rib.h - c * 2 && rib.hw > 0.2 && rib.hh > 0.2 && rib.d > c * 2;
}

function chamferRect(w, h, cx, cy, chamfer) {
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const y0 = cy - h / 2;
  const y1 = cy + h / 2;
  const c = Math.max(0, Math.min(chamfer, w / 4, h / 4));
  return [
    v3(x0 + c, y0, 0), v3(x1 - c, y0, 0), v3(x1, y0 + c, 0), v3(x1, y1 - c, 0),
    v3(x1 - c, y1, 0), v3(x0 + c, y1, 0), v3(x0, y1 - c, 0), v3(x0, y0 + c, 0),
  ];
}

function atZ(loop, z) {
  return loop.map((p) => v3(p.x, p.y, z));
}

export function createMesh() {
  return { pos: [], nrm: [], mat: [], idx: [] };
}

function pushTri(mesh, a, b, c, mat, hint) {
  const ab = sub(b, a);
  const ac = sub(c, a);
  let n = cross(ab, ac);
  const len = length(n);
  if (!(len > 1e-10)) return;
  n = scale(n, 1 / len);
  let p0 = a;
  let p1 = b;
  let p2 = c;
  if (dot(n, hint) < 0) {
    p1 = c;
    p2 = b;
    n = scale(n, -1);
  }
  const base = mesh.pos.length / 3;
  for (const p of [p0, p1, p2]) {
    mesh.pos.push(p.x, p.y, p.z);
    mesh.nrm.push(n.x, n.y, n.z);
    mesh.mat.push(mat);
  }
  mesh.idx.push(base, base + 1, base + 2);
}

function pushQuad(mesh, a, b, c, d, mat, hint) {
  pushTri(mesh, a, b, c, mat, hint);
  pushTri(mesh, a, c, d, mat, hint);
}

function stitch(mesh, ringA, ringB, mat, hintFor) {
  const n = ringA.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const mid = scale(add(add(ringA[i], ringA[j]), add(ringB[i], ringB[j])), 0.25);
    pushQuad(mesh, ringA[i], ringA[j], ringB[j], ringB[i], mat, hintFor(mid));
  }
}

export function buildFrame(rib, matFace = 0) {
  const mesh = createMesh();
  const c = rib.c;
  const cy = rib.h / 2;
  const zF = rib.d / 2;
  const zB = -rib.d / 2;
  const zBevel = zF - c;
  const outer = chamferRect(rib.w, rib.h, 0, cy, c);
  const outerInset = chamferRect(Math.max(0.2, rib.w - 2 * c), Math.max(0.2, rib.h - 2 * c), 0, cy, c * 0.35);
  const holeC = Math.min(c, rib.hw / 6, rib.hh / 6);
  const hole = chamferRect(rib.hw, rib.hh, rib.ox, cy + rib.oy, holeC);
  const holeOut = chamferRect(rib.hw + 2 * c, rib.hh + 2 * c, rib.ox, cy + rib.oy, c * 0.35);
  const center = v3(0, cy, 0);
  const holeCenter = v3(rib.ox, cy + rib.oy, 0);

  stitch(mesh, atZ(outer, zB), atZ(outer, zBevel), matFace, (mid) => sub(mid, center));
  stitch(mesh, atZ(outer, zBevel), atZ(outerInset, zF), 1, (mid) => add(sub(mid, center), v3(0, 0, 1)));
  stitch(mesh, atZ(outerInset, zF), atZ(holeOut, zF), matFace, () => v3(0, 0, 1));
  stitch(mesh, atZ(holeOut, zF), atZ(hole, zBevel), 1, (mid) => add(sub(holeCenter, mid), v3(0, 0, 0.6)));
  stitch(mesh, atZ(hole, zBevel), atZ(hole, zB), 2, (mid) => sub(holeCenter, mid));
  stitch(mesh, atZ(outer, zB), atZ(hole, zB), 2, () => v3(0, 0, -1));
  return finalize(mesh);
}

export function buildBox(w, h, d, mat) {
  const mesh = createMesh();
  const x = w / 2;
  const y = h / 2;
  const z = d / 2;
  const p = [
    v3(-x, -y, z), v3(x, -y, z), v3(x, y, z), v3(-x, y, z),
    v3(-x, -y, -z), v3(x, -y, -z), v3(x, y, -z), v3(-x, y, -z),
  ];
  pushQuad(mesh, p[0], p[1], p[2], p[3], mat, v3(0, 0, 1));
  pushQuad(mesh, p[5], p[4], p[7], p[6], mat, v3(0, 0, -1));
  pushQuad(mesh, p[4], p[0], p[3], p[7], mat, v3(-1, 0, 0));
  pushQuad(mesh, p[1], p[5], p[6], p[2], mat, v3(1, 0, 0));
  pushQuad(mesh, p[3], p[2], p[6], p[7], mat, v3(0, 1, 0));
  pushQuad(mesh, p[4], p[5], p[1], p[0], mat, v3(0, -1, 0));
  return finalize(mesh);
}

function finalize(mesh) {
  return {
    pos: new Float32Array(mesh.pos),
    nrm: new Float32Array(mesh.nrm),
    mat: new Float32Array(mesh.mat),
    idx: new Uint32Array(mesh.idx),
  };
}

export function onStone(x, y, rib, margin = 0) {
  const cy = rib.h / 2 + rib.oy;
  const inOuter = Math.abs(x) <= rib.w / 2 - margin && y >= margin && y <= rib.h - margin;
  const inHole = Math.abs(x - rib.ox) <= rib.hw / 2 + margin && Math.abs(y - cy) <= rib.hh / 2 + margin;
  return inOuter && !inHole;
}

export function wallSpec() {
  return {
    w: APERTURE.wallW,
    h: APERTURE.wallH,
    d: APERTURE.wallD,
    c: 0.055,
    hw: APERTURE.halfW * 2,
    hh: APERTURE.halfH * 2,
    ox: 0,
    oy: APERTURE.centerY - APERTURE.wallH / 2,
  };
}

export function accentLocal() {
  const rib = RIBS[0];
  return {
    x: -rib.w / 2 + 0.22,
    y: rib.h * 0.74,
    z: rib.d / 2 + 0.008,
    w: 0.11,
    h: 0.2,
    d: 0.014,
  };
}

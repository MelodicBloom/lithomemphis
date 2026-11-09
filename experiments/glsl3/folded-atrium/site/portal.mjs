// CPU twin of the aperture march. The fragment shader is the picture;
// this is the fixture for redirect count, step budget, and finite hits.

import { APERTURE, CAMERA, foldZ, portalQuadZ } from "./geometry.mjs";
import { MAX_MARCH_STEPS, MAX_RAY_WU, add, length, normalize, scale, sub } from "./analytic.mjs";

const SURF = 0.0022;

function sdBox(p, b) {
  const q = { x: Math.abs(p.x) - b.x, y: Math.abs(p.y) - b.y, z: Math.abs(p.z) - b.z };
  const outside = Math.hypot(Math.max(q.x, 0), Math.max(q.y, 0), Math.max(q.z, 0));
  return outside + Math.min(Math.max(q.x, Math.max(q.y, q.z)), 0);
}

function distA(p) {
  const sideX = (APERTURE.halfW + 0.2) - Math.abs(p.x - APERTURE.centerX);
  const sideY = (APERTURE.halfH + 0.24) - Math.abs(p.y - APERTURE.centerY);
  const back = p.z - foldZ();
  const lintel = sdBox(
    sub(p, { x: APERTURE.centerX, y: APERTURE.centerY + APERTURE.halfH * 0.72, z: (portalQuadZ() + foldZ()) * 0.5 }),
    { x: APERTURE.halfW + 0.04, y: 0.055, z: 0.16 },
  );
  const sill = sdBox(
    sub(p, { x: APERTURE.centerX, y: APERTURE.centerY - APERTURE.halfH * 0.82, z: (portalQuadZ() + foldZ()) * 0.5 }),
    { x: APERTURE.halfW + 0.02, y: 0.04, z: 0.14 },
  );
  return Math.min(sideX, sideY, back, lintel, sill);
}

function foldPoint(p) {
  const q = { x: p.x - APERTURE.centerX, y: p.y, z: p.z - foldZ() };
  return { x: -q.z, y: q.y, z: q.x };
}

function foldDir(d) {
  return { x: -d.z, y: d.y, z: d.x };
}

function distB(p) {
  const farX = 5.35 - p.x;
  const y0 = p.y - 0.2;
  const y1 = 3.25 - p.y;
  const z0 = p.z + 1.28;
  const z1 = 1.18 - p.z;
  const room = Math.min(farX, y0, y1, z0, z1);
  const pier = sdBox(sub(p, { x: 1.65, y: 1.62, z: -0.78 }), { x: 0.11, y: 1.28, z: 0.11 });
  const pierB = sdBox(sub(p, { x: 3.2, y: 1.55, z: 0.8 }), { x: 0.1, y: 1.22, z: 0.1 });
  const pierC = sdBox(sub(p, { x: 4.5, y: 1.48, z: -0.28 }), { x: 0.13, y: 1.12, z: 0.13 });
  const orb = length(sub(p, { x: 2.4, y: 2.15, z: 0.08 })) - 0.15;
  const slit = sdBox(sub(p, { x: 5.22, y: 1.78, z: 0.02 }), { x: 0.045, y: 0.7, z: 0.065 });
  return Math.min(room, pier, pierB, pierC, orb, slit);
}

export function marchAperture(origin, dir) {
  const rd = normalize(dir);
  let ro = add(origin, scale(rd, 0.01));
  let travel = 0.01;
  let stepsA = 0;
  let stepsB = 0;
  let redirects = 0;
  for (; stepsA < MAX_MARCH_STEPS; stepsA++) {
    if (travel > MAX_RAY_WU) break;
    const back = ro.z - foldZ();
    const sideX = (APERTURE.halfW + 0.2) - Math.abs(ro.x - APERTURE.centerX);
    const sideY = (APERTURE.halfH + 0.24) - Math.abs(ro.y - APERTURE.centerY);
    const solid = distA(ro);
    if (solid < SURF) {
      if (back <= sideX + 0.0001 && back <= sideY + 0.0001 && back < 0.02) {
        redirects += 1;
        const rd2 = foldDir(rd);
        let p2 = add(foldPoint(ro), scale(rd2, 0.02));
        travel += 0.02;
        for (; stepsB < MAX_MARCH_STEPS; stepsB++) {
          if (travel > MAX_RAY_WU) return { hit: false, redirects, stepsA: stepsA + 1, stepsB, travel, finite: Number.isFinite(travel) };
          const d = distB(p2);
          if (d < SURF) {
            return { hit: true, redirects, stepsA: stepsA + 1, stepsB: stepsB + 1, travel, point: p2, finite: [p2.x, p2.y, p2.z, travel].every(Number.isFinite) };
          }
          const step = Math.max(d, 0.003);
          p2 = add(p2, scale(rd2, step));
          travel += step;
        }
        return { hit: false, redirects, stepsA: stepsA + 1, stepsB, travel, finite: Number.isFinite(travel) };
      }
      return { hit: true, chamber: "A", redirects, stepsA: stepsA + 1, stepsB, travel, point: ro, finite: Number.isFinite(travel) };
    }
    const step = Math.max(solid, 0.003);
    ro = add(ro, scale(rd, step));
    travel += step;
  }
  return { hit: false, redirects, stepsA, stepsB, travel, finite: Number.isFinite(travel) };
}

export function centerRay() {
  const target = { x: APERTURE.centerX, y: APERTURE.centerY, z: portalQuadZ() };
  return { origin: target, dir: normalize(sub(target, CAMERA.eye)) };
}

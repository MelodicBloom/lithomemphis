/** Analytic SDF fixtures. These are the Jamie Wong baseline checks, not the monolith scene. */

export function sdSphere(p, r) {
  return Math.hypot(p[0], p[1], p[2]) - r;
}

export function sdBox(p, b) {
  const q = [Math.abs(p[0]) - b[0], Math.abs(p[1]) - b[1], Math.abs(p[2]) - b[2]];
  const outside = Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0), Math.max(q[2], 0));
  const inside = Math.min(Math.max(q[0], q[1], q[2]), 0);
  return outside + inside;
}

export function sdPlaneZ(p) {
  return p[2];
}

export function rotY(p, a) {
  const s = Math.sin(a);
  const c = Math.cos(a);
  return [c * p[0] + s * p[2], p[1], -s * p[0] + c * p[2]];
}

/** Underestimate: local sphere distance times the minimum positive scale. */
export function conservativeScaledSphere(p, scale, radius) {
  if (!(scale[0] > 0) || !(scale[1] > 0) || !(scale[2] > 0)) {
    throw new Error('non-positive scale');
  }
  const minS = Math.min(scale[0], scale[1], scale[2]);
  const local = [p[0] / scale[0], p[1] / scale[1], p[2] / scale[2]];
  return sdSphere(local, radius) * minS;
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

function scale(v, s) {
  return [v[0] * s, v[1] * s, v[2] * s];
}

/** Closed-form ray hit for the fixture oracles. Direction must be unit length. */
export function raySphere(origin, dir, radius) {
  const b = origin[0] * dir[0] + origin[1] * dir[1] + origin[2] * dir[2];
  const c = origin[0] ** 2 + origin[1] ** 2 + origin[2] ** 2 - radius * radius;
  const disc = b * b - c;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t > 0 ? t : null;
}

export function rayAabb(origin, dir, bmin, bmax) {
  let tN = -Infinity;
  let tF = Infinity;
  for (let i = 0; i < 3; i += 1) {
    if (Math.abs(dir[i]) < 1e-12) {
      if (origin[i] < bmin[i] || origin[i] > bmax[i]) return null;
      continue;
    }
    const inv = 1 / dir[i];
    let t0 = (bmin[i] - origin[i]) * inv;
    let t1 = (bmax[i] - origin[i]) * inv;
    if (t0 > t1) {
      const s = t0;
      t0 = t1;
      t1 = s;
    }
    tN = Math.max(tN, t0);
    tF = Math.min(tF, t1);
    if (tF < tN) return null;
  }
  if (tF < 0) return null;
  return tN > 0 ? tN : 0;
}

/** Sphere trace. Safe only when sdf does not overestimate distance. */
export function sphereTrace(origin, dir, sdf, { maxSteps = 64, maxDist = 40, eps = 0.0008 } = {}) {
  let t = 0;
  for (let i = 0; i < maxSteps; i += 1) {
    const p = add(origin, scale(dir, t));
    const d = sdf(p);
    if (d < eps) return { hit: true, t, steps: i + 1 };
    t += d;
    if (t > maxDist) break;
  }
  return { hit: false, t, steps: maxSteps };
}

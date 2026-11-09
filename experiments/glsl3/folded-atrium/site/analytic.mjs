// Pure numeric helpers for Study C. No DOM, no clock, no randomness hidden in callers.
// World units (WU) are illustrative, not metres.

export const D_WU = 2;
export const RIB_COUNT = 7;
export const PHASE_COUNT = 24;
export const DETENT_TICKS = 50;
export const RATIO_TICKS = 72;
export const BRIDGE_TICKS = 72;
export const TICK_HZ = 120;
export const HISTORY_CAP = 128;
export const QUEUE_CAP = 2;
export const MAX_MARCH_STEPS = 64;
export const MAX_RAY_WU = 40;
export const LIGHT_ELEVATION_DEG = 35;
export const AZIMUTH_MIN = -60;
export const AZIMUTH_MAX = 60;
export const SIGMA_MAX_MICROS = 60000; // 0.060 WU^-1
export const SIGMA_DEFAULT_MICROS = 12000; // 0.012 WU^-1
export const YAW_LIMIT_MILLI = 12000; // ±12°
export const PITCH_LIMIT_MILLI = 8000; // ±8°
export const HITCH_TICK_CAP = 30;

// Proposal amplitudes were illustrative (0.30 / 0.15 / 0.12). These keep the same
// sin(δ) + (1−cos δ) structure — the versed term is what kills the false seat at
// δ = π — but are large enough that one 15° detent breaks the seam at 320px.
export const PHASE_X_SIN = 0.22;
export const PHASE_X_VERSED = 0.72;
export const PHASE_YAW_SIN = 0.38;
// Lateral shear runs almost along the shallow screen seam, so a vertical term
// is what makes one detent break the line. Zero only where sin(δ) is zero;
// those angles are already pushed off by the versed lateral term.
export const PHASE_Y_SIN = 1.35;

export const RATIOS = Object.freeze([
  Object.freeze({ id: 0, n: 2, d: 3, label: "2/3" }),
  Object.freeze({ id: 1, n: 3, d: 4, label: "3/4" }),
  Object.freeze({ id: 2, n: 4, d: 5, label: "4/5" }),
]);

export function clamp(v, lo, hi) {
  return Math.min(hi, Math.max(lo, v));
}

export function mod(n, m) {
  return ((n % m) + m) % m;
}

export function ratioValue(id) {
  const r = RATIOS[id];
  if (!r) return Number.NaN;
  return r.n / r.d;
}

export function ribDepth(i, r) {
  return -D_WU * (1 - Math.pow(r, i)) / (1 - r);
}

export function ribScale(i, r) {
  return Math.pow(r, i / 2);
}

export function quarticEase(u) {
  const x = clamp(u, 0, 1);
  const inv = 1 - x;
  return 1 - inv * inv * inv * inv;
}

export function smoothstep(u) {
  const x = clamp(u, 0, 1);
  return x * x * (3 - 2 * x);
}

export function phaseDistance(k, targetK) {
  const q = mod(targetK - k, PHASE_COUNT);
  return Math.min(q, PHASE_COUNT - q);
}

export function structuralOffset(i, kUnwrapped, targetK) {
  const delta = (2 * Math.PI * (kUnwrapped - targetK)) / PHASE_COUNT;
  const t = i / (RIB_COUNT - 1);
  const s = Math.sin(delta);
  const versed = 1 - Math.cos(delta);
  // A term linear in i keeps colinear marks colinear. The bulge is zero at the
  // near and far ribs and peaks in the middle, so only δ = 0 mod 2π is straight.
  const bulge = Math.sin((Math.PI * i) / (RIB_COUNT - 1));
  return {
    x: t * (PHASE_X_SIN * s + PHASE_X_VERSED * versed),
    y: bulge * 1.05 * versed + t * PHASE_Y_SIN * s,
    yaw: t * PHASE_YAW_SIN * s,
    delta,
  };
}

export function lightDirection(azimuthDeg) {
  const e = (LIGHT_ELEVATION_DEG * Math.PI) / 180;
  const a = (azimuthDeg * Math.PI) / 180;
  const ce = Math.cos(e);
  return normalize({
    x: ce * Math.sin(a),
    y: Math.sin(e),
    z: ce * Math.cos(a),
  });
}

export function extinction(sigmaPerWU, distanceWU) {
  const d = clamp(distanceWU, 0, MAX_RAY_WU);
  return Math.exp(-sigmaPerWU * d);
}

export function v3(x, y, z) {
  return { x, y, z };
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

export function scale(a, s) {
  return { x: a.x * s, y: a.y * s, z: a.z * s };
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function cross(a, b) {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

export function length(a) {
  return Math.hypot(a.x, a.y, a.z);
}

export function normalize(a) {
  const len = length(a);
  if (!(len > 0)) return { x: 0, y: 0, z: 0 };
  return scale(a, 1 / len);
}

export function sdSphere(p, radius) {
  return length(p) - radius;
}

export function sdBox(p, b) {
  const q = { x: Math.abs(p.x) - b.x, y: Math.abs(p.y) - b.y, z: Math.abs(p.z) - b.z };
  const outside = length({ x: Math.max(q.x, 0), y: Math.max(q.y, 0), z: Math.max(q.z, 0) });
  const inside = Math.min(Math.max(q.x, Math.max(q.y, q.z)), 0);
  return outside + inside;
}

export function sdPlaneZ(p) {
  return p.z;
}

export function rayAabb(origin, dir, min, max) {
  let t0 = 0;
  let t1 = Infinity;
  const o = [origin.x, origin.y, origin.z];
  const d = [dir.x, dir.y, dir.z];
  const b0 = [min.x, min.y, min.z];
  const b1 = [max.x, max.y, max.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-12) {
      if (o[i] < b0[i] || o[i] > b1[i]) return null;
      continue;
    }
    let a = (b0[i] - o[i]) / d[i];
    let b = (b1[i] - o[i]) / d[i];
    if (a > b) {
      const tmp = a;
      a = b;
      b = tmp;
    }
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return null;
  }
  if (t1 < 0) return null;
  const t = t0 >= 0 ? t0 : t1;
  return t;
}

export function sdEllipsoidConservative(p, radius, s) {
  const minS = Math.min(s.x, s.y, s.z);
  if (!(minS > 0) || !Number.isFinite(minS)) return null;
  const q = { x: p.x / s.x, y: p.y / s.y, z: p.z / s.z };
  return sdSphere(q, radius) * minS;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t >>> 0) / 4294967296;
  };
}

export function rotY(yaw) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return mat4(
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, 0, 1,
  );
}

export function mat4(m00, m10, m20, m30, m01, m11, m21, m31, m02, m12, m22, m32, m03, m13, m23, m33) {
  return new Float64Array([m00, m10, m20, m30, m01, m11, m21, m31, m02, m12, m22, m32, m03, m13, m23, m33]);
}

export function ident() {
  return mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
}

export function mulMat(a, b) {
  const o = new Float64Array(16);
  for (let c = 0; c < 4; c++) {
    for (let r = 0; r < 4; r++) {
      o[c * 4 + r] =
        a[0 * 4 + r] * b[c * 4 + 0] +
        a[1 * 4 + r] * b[c * 4 + 1] +
        a[2 * 4 + r] * b[c * 4 + 2] +
        a[3 * 4 + r] * b[c * 4 + 3];
    }
  }
  return o;
}

export function translation(x, y, z) {
  return mat4(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1);
}

export function scaling(s) {
  return mat4(s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1);
}

export function transformPoint(m, p) {
  const x = m[0] * p.x + m[4] * p.y + m[8] * p.z + m[12];
  const y = m[1] * p.x + m[5] * p.y + m[9] * p.z + m[13];
  const z = m[2] * p.x + m[6] * p.y + m[10] * p.z + m[14];
  const w = m[3] * p.x + m[7] * p.y + m[11] * p.z + m[15];
  return { x: x / w, y: y / w, z: z / w, w };
}

export function transformVector(m, p) {
  return {
    x: m[0] * p.x + m[4] * p.y + m[8] * p.z,
    y: m[1] * p.x + m[5] * p.y + m[9] * p.z,
    z: m[2] * p.x + m[6] * p.y + m[10] * p.z,
  };
}

export function invertMat(m) {
  return invertGauss(m);
}

function invertGauss(m) {
  const a = Array.from({ length: 4 }, (_, r) => [m[r], m[4 + r], m[8 + r], m[12 + r], r === 0 ? 1 : 0, r === 1 ? 1 : 0, r === 2 ? 1 : 0, r === 3 ? 1 : 0]);
  for (let col = 0; col < 4; col++) {
    let pivot = col;
    let best = Math.abs(a[col][col]);
    for (let r = col + 1; r < 4; r++) {
      const v = Math.abs(a[r][col]);
      if (v > best) {
        best = v;
        pivot = r;
      }
    }
    if (!(best > 1e-14)) return null;
    if (pivot !== col) {
      const tmp = a[col];
      a[col] = a[pivot];
      a[pivot] = tmp;
    }
    const div = a[col][col];
    for (let c = 0; c < 8; c++) a[col][c] /= div;
    for (let r = 0; r < 4; r++) {
      if (r === col) continue;
      const f = a[r][col];
      for (let c = 0; c < 8; c++) a[r][c] -= f * a[col][c];
    }
  }
  const out = new Float64Array(16);
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) out[c * 4 + r] = a[r][4 + c];
  }
  return out;
}

export function lookAt(eye, target, up) {
  const f = normalize(sub(target, eye));
  const s = normalize(cross(f, up));
  const u = cross(s, f);
  return mat4(
    s.x, u.x, -f.x, 0,
    s.y, u.y, -f.y, 0,
    s.z, u.z, -f.z, 0,
    -dot(s, eye), -dot(u, eye), dot(f, eye), 1,
  );
}

export function perspective(fovY, aspect, near, far) {
  const f = 1 / Math.tan(fovY / 2);
  const nf = 1 / (near - far);
  return mat4(
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  );
}

export function normalMatrixFromYaw(yaw) {
  const c = Math.cos(yaw);
  const s = Math.sin(yaw);
  return new Float64Array([c, 0, -s, 0, 1, 0, s, 0, c]);
}

export function composeModel(x, y, z, yaw, uniformScale) {
  return mulMat(mulMat(translation(x, y, z), rotY(yaw)), scaling(uniformScale));
}

const K256 = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x, n) {
  return (x >>> n) | (x << (32 - n));
}

export function sha256Hex(message) {
  const data = typeof message === "string" ? new TextEncoder().encode(message) : message;
  const bitLen = data.length * 8;
  const paddedLen = ((data.length + 9 + 63) >> 6) << 6;
  const withPad = new Uint8Array(paddedLen);
  withPad.set(data);
  withPad[data.length] = 0x80;
  const view = new DataView(withPad.buffer);
  view.setUint32(paddedLen - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a;
  let h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
  const w = new Uint32Array(64);
  for (let i = 0; i < paddedLen; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = view.getUint32(i + j * 4, false);
    for (let j = 16; j < 64; j++) {
      const s0 = rotr(w[j - 15], 7) ^ rotr(w[j - 15], 18) ^ (w[j - 15] >>> 3);
      const s1 = rotr(w[j - 2], 17) ^ rotr(w[j - 2], 19) ^ (w[j - 2] >>> 10);
      w[j] = (w[j - 16] + s0 + w[j - 7] + s1) >>> 0;
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
    for (let j = 0; j < 64; j++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = ((e & f) ^ (~e & g)) >>> 0;
      const t1 = (h + S1 + ch + K256[j] + w[j]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = ((a & b) ^ (a & c) ^ (b & c)) >>> 0;
      const t2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
    }
    h0 = (h0 + a) >>> 0; h1 = (h1 + b) >>> 0; h2 = (h2 + c) >>> 0; h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0; h5 = (h5 + f) >>> 0; h6 = (h6 + g) >>> 0; h7 = (h7 + h) >>> 0;
  }
  return [h0, h1, h2, h3, h4, h5, h6, h7].map((x) => x.toString(16).padStart(8, "0")).join("");
}

export function lambert(n, light) {
  const d = dot(normalize(n), normalize(light));
  if (!Number.isFinite(d)) return null;
  return clamp(d, 0, 1);
}

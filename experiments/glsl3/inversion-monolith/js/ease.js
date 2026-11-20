export function clamp01(u) {
  if (u < 0) return 0;
  if (u > 1) return 1;
  return u;
}

/** Analytic monotone quartic. E(0) = 0, E(1) = 1, no overshoot. */
export function quartic(u) {
  const x = clamp01(u);
  const inv = 1 - x;
  return 1 - inv * inv * inv * inv;
}

/** Hermite smoothstep, endpoints exact. */
export function smoothstep(u) {
  const x = clamp01(u);
  return x * x * (3 - 2 * x);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

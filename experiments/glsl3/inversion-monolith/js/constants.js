/** Shared numeric contract. Render uniforms are computed in JS and uploaded.
 *  The fragment shader clamps the same ranges again; tests require the clamp
 *  text in monolith.frag to match SHADER_CLAMPS exactly.
 */

export const TICK_HZ = 120;
export const PHASE_COUNT = 24;
export const PHASE_STEP_DEG = 15;
export const PHASE_TICKS = 50;
export const CUT_TICKS = 72;
export const BRIDGE_TICKS = 72;
export const MAX_QUEUE = 2;
export const MAX_HISTORY = 128;

/** Section ratios, stored as integer pairs. Depth is measured from the front face. */
export const CUTS = [
  [1, 2],
  [2, 3],
  [4, 5],
];

/** Lateral seam offset per cut index. Not collinear, so a tween from 1/2 to 4/5
 *  does not pass through the 2/3 mark. */
export const CUT_X = [0, 0.46, -0.4];

/** Section plane through the hall, not the full block.
 *  z = 12*(d-2n)/(25*d). 1/2, 2/3, and 4/5 all still open the carved chamber.
 */
export function cutRational(index) {
  const pair = CUTS[index];
  if (!pair) return null;
  const [n, d] = pair;
  return { n, d, num: 12 * (d - 2 * n), den: 25 * d };
}

export function cutZ(index) {
  const r = cutRational(index);
  if (!r) return null;
  return r.num / r.den;
}

export const LIGHT_ELEVATION_DEG = 35;
export const LIGHT_AZIMUTH_MIN = -60;
export const LIGHT_AZIMUTH_MAX = 60;
export const FOG_SIGMA = 0.012;
export const FOG_SIGMA_MAX = 0.06;
export const IDLE_AMP = 0.004;
export const IDLE_HZ = 0.05;
export const MAX_DIST = 40;

export const CAM_TARGET = [0.05, 0.28, 0];
export const CAM_DIST = 11.4;
export const CAM_BASE_YAW = 0.46;
export const CAM_BASE_PITCH = 0.07;
export const CAM_YAW_MIN = -12;
export const CAM_YAW_MAX = 12;
export const CAM_PITCH_MIN = -8;
export const CAM_PITCH_MAX = 8;
export const FOV_Y_DEG = 24;

export const DRAW_WIDTH = 1280;
export const DRAW_HEIGHT = 720;

export const SHADER_CLAMPS = [
  'clamp(uPhase, -0.30, 6.40)',
  'clamp(uCutZ, -0.56, 0.02)',
  'clamp(uFogSigma, 0.0, 0.06)',
  'clamp(uIdle, -0.006, 0.006)',
  'clamp(uBridge, 0.0, 1.0)',
  'clamp(uFovTan, 0.05, 1.2)',
];

export const PRESET_IDS = ['mass', 'vault', 'aperture', 'puzzle'];

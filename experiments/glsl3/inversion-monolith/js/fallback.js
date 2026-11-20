import { CUTS, cutZ } from './constants.js';
import { evaluateVisual, lobes } from './geometry.js';

/** Honest static section. This is not the raymarched image. */
export function drawFallback(svg, state) {
  const visual = evaluateVisual(state);
  const [wN, wC, wA] = lobes(visual.phaseRad);
  const z = visual.cutZ;
  const span = 0.96 - (-0.96);
  const depth = (0.96 - z) / span;
  const [n, d] = CUTS[state.cut];
  const slotW = 18 + wN * 34;
  const slotH = 40 + wN * 150;
  const armW = 20 + wC * 120;
  const armH = 10 + wC * 28;
  const arch = 8 + wA * 36;
  const cutX = 210 - depth * 70;
  svg.setAttribute('viewBox', '0 0 640 360');
  svg.innerHTML = `
    <rect width="640" height="360" fill="#100f0c"/>
    <text x="24" y="36" fill="#b7b1a4" font-family="Palatino, Georgia, serif" font-size="18">Static section</text>
    <text x="24" y="58" fill="#8d887c" font-family="ui-monospace, monospace" font-size="12">WebGL2 is not running. This drawing is not the monolith render.</text>
    <line x1="40" y1="300" x2="600" y2="300" stroke="#3a3832" stroke-width="2"/>
    <rect x="${cutX}" y="70" width="${160 + depth * 40}" height="230" fill="#2a2823" stroke="#6d675c"/>
    <rect x="${cutX + 36}" y="${150 - slotH / 2}" width="${slotW}" height="${slotH}" fill="#0c0c0b"/>
    <rect x="${cutX + 20}" y="132" width="${armW}" height="${armH}" fill="#0c0c0b"/>
    <rect x="${cutX + 48}" y="168" width="${arch}" height="${70 + wA * 40}" rx="${arch / 2}" fill="#0c0c0b"/>
    <line x1="${cutX + 70 + visual.cutOffset * 40}" y1="110" x2="${cutX + 70 + visual.cutOffset * 40}" y2="250" stroke="#c47a2a" stroke-width="2"/>
    <text x="24" y="332" fill="#8d887c" font-family="ui-monospace, monospace" font-size="12">section ${n}/${d} · cut z ${cutZ(state.cut).toFixed(3)} · detent ${state.k}</text>
  `;
}

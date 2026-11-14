#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2 uResolution;
uniform float uPhase;
uniform float uCutZ;
uniform vec3 uLight;
uniform float uFogSigma;
uniform float uIdle;
uniform float uBridge;
uniform vec3 uEye;
uniform vec3 uForward;
uniform vec3 uRight;
uniform vec3 uUp;
uniform float uFovTan;
uniform vec3 uVeinA;
uniform vec3 uVeinB;
uniform vec3 uEdgeA;
uniform vec3 uEdgeB;
uniform float uCarveEdge;

// Scene bounds. Primary march 64, shadow 16, AO 4, ray length 40 WU.
const int MAX_STEPS = 64;
const int SHADOW_STEPS = 16;
const float MAX_DIST = 40.0;
const float SURF = 0.0016;
const vec3 MONO_C = vec3(0.0, 0.18, 0.0);
const vec3 MONO_B = vec3(1.12, 2.55, 0.96);
const float MONO_R = 0.07;
const float GROUND_Y = -2.42;
const vec3 BMIN = vec3(-1.85, -2.55, -1.55);
const vec3 BMAX = vec3(1.85, 3.15, 1.70);

float sdSphere(vec3 p, float r) { return length(p) - r; }

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a;
  vec3 ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

vec3 rotY(vec3 p, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z);
}

vec3 rotZ(vec3 p, float a) {
  float s = sin(a);
  float c = cos(a);
  return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z);
}

float lobe(float d) {
  float c = cos(d);
  return c > 0.0 ? c * c : 0.0;
}

vec3 lobes(float phi) {
  float a = 2.0943951023931953;
  float n = lobe(phi);
  float c = lobe(phi - a);
  float p = lobe(phi - 2.0 * a);
  float s = max(n + c + p, 1e-4);
  return vec3(n, c, p) / s;
}

float vaultDist(vec3 ps, float phase) {
  // Bounded rigid yaw. The canonical phase still runs the full circle;
  // the chamber itself only rocks so the section keeps cutting the hall.
  float yaw = 0.40 * sin(phase);
  vec3 pl = rotY(ps - MONO_C, -yaw);
  vec3 w = lobes(phase);
  vec3 naveP = rotZ(pl - vec3(-0.04, 0.12, 0.0), 0.04);
  vec3 bn = vec3(mix(0.22, 0.52, w.x), mix(0.95, 1.78, w.x), mix(0.34, 0.62, w.x));
  float nave = sdBox(naveP, bn);
  vec3 bt = vec3(mix(0.20, 0.84, w.y), mix(0.10, 0.38, w.y), mix(0.16, 0.42, w.y));
  float tran = sdBox(pl - vec3(0.0, 0.42, 0.02), bt);
  float rA = mix(0.16, 0.58, w.z);
  float apse = sdCapsule(pl, vec3(0.02, -0.55, -0.02), vec3(0.02, 1.20, -0.02), rA);
  return min(nave, min(tran, apse));
}

float groove(vec3 p, vec3 a, vec3 b, float cutZ) {
  float cap = sdCapsule(p, a, b, 0.011);
  float slab = abs(p.z - cutZ) - 0.010;
  return max(cap, slab);
}

float mapSolid(vec3 p) {
  float idle = clamp(uIdle, -0.006, 0.006);
  float phase = clamp(uPhase, -0.30, 6.40);
  float cutZ = clamp(uCutZ, -0.56, 0.02);
  vec3 ps = p - vec3(0.0, idle, 0.0);

  float d = sdRoundBox(ps - MONO_C, MONO_B, MONO_R);
  d = max(d, -sdSphere(ps - vec3(-1.02, 2.28, 0.62), 0.62));
  d = max(d, -sdSphere(ps - vec3(1.22, 1.42, 0.78), 0.40));
  d = max(d, -sdSphere(ps - vec3(-0.78, -1.55, 0.92), 0.46));
  d = max(d, -sdSphere(ps - vec3(0.28, 2.70, -0.20), 0.38));
  d = max(d, -sdBox(rotY(rotZ(ps - vec3(0.92, 2.05, 0.42), -0.42), 0.22), vec3(0.58, 0.14, 0.55)));
  d = max(d, -sdBox(rotY(ps - vec3(-1.08, 0.20, 0.10), 0.16), vec3(0.03, 1.45, 0.20)));

  float vault = vaultDist(ps, phase);
  float inner = sdBox(ps - MONO_C, vec3(0.90, 2.12, 0.74));
  float hole = max(vault, inner);
  d = max(d, -hole);

  float yaw = 0.40 * sin(phase);
  vec3 pl = rotY(ps - MONO_C, -yaw);
  float floorSlab = sdBox(pl - vec3(0.0, -1.48, 0.0), vec3(0.78, 0.045, 0.52));
  d = min(d, max(floorSlab, inner));
  float bridgeAmt = clamp(uBridge, 0.0, 1.0);
  if (bridgeAmt > 0.001) {
    float bridge = sdBox(pl - vec3(0.0, -0.85 + bridgeAmt * 0.95, 0.0), vec3(0.70, 0.04, 0.14));
    d = min(d, max(bridge, inner));
  }

  d = max(d, ps.z - cutZ);
  d = max(d, -groove(ps, uVeinA, uVeinB, cutZ));
  if (uCarveEdge > 0.5) d = max(d, -groove(ps, uEdgeA, uEdgeB, cutZ));

  float plinth = sdRoundBox(p - vec3(0.02, -2.34, 0.06), vec3(1.55, 0.10, 1.35), 0.02);
  return min(d, plinth);
}

float rayBox(vec3 ro, vec3 rd) {
  vec3 inv = sign(rd) / max(abs(rd), 1e-6);
  vec3 t0 = (BMIN - ro) * inv;
  vec3 t1 = (BMAX - ro) * inv;
  vec3 tsm = min(t0, t1);
  vec3 tbg = max(t0, t1);
  float tN = max(max(tsm.x, tsm.y), tsm.z);
  float tF = min(min(tbg.x, tbg.y), tbg.z);
  if (tF < 0.0 || tN > tF) return -1.0;
  return tN > 0.0 ? tN : 0.0;
}

float shadowCast(vec3 ro, vec3 rd) {
  float t = 0.03;
  float res = 1.0;
  for (int i = 0; i < SHADOW_STEPS; i++) {
    float h = mapSolid(ro + rd * t);
    if (h < 0.0015) return 0.0;
    res = min(res, 14.0 * h / t);
    t += clamp(h, 0.02, 0.55);
    if (t > 10.0) break;
  }
  return clamp(res, 0.0, 1.0);
}

float aoCast(vec3 p, vec3 n) {
  float ao = 0.0;
  float sc = 1.0;
  for (int i = 1; i <= 4; i++) {
    float h = 0.07 * float(i);
    float d = mapSolid(p + n * h);
    ao += (h - d) * sc;
    sc *= 0.65;
  }
  return clamp(1.0 - ao * 0.85, 0.0, 1.0);
}

vec3 calcNormal(vec3 p) {
  const float e = 0.0014;
  const vec2 k = vec2(1.0, -1.0);
  return normalize(
    k.xyy * mapSolid(p + k.xyy * e) +
    k.yyx * mapSolid(p + k.yyx * e) +
    k.yxy * mapSolid(p + k.yxy * e) +
    k.xxx * mapSolid(p + k.xxx * e)
  );
}

vec3 sky(vec3 rd) {
  float h = clamp(rd.y * 0.5 + 0.5, 0.0, 1.0);
  vec3 horizon = vec3(0.045, 0.040, 0.034);
  vec3 zenith = vec3(0.006, 0.007, 0.008);
  return mix(horizon, zenith, smoothstep(0.0, 0.72, h));
}

vec3 shadeSolid(vec3 p, vec3 rd, vec3 n, float tHit) {
  vec3 L = uLight;
  float llen = length(L);
  L = llen > 1e-4 ? L / llen : vec3(0.0, 0.574, 0.819);
  float phase = clamp(uPhase, -0.30, 6.40);
  float cutZ = clamp(uCutZ, -0.56, 0.02);
  float ndl = clamp(dot(n, L), 0.0, 1.0);
  float shadow = ndl > 0.001 ? shadowCast(p + n * 0.02, L) : 0.0;
  float ao = aoCast(p, n);
  ao = clamp(ao * 0.85, 0.0, 1.0);
  float cutFace = smoothstep(0.62, 0.94, n.z);
  float top = smoothstep(0.72, 0.96, n.y);
  vec3 albedo = vec3(0.045, 0.042, 0.037);
  albedo = mix(albedo, vec3(0.072, 0.064, 0.054), cutFace);
  albedo = mix(albedo, vec3(0.030, 0.029, 0.026), top);

  float cavity = vaultDist(p, phase);
  float inside = sdBox(p - MONO_C, vec3(0.90, 2.12, 0.74));
  if (inside < 0.02 && cavity < 0.25 && n.z < 0.75) albedo *= 0.32;

  float diff = ndl * shadow;
  vec3 warm = vec3(1.0, 0.86, 0.68);
  vec3 cool = vec3(0.55, 0.60, 0.66);
  vec3 col = albedo * mix(cool, warm, diff) * (0.02 + 0.98 * diff);
  col *= mix(0.35, 1.0, ao);
  col += albedo * vec3(0.018, 0.020, 0.024) * (1.0 - diff) * ao;

  vec3 hv = normalize(L - rd);
  float spec = pow(clamp(dot(n, hv), 0.0, 1.0), mix(10.0, 48.0, cutFace));
  col += spec * shadow * mix(0.015, 0.07, cutFace);

  float rim = pow(1.0 - clamp(dot(n, -rd), 0.0, 1.0), 3.0);
  col += vec3(0.10, 0.08, 0.055) * rim * cutFace * 0.35;
  if (cutFace > 0.45) col *= mix(1.0, 0.62, smoothstep(0.28, 0.0, cavity));
  float opening = (1.0 - smoothstep(0.0, 0.012, abs(cavity))) * cutFace;
  col += vec3(0.05, 0.04, 0.028) * opening;

  float amberD = sdCapsule(p, uVeinA, uVeinB, 0.014);
  float amber = (1.0 - smoothstep(0.0, 0.018, amberD)) * (1.0 - smoothstep(0.012, 0.04, abs(p.z - cutZ)));
  vec3 amberCol = vec3(0.62, 0.32, 0.08);
  col = mix(col, amberCol * (0.25 + 0.75 * max(diff, 0.35)), clamp(amber, 0.0, 1.0));
  col += amberCol * amber * 0.12;

  float sigma = clamp(uFogSigma, 0.0, 0.06);
  float fog = exp(-sigma * clamp(tHit, 0.0, MAX_DIST));
  return mix(vec3(0.030, 0.027, 0.023), col, fog);
}

vec3 shadeGround(vec3 p, vec3 rd, float tHit) {
  vec3 L = normalize(uLight);
  vec3 n = vec3(0.0, 1.0, 0.0);
  float ndl = clamp(dot(n, L), 0.0, 1.0);
  float shadow = ndl > 0.001 ? shadowCast(p + n * 0.03, L) : 0.0;
  vec3 albedo = vec3(0.028, 0.027, 0.024);
  vec3 col = albedo * (0.05 + 0.95 * ndl * shadow);
  float sigma = clamp(uFogSigma, 0.0, 0.06);
  float fog = exp(-sigma * clamp(tHit, 0.0, MAX_DIST));
  return mix(vec3(0.030, 0.027, 0.023), col, fog);
}

void main() {
  if (uResolution.x < 1.0 || uResolution.y < 1.0) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  vec2 p = (gl_FragCoord.xy - 0.5 * uResolution) / uResolution.y;
  float tanH = clamp(uFovTan, 0.05, 1.2);
  vec3 rd = uForward + (uRight * p.x + uUp * p.y) * (2.0 * tanH);
  float rdLen = length(rd);
  if (!(rdLen > 1e-4)) {
    fragColor = vec4(0.01, 0.01, 0.01, 1.0);
    return;
  }
  rd /= rdLen;
  vec3 ro = uEye;

  float tGround = rd.y < -1e-4 ? (GROUND_Y - ro.y) / rd.y : -1.0;
  float tBox = rayBox(ro, rd);
  float t = tBox > 0.0 ? tBox : 0.0;
  float tHit = -1.0;
  if (tBox >= 0.0) {
    for (int i = 0; i < MAX_STEPS; i++) {
      vec3 pos = ro + rd * t;
      float d = mapSolid(pos);
      if (d < SURF) {
        tHit = t;
        break;
      }
      t += d;
      if (t > MAX_DIST) break;
    }
  }

  vec3 col;
  bool solid = tHit > 0.0 && (tGround < 0.0 || tHit < tGround);
  if (solid) {
    vec3 pos = ro + rd * tHit;
    vec3 n = calcNormal(pos);
    col = shadeSolid(pos, rd, n, tHit);
  } else if (tGround > 0.0) {
    vec3 pos = ro + rd * tGround;
    col = shadeGround(pos, rd, tGround);
  } else {
    col = sky(rd);
  }

  float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  col = pow(max(col, 0.0), vec3(1.0 / 2.2)) + dither / 255.0;
  fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}

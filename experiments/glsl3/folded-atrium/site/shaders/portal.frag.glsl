#version 300 es
precision highp float;

// One bounded fold. 64 steps per chamber, stop at 40 WU, no second redirect.
const int MAX_STEPS = 64;
const float MAX_DIST = 40.0;
const float SURF = 0.0022;

in vec3 v_world;

uniform vec3 u_eye;
uniform vec3 u_light;
uniform float u_sigma;
uniform float u_probe;
uniform vec2 u_center;
uniform float u_quadZ;
uniform float u_foldZ;
uniform vec2 u_half;

out vec4 frag;

float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

vec3 foldPoint(vec3 p) {
  vec3 q = p - vec3(u_center.x, 0.0, u_foldZ);
  return vec3(-q.z, q.y, q.x);
}

vec3 foldDir(vec3 d) {
  return vec3(-d.z, d.y, d.x);
}

float distA(vec3 p) {
  float sideX = (u_half.x + 0.2) - abs(p.x - u_center.x);
  float sideY = (u_half.y + 0.24) - abs(p.y - u_center.y);
  float back = p.z - u_foldZ;
  vec3 lintelC = vec3(u_center.x, u_center.y + u_half.y * 0.72, (u_quadZ + u_foldZ) * 0.5);
  float lintel = sdBox(p - lintelC, vec3(u_half.x + 0.04, 0.055, 0.16));
  float sill = sdBox(p - vec3(u_center.x, u_center.y - u_half.y * 0.82, (u_quadZ + u_foldZ) * 0.5), vec3(u_half.x + 0.02, 0.04, 0.14));
  return min(min(sideX, sideY), min(back, min(lintel, sill)));
}

float distB(vec3 p, out int id) {
  float farX = 5.35 - p.x;
  float y0 = p.y - 0.2;
  float y1 = 3.25 - p.y;
  float z0 = p.z + 1.28;
  float z1 = 1.18 - p.z;
  float room = min(min(farX, min(y0, y1)), min(z0, z1));
  float pier = sdBox(p - vec3(1.65, 1.62, -0.78), vec3(0.11, 1.28, 0.11));
  float pierB = sdBox(p - vec3(3.2, 1.55, 0.8), vec3(0.1, 1.22, 0.1));
  float pierC = sdBox(p - vec3(4.5, 1.48, -0.28), vec3(0.13, 1.12, 0.13));
  float orb = length(p - vec3(2.4, 2.15, 0.08)) - 0.15;
  float slit = sdBox(p - vec3(5.22, 1.78, 0.02), vec3(0.045, 0.7, 0.065));
  float d = room;
  id = 0;
  if (pier < d) { d = pier; id = 1; }
  if (pierB < d) { d = pierB; id = 1; }
  if (pierC < d) { d = pierC; id = 1; }
  if (orb < d) { d = orb; id = 2; }
  if (slit < d) { d = slit; id = 3; }
  return d;
}

vec3 gradB(vec3 p) {
  int id;
  float e = 0.0025;
  return normalize(vec3(
    distB(p + vec3(e, 0.0, 0.0), id) - distB(p - vec3(e, 0.0, 0.0), id),
    distB(p + vec3(0.0, e, 0.0), id) - distB(p - vec3(0.0, e, 0.0), id),
    distB(p + vec3(0.0, 0.0, e), id) - distB(p - vec3(0.0, 0.0, e), id)
  ));
}

vec3 shade(vec3 albedo, vec3 n, vec3 light, vec3 emit) {
  float ndl = clamp(dot(normalize(n), normalize(light)), 0.0, 1.0);
  return albedo * (0.06 + 0.94 * ndl) + emit;
}

void main() {
  if (u_probe > 0.5) {
    frag = vec4(1.0, 0.0, 1.0, 1.0);
    return;
  }
  vec3 rd = normalize(v_world - u_eye);
  vec3 ro = v_world + rd * 0.01;
  float travel = 0.01;
  bool redirected = false;
  bool hitA = false;
  vec3 hitP = ro;
  for (int i = 0; i < MAX_STEPS; i++) {
    if (travel > MAX_DIST) break;
    float back = ro.z - u_foldZ;
    float sideX = (u_half.x + 0.2) - abs(ro.x - u_center.x);
    float sideY = (u_half.y + 0.24) - abs(ro.y - u_center.y);
    float solid = distA(ro);
    if (solid < SURF) {
      if (back <= sideX + 0.0001 && back <= sideY + 0.0001 && back < 0.02) redirected = true;
      else { hitA = true; hitP = ro; }
      break;
    }
    float stepLen = max(solid, 0.003);
    ro += rd * stepLen;
    travel += stepLen;
  }

  vec3 col;
  float dist = travel;
  if (hitA) {
    float e = 0.0025;
    vec3 n = normalize(vec3(distA(hitP + vec3(e, 0.0, 0.0)) - distA(hitP - vec3(e, 0.0, 0.0)), distA(hitP + vec3(0.0, e, 0.0)) - distA(hitP - vec3(0.0, e, 0.0)), distA(hitP + vec3(0.0, 0.0, e)) - distA(hitP - vec3(0.0, 0.0, e))));
    col = shade(vec3(0.5, 0.53, 0.55), n, u_light, vec3(0.0));
  } else if (redirected) {
    vec3 rd2 = foldDir(rd);
    vec3 p2 = foldPoint(ro) + rd2 * 0.02;
    dist += 0.02;
    bool hit = false;
    int id = 0;
    for (int i = 0; i < MAX_STEPS; i++) {
      if (dist > MAX_DIST) break;
      int hid;
      float d = distB(p2, hid);
      if (d < SURF) { hit = true; id = hid; break; }
      float stepLen = max(d, 0.003);
      p2 += rd2 * stepLen;
      dist += stepLen;
    }
    if (hit) {
      vec3 n = gradB(p2);
      vec3 cold = normalize(vec3(-0.35, 0.82, 0.45));
      vec3 albedo = vec3(0.45, 0.58, 0.66);
      vec3 emit = vec3(0.0);
      if (id == 1) albedo = vec3(0.22, 0.3, 0.36);
      else if (id == 2) albedo = vec3(0.7, 0.8, 0.84);
      else if (id == 3) { albedo = vec3(0.8, 0.9, 0.95); emit = vec3(0.85, 0.95, 1.0); }
      if (n.y > 0.65 && id == 0) albedo = vec3(0.48, 0.54, 0.57);
      col = shade(albedo, n, cold, emit);
    } else {
      col = vec3(0.07, 0.09, 0.11);
    }
  } else {
    col = vec3(0.06, 0.075, 0.09);
  }

  float T = exp(-u_sigma * clamp(dist, 0.0, 40.0));
  col = mix(vec3(0.05, 0.065, 0.075), max(col, 0.0), T);
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  frag = vec4(col, 1.0);
}

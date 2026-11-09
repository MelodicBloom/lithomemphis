#version 300 es
precision highp float;

in vec3 v_world;
in vec3 v_nrm;
in float v_mat;

uniform vec3 u_light;
uniform vec3 u_eye;
uniform float u_sigma;
uniform float u_probe;
uniform float u_tone;
uniform vec3 u_base[7];

out vec4 frag;

float grain(vec3 p) {
  return fract(sin(dot(floor(p * 42.0), vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

void main() {
  if (u_probe > 0.5) {
    frag = vec4(0.0, 1.0, 0.0, 1.0);
    return;
  }
  vec3 n = normalize(v_nrm);
  float ndl = clamp(dot(n, normalize(u_light)), 0.0, 1.0);
  float up = clamp(n.y * 0.5 + 0.5, 0.0, 1.0);
  float matId = floor(v_mat + 0.5);

  vec3 chalk = mix(vec3(0.55, 0.53, 0.48), vec3(0.64, 0.67, 0.69), clamp(u_tone, 0.0, 1.0));
  vec3 albedo = chalk;
  vec3 emit = vec3(0.0);
  if (matId < 0.5) albedo = chalk;
  else if (matId < 1.5) albedo = chalk * vec3(1.06, 1.04, 0.98);
  else if (matId < 2.5) albedo = chalk * 0.42;
  else if (matId < 3.5) {
    albedo = vec3(0.62, 0.36, 0.16);
    emit = vec3(0.28, 0.12, 0.03);
  } else if (matId < 4.5) {
    albedo = vec3(0.78, 0.46, 0.16);
    emit = vec3(0.16, 0.05, 0.01);
  } else if (matId < 5.5) {
    albedo = vec3(0.52, 0.16, 0.1);
    emit = vec3(0.08, 0.015, 0.01);
  } else if (matId < 6.5) albedo = vec3(0.34, 0.33, 0.31);
  else albedo = vec3(0.1, 0.105, 0.1);

  vec3 col = albedo * (0.035 + 0.97 * ndl) * mix(0.7, 1.0, up) + emit;
  col *= mix(0.62, 1.0, smoothstep(0.0, 0.4, v_world.y));
  if (matId > 6.5) {
    float occ = 1.0;
    for (int i = 0; i < 7; i++) {
      float d = length(v_world.xz - u_base[i].xy);
      occ *= mix(0.58, 1.0, smoothstep(0.02, u_base[i].z, d));
    }
    col *= occ;
  }
  col *= 0.965 + 0.035 * grain(v_world);
  float dist = length(v_world - u_eye);
  float T = exp(-u_sigma * clamp(dist, 0.0, 40.0));
  vec3 fog = vec3(0.035, 0.038, 0.042);
  col = mix(fog, max(col, 0.0), T);
  col = pow(max(col, 0.0), vec3(1.0 / 2.2));
  frag = vec4(col, 1.0);
}

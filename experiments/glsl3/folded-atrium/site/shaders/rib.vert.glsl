#version 300 es
precision highp float;

layout(location = 0) in vec3 a_pos;
layout(location = 1) in vec3 a_nrm;
layout(location = 2) in float a_mat;

uniform mat4 u_mvp;
uniform mat4 u_model;
uniform mat3 u_nmat;

out vec3 v_world;
out vec3 v_nrm;
out float v_mat;

void main() {
  vec4 world = u_model * vec4(a_pos, 1.0);
  v_world = world.xyz;
  v_nrm = normalize(u_nmat * a_nrm);
  v_mat = a_mat;
  gl_Position = u_mvp * vec4(a_pos, 1.0);
}

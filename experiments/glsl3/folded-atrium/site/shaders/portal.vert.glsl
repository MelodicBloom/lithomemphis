#version 300 es
precision highp float;

layout(location = 0) in vec3 a_pos;

uniform mat4 u_mvp;
uniform mat4 u_model;

out vec3 v_world;

void main() {
  vec4 world = u_model * vec4(a_pos, 1.0);
  v_world = world.xyz;
  gl_Position = u_mvp * vec4(a_pos, 1.0);
}

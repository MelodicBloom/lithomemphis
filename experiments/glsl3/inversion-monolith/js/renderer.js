import { deriveUniforms, uniformViolations } from './uniforms.js';

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) || 'compile failed';
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

export function createProgram(gl, vertSrc, fragSrc) {
  const vert = compile(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
  const program = gl.createProgram();
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.linkProgram(program);
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) || 'link failed';
    gl.deleteProgram(program);
    throw new Error(log);
  }
  const names = [
    'uResolution', 'uPhase', 'uCutZ', 'uLight', 'uFogSigma', 'uIdle', 'uBridge',
    'uEye', 'uForward', 'uRight', 'uUp', 'uFovTan', 'uVeinA', 'uVeinB', 'uEdgeA', 'uEdgeB', 'uCarveEdge',
  ];
  const loc = {};
  for (const name of names) loc[name] = gl.getUniformLocation(program, name);
  return { program, loc };
}

export function rendererInfo(gl) {
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  const vendor = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR);
  const renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  const software = /swiftshader|llvmpipe|softpipe|software|mesa/i.test(`${vendor} ${renderer}`);
  return { vendor: String(vendor), renderer: String(renderer), software };
}

export function draw(gl, gpu, state) {
  const width = gl.canvas.width;
  const height = gl.canvas.height;
  const uniforms = deriveUniforms(state, { width, height });
  const violations = uniformViolations(uniforms);
  if (violations.length || width < 1 || height < 1) {
    return { ok: false, violations, uniforms };
  }
  gl.viewport(0, 0, width, height);
  gl.useProgram(gpu.program);
  const { loc } = gpu;
  gl.uniform2f(loc.uResolution, width, height);
  gl.uniform1f(loc.uPhase, uniforms.phase);
  gl.uniform1f(loc.uCutZ, uniforms.cutZ);
  gl.uniform3f(loc.uLight, uniforms.light[0], uniforms.light[1], uniforms.light[2]);
  gl.uniform1f(loc.uFogSigma, uniforms.fogSigma);
  gl.uniform1f(loc.uIdle, uniforms.idle);
  gl.uniform1f(loc.uBridge, uniforms.bridge);
  gl.uniform3f(loc.uEye, uniforms.eye[0], uniforms.eye[1], uniforms.eye[2]);
  gl.uniform3f(loc.uForward, uniforms.forward[0], uniforms.forward[1], uniforms.forward[2]);
  gl.uniform3f(loc.uRight, uniforms.right[0], uniforms.right[1], uniforms.right[2]);
  gl.uniform3f(loc.uUp, uniforms.up[0], uniforms.up[1], uniforms.up[2]);
  gl.uniform1f(loc.uFovTan, uniforms.fovTan);
  gl.uniform3f(loc.uVeinA, uniforms.veinA[0], uniforms.veinA[1], uniforms.veinA[2]);
  gl.uniform3f(loc.uVeinB, uniforms.veinB[0], uniforms.veinB[1], uniforms.veinB[2]);
  gl.uniform3f(loc.uEdgeA, uniforms.edgeA[0], uniforms.edgeA[1], uniforms.edgeA[2]);
  gl.uniform3f(loc.uEdgeB, uniforms.edgeB[0], uniforms.edgeB[1], uniforms.edgeB[2]);
  gl.uniform1f(loc.uCarveEdge, uniforms.carveEdge);
  gl.drawArrays(gl.TRIANGLES, 0, 3);
  return { ok: true, violations: [], uniforms };
}

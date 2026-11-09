import { buildBox, buildFrame, RIBS, wallSpec, APERTURE, portalQuadZ } from "./geometry.mjs";
import { ident, mulMat, translation } from "./analytic.mjs";
import { deriveUniforms, markModel } from "./view.mjs";

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(log || "shader compile failed");
  }
  return shader;
}

function link(gl, vertSrc, fragSrc) {
  const program = gl.createProgram();
  const vert = compile(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compile(gl, gl.FRAGMENT_SHADER, fragSrc);
  gl.attachShader(program, vert);
  gl.attachShader(program, frag);
  gl.bindAttribLocation(program, 0, "a_pos");
  gl.bindAttribLocation(program, 1, "a_nrm");
  gl.bindAttribLocation(program, 2, "a_mat");
  gl.linkProgram(program);
  gl.deleteShader(vert);
  gl.deleteShader(frag);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(log || "program link failed");
  }
  return program;
}

function upload(gl, mesh) {
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const pos = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, pos);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.pos, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  const nrm = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, nrm);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.nrm, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  const mat = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, mat);
  gl.bufferData(gl.ARRAY_BUFFER, mesh.mat, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
  const idx = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idx);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.idx, gl.STATIC_DRAW);
  gl.bindVertexArray(null);
  return { vao, count: mesh.idx.length, buffers: [pos, nrm, mat, idx] };
}

function quadMesh(w, h, mat) {
  const x = w / 2;
  const y = h / 2;
  const pos = [-x, -y, 0, x, -y, 0, x, y, 0, -x, y, 0];
  const nrm = [0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1];
  const mats = [mat, mat, mat, mat];
  const idx = [0, 1, 2, 0, 2, 3];
  return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), mat: new Float32Array(mats), idx: new Uint32Array(idx) };
}

function floorMesh() {
  const mesh = { pos: [], nrm: [], mat: [], idx: [] };
  const y = 0;
  const corners = [[-6.5, y, 6.4], [6.5, y, 6.4], [6.5, y, -10.2], [-6.5, y, -10.2]];
  for (const c of corners) {
    mesh.pos.push(c[0], c[1], c[2]);
    mesh.nrm.push(0, 1, 0);
    mesh.mat.push(7);
  }
  mesh.idx.push(0, 1, 2, 0, 2, 3);
  return {
    pos: new Float32Array(mesh.pos),
    nrm: new Float32Array(mesh.nrm),
    mat: new Float32Array(mesh.mat),
    idx: new Uint32Array(mesh.idx),
  };
}

function rendererString(gl) {
  const ext = gl.getExtension("WEBGL_debug_renderer_info");
  if (!ext) return "unavailable";
  return `${gl.getParameter(ext.UNMASKED_VENDOR_WEBGL)} / ${gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)}`;
}

export function createRenderer(canvas, sources) {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: true,
    depth: true,
    stencil: false,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  });
  if (!gl) return { ok: false, reason: "no-webgl2" };

  let programs;
  try {
    programs = {
      rib: link(gl, sources.ribVert, sources.ribFrag),
      portal: link(gl, sources.portalVert, sources.portalFrag),
    };
  } catch (error) {
    return { ok: false, reason: "compile", detail: String(error.message || error) };
  }

  const meshes = {
    ribs: RIBS.map((ribSpec) => upload(gl, buildFrame(ribSpec, 0))),
    wall: upload(gl, buildFrame(wallSpec(), 0)),
    floor: upload(gl, floorMesh()),
    plinth: upload(gl, buildBox(4.8, 0.08, 2.4, 6)),
    pier: upload(gl, buildBox(0.28, 3.4, 4.2, 0)),
    bridge: upload(gl, buildBox(0.86, 0.2, 0.1, 0)),
    mark: upload(gl, buildBox(0.045, 0.2, 0.012, 3)),
    accent: upload(gl, buildBox(0.1, 0.16, 0.016, 4)),
    cap: upload(gl, buildBox(0.1, 0.045, 0.018, 5)),
    portal: upload(gl, quadMesh(APERTURE.halfW * 2, APERTURE.halfH * 2, 0)),
  };

  const timer = gl.getExtension("EXT_disjoint_timer_query_webgl2");
  const lose = gl.getExtension("WEBGL_lose_context");
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.cullFace(gl.BACK);
  gl.clearColor(0.027, 0.031, 0.035, 1);

  const gpu = {
    ok: true,
    gl,
    programs,
    meshes,
    timer,
    lose,
    renderer: rendererString(gl),
    timerSupported: !!timer,
    portal: true,
    probe: false,
    lost: false,
    restoredCount: 0,
  };

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    gpu.lost = true;
    gpu.onStatus?.("GPU context lost. Canonical state is held on the CPU.");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    gpu.lost = false;
    gpu.restoredCount += 1;
    rebuild(gpu, sources);
    gpu.onStatus?.("GPU context restored. Scene rebuilt from the same tick.");
  });
  return gpu;
}

function rebuild(gpu, sources) {
  const { gl } = gpu;
  gpu.programs = {
    rib: link(gl, sources.ribVert, sources.ribFrag),
    portal: link(gl, sources.portalVert, sources.portalFrag),
  };
  gpu.meshes = {
    ribs: RIBS.map((ribSpec) => upload(gl, buildFrame(ribSpec, 0))),
    wall: upload(gl, buildFrame(wallSpec(), 0)),
    floor: upload(gl, floorMesh()),
    plinth: upload(gl, buildBox(4.8, 0.08, 2.4, 6)),
    pier: upload(gl, buildBox(0.28, 3.4, 4.2, 0)),
    bridge: upload(gl, buildBox(0.86, 0.2, 0.1, 0)),
    mark: upload(gl, buildBox(0.045, 0.2, 0.012, 3)),
    accent: upload(gl, buildBox(0.1, 0.16, 0.016, 4)),
    cap: upload(gl, buildBox(0.1, 0.045, 0.018, 5)),
    portal: upload(gl, quadMesh(APERTURE.halfW * 2, APERTURE.halfH * 2, 0)),
  };
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.CULL_FACE);
  gl.clearColor(0.027, 0.031, 0.035, 1);
}

function uniformMat4(gl, loc, m) {
  gl.uniformMatrix4fv(loc, false, new Float32Array(m));
}

function uniformMat3(gl, loc, m) {
  gl.uniformMatrix3fv(loc, false, new Float32Array(m));
}

function drawMesh(gl, program, mesh, model, mvp, nmat) {
  gl.bindVertexArray(mesh.vao);
  uniformMat4(gl, gl.getUniformLocation(program, "u_model"), model);
  uniformMat4(gl, gl.getUniformLocation(program, "u_mvp"), mvp);
  const nloc = gl.getUniformLocation(program, "u_nmat");
  if (nloc && nmat) uniformMat3(gl, nloc, nmat);
  gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_INT, 0);
}

export function drawScene(gpu, scene, width, height) {
  if (!gpu?.ok || gpu.lost) return { ok: false, reason: gpu?.lost ? "lost" : "no-context" };
  const u = deriveUniforms(scene, width, height);
  if (!u.ok) return u;
  const { gl } = gpu;
  const started = performance.now();
  if (gl.drawingBufferWidth !== width || gl.drawingBufferHeight !== height) {
    gl.canvas.width = width;
    gl.canvas.height = height;
  }
  gl.viewport(0, 0, width, height);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  const program = gpu.programs.rib;
  gl.useProgram(program);
  gl.uniform3f(gl.getUniformLocation(program, "u_light"), u.light.x, u.light.y, u.light.z);
  gl.uniform3f(gl.getUniformLocation(program, "u_eye"), u.eye.x, u.eye.y, u.eye.z);
  gl.uniform1f(gl.getUniformLocation(program, "u_sigma"), u.sigma);
  gl.uniform1f(gl.getUniformLocation(program, "u_probe"), gpu.probe ? 1 : 0);
  const bases = new Float32Array(21);
  u.poses.forEach((pose, i) => {
    bases[i * 3] = pose.base.x;
    bases[i * 3 + 1] = pose.base.z;
    bases[i * 3 + 2] = pose.base.radius;
  });
  gl.uniform3fv(gl.getUniformLocation(program, "u_base"), bases);
  const identN = new Float64Array([1, 0, 0, 0, 1, 0, 0, 0, 1]);
  const draw = (mesh, model, nmat, tone) => {
    gl.uniform1f(gl.getUniformLocation(program, "u_tone"), tone);
    drawMesh(gl, program, mesh, model, mulMat(u.proj, mulMat(u.view, model)), nmat);
  };
  draw(gpu.meshes.floor, ident(), identN, 0.2);
  draw(gpu.meshes.plinth, translation(0.2, 0.04, 3.55), identN, 0.15);
  draw(gpu.meshes.pier, translation(-3.15, 1.7, -1.4), identN, 0.35);
  u.poses.forEach((pose, i) => {
    const tone = Math.min(1, Math.max(0, -pose.z / 8));
    draw(gpu.meshes.ribs[i], pose.model, pose.normal, tone);
  });
  draw(gpu.meshes.wall, translation(APERTURE.centerX, 0, APERTURE.wallZ), identN, 0.55);
  draw(gpu.meshes.accent, u.accentModel, u.poses[0].normal, 0);
  draw(gpu.meshes.cap, u.capModel, u.poses[0].normal, 0);
  u.locals.forEach((local, i) => {
    if (!local) return;
    draw(gpu.meshes.mark, markModel(u.poses[i], local), u.poses[i].normal, 0);
  });
  draw(gpu.meshes.bridge, u.bridgeModel, identN, 0.4);

  if (gpu.portal) {
    const pp = gpu.programs.portal;
    gl.useProgram(pp);
    gl.uniform3f(gl.getUniformLocation(pp, "u_eye"), u.eye.x, u.eye.y, u.eye.z);
    gl.uniform3f(gl.getUniformLocation(pp, "u_light"), u.light.x, u.light.y, u.light.z);
    gl.uniform1f(gl.getUniformLocation(pp, "u_sigma"), u.sigma);
    gl.uniform1f(gl.getUniformLocation(pp, "u_probe"), gpu.probe ? 1 : 0);
    gl.uniform2f(gl.getUniformLocation(pp, "u_center"), APERTURE.centerX, APERTURE.centerY);
    gl.uniform1f(gl.getUniformLocation(pp, "u_quadZ"), portalQuadZ());
    gl.uniform1f(gl.getUniformLocation(pp, "u_foldZ"), u.aperture.foldZ);
    gl.uniform2f(gl.getUniformLocation(pp, "u_half"), APERTURE.halfW, APERTURE.halfH);
    const model = translation(APERTURE.centerX, APERTURE.centerY, portalQuadZ());
    drawMesh(gl, pp, gpu.meshes.portal, model, mulMat(u.proj, mulMat(u.view, model)), null);
  }
  gl.bindVertexArray(null);
  const cpuMs = performance.now() - started;
  return { ok: true, cpuMs, uniforms: u };
}

export function readPixel(gpu, x, y) {
  const { gl } = gpu;
  const px = new Uint8Array(4);
  const gy = gl.drawingBufferHeight - 1 - y;
  gl.readPixels(x, gy, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
  return [px[0], px[1], px[2], px[3]];
}

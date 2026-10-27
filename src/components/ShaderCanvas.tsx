import { useEffect, useRef } from 'react'
import { motionSafe } from '../lib/spring'
/** WebGL1 fragment-shader surface. Modes: paper grain, thin-film nacre, ordered-dither fade. Falls back to 2D-canvas noise. */
export type ShaderMode = 'grain' | 'film' | 'dither'
const FRAG = `precision mediump float;uniform vec2 r;uniform float t;uniform vec2 m;uniform int mode;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+1.),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
float bayer(vec2 p){vec2 q=mod(floor(p),4.);float i=q.x+q.y*4.;
 return i<1.?0.:i<2.?8.:i<3.?2.:i<4.?10.:i<5.?12.:i<6.?4.:i<7.?14.:i<8.?6.:i<9.?3.:i<10.?11.:i<11.?1.:i<12.?9.:i<13.?15.:i<14.?7.:i<15.?13.:5.;}
void main(){vec2 uv=gl_FragCoord.xy/r;vec3 paper=vec3(.969,.965,.949);
 if(mode==0){float f=fbm(uv*vec2(8.,90.)+t*.02)*.6+fbm(uv*40.)*.4;float fib=smoothstep(.55,.9,fbm(uv*vec2(3.,60.)+3.));
  gl_FragColor=vec4(paper-vec3(.12,.13,.16)*f-vec3(.05,.04,.02)*fib,1.);}
 else if(mode==1){float d=fbm(uv*3.+m*.8+t*.05)*2.+dot(uv-.5,m-.5)*3.;
  vec3 c=.5+.5*cos(6.2831*(d*vec3(1.,1.05,1.1)+vec3(0.,.33,.67)));gl_FragColor=vec4(mix(paper,c,.55),1.);}
 else{float g=clamp(uv.x+ (sin(t*.6)*.5) ,0.,1.);float th=bayer(gl_FragCoord.xy/3.)/16.;
  vec3 ink=vec3(.345,.161,.294);gl_FragColor=vec4(g>th?paper:ink,1.);}}`
export default function ShaderCanvas({ mode = 'grain', className = '', paused = false }: { mode?: ShaderMode; className?: string; paused?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null), mouse = useRef([0.5, 0.5])
  useEffect(() => {
    const c = ref.current!; const dpr = Math.min(2, devicePixelRatio || 1)
    const fit = () => { c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr }; fit()
    const gl = c.getContext('webgl', { antialias: false }) as WebGLRenderingContext | null
    if (!gl) { const x = c.getContext('2d')!; const img = x.createImageData(c.width, c.height)
      for (let i = 0; i < img.data.length; i += 4) { const v = 225 + Math.random() * 30; img.data.set([v, v - 2, v - 8, 255], i) } x.putImageData(img, 0, 0); return }
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s }
    const p = gl.createProgram()!; gl.attachShader(p, sh(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0,1);}')); gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(p); gl.useProgram(p)
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer()); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW)
    const a = gl.getAttribLocation(p, 'a'); gl.enableVertexAttribArray(a); gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)
    const u = (k: string) => gl.getUniformLocation(p, k)
    gl.uniform1i(u('mode'), ({ grain: 0, film: 1, dither: 2 })[mode])
    let raf = 0; const t0 = performance.now()
    const draw = () => { gl.viewport(0, 0, c.width, c.height); gl.uniform2f(u('r'), c.width, c.height); gl.uniform1f(u('t'), (performance.now() - t0) / 1000)
      gl.uniform2f(u('m'), mouse.current[0], mouse.current[1]); gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!paused && !motionSafe()) raf = requestAnimationFrame(draw) }
    draw(); const ro = new ResizeObserver(() => { fit(); draw() }); ro.observe(c)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [mode, paused])
  return <canvas ref={ref} className={`lm-shader ${className}`} aria-hidden
    onPointerMove={e => { const r = e.currentTarget.getBoundingClientRect(); mouse.current = [(e.clientX - r.left) / r.width, 1 - (e.clientY - r.top) / r.height] }} />
}

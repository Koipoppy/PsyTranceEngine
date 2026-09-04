/**
 * Pastel audio-reactive psychedelic WebGL wash, rendered inside the stage panel.
 *
 * Technique credits (ideas adapted from open-source visual projects):
 * - Kali-set fractal fold: classic Shadertoy / raymarching-visualizer technique
 *   (cf. loopmaster-xyz fractal visualizer, "Fractal Dream").
 * - Cosine color palette: Inigo Quilez's public-domain `pal` formula.
 * - Audio-to-shader uniforms: the approach popularized by unconed/ThreeAudio.js.
 * - Kaleidoscopic sector folding as in many MIT visualizers (e.g.
 *   PavelDoGreat/WebGL-Fluid-Simulation's aesthetics).
 *
 * Light mode: near-white paper background with soft pastel filaments; the beat
 * gently saturates the core instead of flashing.
 */

const VERT = `
attribute vec2 aPos;
void main(){ gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uBass;    // 0..1 low band energy
uniform float uMid;     // 0..1 mid band energy
uniform float uHigh;    // 0..1 high band energy
uniform float uBeat;    // 1->0 decay after each kick
uniform float uHue;     // palette rotation (brightness knob)
uniform float uAbsurd;  // 0..1 structural craziness
uniform float uEnergy;  // overall arrangement energy 0..1

// iq cosine palette — public domain
vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d){
  return a + b * cos(6.28318 * (c * t + d));
}

mat2 rot(float a){ return mat2(cos(a), -sin(a), sin(a), cos(a)); }

void main(){
  vec2 uv = (gl_FragCoord.xy * 2.0 - uRes) / min(uRes.x, uRes.y);

  float t = uTime * 0.12;

  // Kaleidoscope fold: mirror + N-way angular sector fold.
  float sectors = 4.0 + floor(uAbsurd * 6.0);
  float ang = atan(uv.y, uv.x);
  float rad = length(uv);
  float sector = 6.28318 / sectors;
  ang = mod(ang, sector);
  ang = abs(ang - sector * 0.5);
  vec2 p = vec2(cos(ang), sin(ang)) * rad;

  // Slow rotation + gentle beat zoom.
  p *= rot(t * 0.35);
  p *= 1.12 + uBeat * 0.08 + uBass * 0.04;

  // Kali-set fractal fold — glow accumulates per iteration.
  vec2 c = vec2(
    0.88 + 0.09 * sin(t * 0.9) + uMid * 0.10,
    0.86 + 0.09 * cos(t * 0.7) + uBass * 0.08
  );
  float glow = 0.0;
  float orbit = 0.0;
  vec2 q = p * (0.6 + uAbsurd * 0.3);
  for (int i = 0; i < 8; i++) {
    q = abs(q) / dot(q, q) - c;
    float l = length(q);
    glow += exp(-l * (3.2 - uEnergy * 0.8));
    orbit += l;
  }
  glow /= 8.0;

  // Soft pastel palette blended onto near-white paper.
  float ph = t * 0.5 + uHue * 2.0 + glow * 0.9 + orbit * 0.02;
  vec3 tint = pal(ph, vec3(0.56, 0.58, 0.60), vec3(0.36, 0.35, 0.34), vec3(1.0), vec3(0.0, 0.33, 0.67));
  vec3 edge = pal(ph + 0.33, vec3(0.60), vec3(0.34), vec3(1.0), vec3(0.6));
  tint = mix(tint, edge, uHigh * 0.55);

  float intensity = pow(glow, 1.15) * (0.95 + uBeat * 0.4 + uBass * 0.2);
  vec3 paper = vec3(0.965, 0.972, 0.962);
  vec3 col = mix(paper, tint, clamp(intensity, 0.0, 1.0));

  // Soft colored core on beat.
  float core = exp(-rad * rad * (7.0 - uBeat * 3.0));
  col = mix(col, edge, core * (0.10 + uBeat * 0.18));

  // Fade back to paper at the edges so the panel reads calm.
  col = mix(col, paper, smoothstep(1.15, 2.1, rad) * 0.65);

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error("shader: " + gl.getShaderInfoLog(sh));
  }
  return sh;
}

export interface PsyVizInput {
  bass: number;
  mid: number;
  high: number;
  beat: number;
  brightness: number; // 0..1 (engine knob)
  absurdity: number;  // 0..1 (engine knob)
  energy: number;     // 0..1 (arrangement section energy)
}

export class PsyShader {
  private gl: WebGLRenderingContext;
  private uni: Record<string, WebGLUniformLocation | null> = {};
  private start = performance.now();

  constructor(canvas: HTMLCanvasElement) {
    const gl = (canvas.getContext("webgl", { antialias: false, alpha: false }) ||
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) throw new Error("WebGL not available");
    this.gl = gl;

    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      throw new Error("link: " + gl.getProgramInfoLog(prog));
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    for (const n of ["uRes", "uTime", "uBass", "uMid", "uHigh", "uBeat", "uHue", "uAbsurd", "uEnergy"]) {
      this.uni[n] = gl.getUniformLocation(prog, n);
    }
  }

  resize(w: number, h: number): void {
    this.gl.viewport(0, 0, w, h);
    this.gl.uniform2f(this.uni.uRes, w, h);
  }

  render(input: PsyVizInput): void {
    const gl = this.gl;
    gl.uniform1f(this.uni.uTime, (performance.now() - this.start) / 1000);
    gl.uniform1f(this.uni.uBass, input.bass);
    gl.uniform1f(this.uni.uMid, input.mid);
    gl.uniform1f(this.uni.uHigh, input.high);
    gl.uniform1f(this.uni.uBeat, input.beat);
    gl.uniform1f(this.uni.uHue, input.brightness);
    gl.uniform1f(this.uni.uAbsurd, input.absurdity);
    gl.uniform1f(this.uni.uEnergy, input.energy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}

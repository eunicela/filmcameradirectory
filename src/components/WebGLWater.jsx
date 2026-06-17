import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'

// WebGL water covering the whole tray interior: a CPU height-field feeds a
// height texture, and the fragment shader renders the ridged tray bottom, the
// dark developer fluid, and the floating photo, all refracted by the surface
// slope so the ripples distort the entire scene (not just the paper).
const RES = 8 // px per simulation cell (coarse = smooth waves)
const DAMPING = 0.965
const HEIGHT_SCALE = 0.0009
const MAX_HEIGHT = 500
const STEP_MS = 40 // fixed sim timestep; larger = slower waves

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uPhoto;
uniform sampler2D uHeight;
uniform vec2 uGrid;
uniform float uProgress;
uniform float uHasPhoto;
uniform float uRefract;
uniform float uMaxOffset;
uniform float uSpecK;
uniform vec4 uPaper;   // x, y, w, h in UV
uniform float uRidges; // ridge count across the tray

vec3 reveal(vec3 photo) {
  float vis = smoothstep(0.0, 1.0, uProgress);
  float colorMix = smoothstep(0.35, 1.0, uProgress);
  float lum = dot(photo, vec3(0.299, 0.587, 0.114));
  vec3 toned = mix(vec3(lum), photo, colorMix);
  vec3 r = mix(vec3(0.95), toned, vis);
  r = (r - 0.5) * (0.55 + 0.45 * vis) + 0.5 + (1.0 - vis) * 0.12;
  return mix(vec3(0.95), r, uHasPhoto);
}

vec3 scene(vec2 p) {
  // Dark developer fluid, deeper toward the bottom.
  vec3 liq = mix(vec3(0.13, 0.045, 0.035), vec3(0.025, 0.007, 0.006),
    clamp(p.y, 0.0, 1.0));
  // Ridged tray bottom: soft vertical channels.
  float ridge = 0.5 + 0.5 * sin(p.x * uRidges * 6.2831853);
  liq *= 0.78 + 0.22 * ridge;
  // Subtle channel shadow lines.
  liq -= smoothstep(0.46, 0.5, abs(fract(p.x * uRidges) - 0.5)) * 0.04;

  // Floating photo paper.
  vec2 rel = (p - uPaper.xy) / uPaper.zw;
  if (rel.x > 0.0 && rel.x < 1.0 && rel.y > 0.0 && rel.y < 1.0) {
    float b = 0.05;
    vec2 ph = (rel - b) / (1.0 - 2.0 * b);
    if (ph.x > 0.0 && ph.x < 1.0 && ph.y > 0.0 && ph.y < 1.0) {
      vec3 photo = texture2D(uPhoto, vec2(ph.x, 1.0 - ph.y)).rgb;
      return reveal(photo);
    }
    return vec3(0.93); // paper border
  }
  return liq;
}

void main() {
  vec2 t = 1.0 / uGrid;
  float sp = 1.6; // wide spacing -> smooth slope -> smooth distortion
  float hL = texture2D(uHeight, vUv - vec2(t.x * sp, 0.0)).r;
  float hR = texture2D(uHeight, vUv + vec2(t.x * sp, 0.0)).r;
  float hU = texture2D(uHeight, vUv - vec2(0.0, t.y * sp)).r;
  float hD = texture2D(uHeight, vUv + vec2(0.0, t.y * sp)).r;
  vec2 grad = vec2(hL - hR, hU - hD);

  vec2 off = grad * uRefract;
  float m = length(off);
  if (m > uMaxOffset) off *= uMaxOffset / m;
  vec3 col = scene(vUv + off);

  // Bright caustic glints off the surface slope (warm, to match safelight).
  float hh = abs(grad.x) + abs(grad.y);
  float s = pow(clamp(hh * uSpecK, 0.0, 1.0), 0.85);
  col += vec3(1.0, 0.9, 0.8) * s * 0.6;

  gl_FragColor = vec4(col, 1.0);
}
`

function compile(gl, type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    gl.deleteShader(sh)
    return null
  }
  return sh
}

const WebGLWater = forwardRef(function WebGLWater(
  { className, camera, developKey, duration = 4500 },
  ref,
) {
  const canvasRef = useRef(null)
  const simRef = useRef(null)
  const apiRef = useRef(null)

  useImperativeHandle(ref, () => ({
    addDrop(clientX, clientY, strength = 280) {
      const sim = simRef.current
      const canvas = canvasRef.current
      if (!sim || !canvas) return
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const nx = (clientX - rect.left) / rect.width
      const ny = (clientY - rect.top) / rect.height
      if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return
      const cx = Math.floor(nx * sim.cols)
      const cy = Math.floor(ny * sim.rows)
      const { cols, rows, b1 } = sim
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const x = cx + dx
          const y = cy + dy
          if (x < 1 || y < 1 || x >= cols - 1 || y >= rows - 1) continue
          b1[y * cols + x] += strength * Math.max(0, 1 - Math.hypot(dx, dy) / 3)
        }
      }
    },
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let gl = null
    try {
      gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    } catch {
      gl = null
    }
    if (!gl) return

    const vs = compile(gl, gl.VERTEX_SHADER, VERT)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vs || !fs) return
    const prog = gl.createProgram()
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return
    gl.useProgram(prog)

    const quad = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    )
    const aPos = gl.getAttribLocation(prog, 'aPos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const photoTex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, photoTex)
    gl.texImage2D(
      gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([238, 238, 238, 255]),
    )
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    const heightTex = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, heightTex)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)

    const uni = {
      uGrid: gl.getUniformLocation(prog, 'uGrid'),
      uProgress: gl.getUniformLocation(prog, 'uProgress'),
      uHasPhoto: gl.getUniformLocation(prog, 'uHasPhoto'),
      uRefract: gl.getUniformLocation(prog, 'uRefract'),
      uMaxOffset: gl.getUniformLocation(prog, 'uMaxOffset'),
      uSpecK: gl.getUniformLocation(prog, 'uSpecK'),
      uPaper: gl.getUniformLocation(prog, 'uPaper'),
      uRidges: gl.getUniformLocation(prog, 'uRidges'),
      uPhoto: gl.getUniformLocation(prog, 'uPhoto'),
      uHeight: gl.getUniformLocation(prog, 'uHeight'),
    }
    gl.uniform1i(uni.uPhoto, 0)
    gl.uniform1i(uni.uHeight, 1)
    gl.uniform1f(uni.uRefract, 3.5)
    gl.uniform1f(uni.uMaxOffset, 0.06)
    gl.uniform1f(uni.uSpecK, 26.0)
    gl.uniform1f(uni.uRidges, 7.0)

    const api = { gl, prog, photoTex, heightTex, uni, hasPhoto: 0, start: 0 }
    apiRef.current = api

    const setup = () => {
      const rect = canvas.getBoundingClientRect()
      const w = Math.max(1, Math.round(rect.width))
      const h = Math.max(1, Math.round(rect.height))
      canvas.width = w
      canvas.height = h
      const cols = Math.max(8, Math.round(w / RES))
      const rows = Math.max(8, Math.round(h / RES))
      simRef.current = {
        cols,
        rows,
        b1: new Float32Array(cols * rows),
        b2: new Float32Array(cols * rows),
        px: new Uint8Array(cols * rows * 4),
      }
      gl.viewport(0, 0, w, h)
      // Centered landscape (4:3) photo sized relative to the tray width.
      const pw = 0.6
      const ph = (pw * w * 0.75) / h
      gl.uniform4f(uni.uPaper, (1 - pw) / 2, (1 - ph) / 2, pw, ph)
    }
    setup()

    let ro
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(setup)
      ro.observe(canvas)
    }

    const step = (sim) => {
      const { cols, rows, b1, b2 } = sim
      for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < cols - 1; x++) {
          const i = y * cols + x
          let v =
            (b1[i - 1] + b1[i + 1] + b1[i - cols] + b1[i + cols]) / 2 - b2[i]
          v *= DAMPING
          if (v > MAX_HEIGHT) v = MAX_HEIGHT
          else if (v < -MAX_HEIGHT) v = -MAX_HEIGHT
          b2[i] = v
        }
      }
      sim.b1 = b2
      sim.b2 = b1
    }

    let raf
    let last = performance.now()
    let acc = 0
    const frame = () => {
      const now = performance.now()
      acc += now - last
      last = now
      const sim = simRef.current
      if (sim) {
        let steps = 0
        while (acc >= STEP_MS && steps < 4) {
          step(sim)
          acc -= STEP_MS
          steps++
        }
        const { cols, rows, b1, px } = sim
        for (let i = 0; i < b1.length; i++) {
          const hgt = b1[i]
          let r = Number.isFinite(hgt) ? 128 + hgt * HEIGHT_SCALE * 255 : 128
          r = r < 0 ? 0 : r > 255 ? 255 : r
          const p = i * 4
          px[p] = r
          px[p + 3] = 255
        }
        gl.activeTexture(gl.TEXTURE1)
        gl.bindTexture(gl.TEXTURE_2D, heightTex)
        gl.texImage2D(
          gl.TEXTURE_2D, 0, gl.RGBA, cols, rows, 0, gl.RGBA,
          gl.UNSIGNED_BYTE, px,
        )

        const progress = api.hasPhoto
          ? Math.min(1, (performance.now() - api.start) / duration)
          : 0
        gl.uniform2f(uni.uGrid, cols, rows)
        gl.uniform1f(uni.uProgress, progress)
        gl.uniform1f(uni.uHasPhoto, api.hasPhoto)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, photoTex)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
      }
      raf = requestAnimationFrame(frame)
    }
    if (typeof requestAnimationFrame !== 'undefined') {
      raf = requestAnimationFrame(frame)
    }

    return () => {
      if (raf) cancelAnimationFrame(raf)
      ro?.disconnect()
      gl.deleteProgram(prog)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(quad)
      gl.deleteTexture(photoTex)
      gl.deleteTexture(heightTex)
      apiRef.current = null
    }
  }, [duration])

  useEffect(() => {
    const api = apiRef.current
    if (!api || !camera) return
    let cancelled = false
    const img = new Image()
    img.onload = () => {
      if (cancelled) return
      const { gl, photoTex } = api
      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, photoTex)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      api.hasPhoto = 1
      api.start = performance.now()
    }
    img.src = camera.image
    return () => {
      cancelled = true
    }
  }, [camera, developKey])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
})

export default WebGLWater

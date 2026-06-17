import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'

// Classic "ripple tank" height-field water simulation.
// Two height buffers are propagated each frame so waves spread, reflect off
// the tray walls, and interfere like real water. Surface slope is rendered as
// specular highlights, screen-blended over the dark developer fluid.
const RES = 5 // px per simulation cell
const DAMPING = 0.962

function splash(s, cx, cy, strength) {
  const { cols, rows, b1 } = s
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      const x = cx + dx
      const y = cy + dy
      if (x < 1 || y < 1 || x >= cols - 1 || y >= rows - 1) continue
      const falloff = Math.max(0, 1 - Math.hypot(dx, dy) / 3)
      b1[y * cols + x] += strength * falloff
    }
  }
}

function propagate(s) {
  const { cols, rows, b1, b2 } = s
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const i = y * cols + x
      let v =
        (b1[i - 1] + b1[i + 1] + b1[i - cols] + b1[i + cols]) / 2 - b2[i]
      v *= DAMPING
      b2[i] = v
    }
  }
  s.b1 = b2
  s.b2 = b1
}

function render(ctx, s) {
  const { cols, rows, b1, img } = s
  const data = img.data
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x
      const gx = (x > 0 ? b1[i - 1] : b1[i]) - (x < cols - 1 ? b1[i + 1] : b1[i])
      const gy =
        (y > 0 ? b1[i - cols] : b1[i]) - (y < rows - 1 ? b1[i + cols] : b1[i])
      const slope = Math.min(1, (Math.abs(gx) + Math.abs(gy)) * 0.011)
      const p = i * 4
      // Warm peach specular glint that suits the red safelight.
      data[p] = 255
      data[p + 1] = 214
      data[p + 2] = 188
      data[p + 3] = slope * slope * 235
    }
  }
  ctx.putImageData(img, 0, 0)
}

const WaterCanvas = forwardRef(function WaterCanvas(
  { className, active = true },
  ref,
) {
  const canvasRef = useRef(null)
  const stateRef = useRef(null)
  const activeRef = useRef(active)
  activeRef.current = active

  useImperativeHandle(ref, () => ({
    addDrop(clientX, clientY, strength = 300) {
      const s = stateRef.current
      const canvas = canvasRef.current
      if (!s || !canvas) return
      const rect = canvas.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const nx = (clientX - rect.left) / rect.width
      const ny = (clientY - rect.top) / rect.height
      if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return
      splash(s, Math.floor(nx * s.cols), Math.floor(ny * s.rows), strength)
    },
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let ctx = null
    try {
      ctx = canvas.getContext('2d')
    } catch {
      ctx = null
    }
    if (!ctx || typeof requestAnimationFrame === 'undefined') return

    const setup = () => {
      const rect = canvas.getBoundingClientRect()
      const cols = Math.max(8, Math.round(rect.width / RES))
      const rows = Math.max(8, Math.round(rect.height / RES))
      canvas.width = cols
      canvas.height = rows
      stateRef.current = {
        cols,
        rows,
        b1: new Float32Array(cols * rows),
        b2: new Float32Array(cols * rows),
        img: ctx.createImageData(cols, rows),
      }
    }
    setup()

    let ro
    if (typeof ResizeObserver !== 'undefined') {
      ro = new ResizeObserver(setup)
      ro.observe(canvas)
    }

    let raf
    let tick = 0
    const frame = () => {
      const s = stateRef.current
      if (s && activeRef.current) {
        // Occasional faint ambient drop keeps the fluid subtly alive.
        if (++tick % 70 === 0) {
          splash(
            s,
            2 + Math.floor(Math.random() * (s.cols - 4)),
            2 + Math.floor(Math.random() * (s.rows - 4)),
            38,
          )
        }
        propagate(s)
        render(ctx, s)
      } else if (s) {
        ctx.clearRect(0, 0, s.cols, s.rows)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
})

export default WaterCanvas

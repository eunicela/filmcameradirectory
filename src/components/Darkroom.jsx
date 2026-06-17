import { useCallback, useEffect, useRef, useState } from 'react'
import { cameras } from '../data/cameras.js'
import { useReducedMotion } from '../hooks/useReducedMotion.js'
import '../darkroom.css'

const DEVELOP_MS = 4500
const MAX_RIPPLES = 24
let rippleId = 0

export default function Darkroom({ onClose }) {
  const reduced = useReducedMotion()
  const [camera, setCamera] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | developing | developed
  const [ripples, setRipples] = useState([])
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const trayRef = useRef(null)
  const lastMove = useRef(0)
  const timer = useRef(null)

  useEffect(() => () => clearTimeout(timer.current), [])

  const develop = useCallback(() => {
    clearTimeout(timer.current)
    setCamera((prev) => {
      if (cameras.length === 0) return prev
      let next = prev
      while (cameras.length > 1 && (!next || next.id === prev?.id)) {
        next = cameras[Math.floor(Math.random() * cameras.length)]
      }
      return next ?? cameras[0]
    })
    setPhase('developing')
    timer.current = setTimeout(
      () => setPhase('developed'),
      reduced ? 200 : DEVELOP_MS,
    )
  }, [reduced])

  const spawnRipple = useCallback((e, strong) => {
    const el = trayRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const id = ++rippleId
    setRipples((r) => [...r.slice(-(MAX_RIPPLES - 1)), { id, x, y, strong }])
    setTilt({
      ry: (x / rect.width - 0.5) * 9,
      rx: -(y / rect.height - 0.5) * 9,
    })
  }, [])

  const onPointerMove = useCallback(
    (e) => {
      if (reduced) return
      const now = performance.now()
      if (now - lastMove.current < 55) return
      lastMove.current = now
      spawnRipple(e, false)
    },
    [reduced, spawnRipple],
  )

  const onPointerDown = useCallback(
    (e) => {
      if (reduced) return
      spawnRipple(e, true)
    },
    [reduced, spawnRipple],
  )

  const removeRipple = useCallback((id) => {
    setRipples((r) => r.filter((x) => x.id !== id))
  }, [])

  return (
    <div className="darkroom">
      <div className="safelight" aria-hidden="true" />

      <header className="dr-top">
        <button className="dr-back" onClick={onClose}>
          ← Back to directory
        </button>
        <h1 className="dr-title">Darkroom</h1>
      </header>

      <div
        className="tray"
        ref={trayRef}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
      >
        <div className="liquid" aria-hidden="true">
          {ripples.map((r) => (
            <span
              key={r.id}
              className={`ripple ${r.strong ? 'strong' : ''}`}
              style={{ left: `${r.x}px`, top: `${r.y}px` }}
              onAnimationEnd={() => removeRipple(r.id)}
            />
          ))}
        </div>

        <div className="paper-wrap">
          <div
            className={`film-paper phase-${phase} ${reduced ? 'reduced' : ''}`}
            style={{ '--rx': `${tilt.rx}deg`, '--ry': `${tilt.ry}deg` }}
          >
            {camera ? (
              <img
                key={camera.id + phase}
                src={camera.image}
                alt={phase === 'idle' ? '' : `Developed photo of ${camera.name}`}
              />
            ) : (
              <span className="paper-hint">
                Press “Random camera” to develop a photo
              </span>
            )}
            <div className="develop-overlay" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="develop-controls">
        <button className="dr-btn" onClick={develop}>
          {phase === 'idle' ? '🎞️ Random camera' : '🎞️ Develop another'}
        </button>
        {phase !== 'idle' && camera && (
          <p className="dr-caption">
            {phase === 'developed' ? camera.name : 'Developing…'}
          </p>
        )}
      </div>
    </div>
  )
}

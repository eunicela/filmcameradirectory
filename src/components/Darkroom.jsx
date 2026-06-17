import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cameras } from '../data/cameras.js'
import { useReducedMotion } from '../hooks/useReducedMotion.js'
import WaterCanvas from './WaterCanvas.jsx'
import WebGLWater from './WebGLWater.jsx'
import '../darkroom.css'

const DEVELOP_MS = 4500

function supportsWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (c.getContext('webgl') || c.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}

export default function Darkroom({ onClose }) {
  const reduced = useReducedMotion()
  const webgl = useMemo(supportsWebGL, [])
  const useGL = webgl && !reduced
  const [camera, setCamera] = useState(null)
  const [phase, setPhase] = useState('idle') // idle | developing | developed
  const [developKey, setDevelopKey] = useState(0)
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 })
  const trayRef = useRef(null)
  const waterRef = useRef(null)
  const glRef = useRef(null)
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
    setDevelopKey((k) => k + 1)
    setPhase('developing')
    timer.current = setTimeout(
      () => setPhase('developed'),
      reduced ? 200 : DEVELOP_MS,
    )
  }, [reduced])

  const updateTilt = useCallback((e) => {
    const el = trayRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setTilt({
      ry: ((e.clientX - rect.left) / rect.width - 0.5) * 9,
      rx: -((e.clientY - rect.top) / rect.height - 0.5) * 9,
    })
  }, [])

  const drop = useCallback((e, water, gl) => {
    waterRef.current?.addDrop(e.clientX, e.clientY, water)
    glRef.current?.addDrop(e.clientX, e.clientY, gl)
  }, [])

  const onPointerMove = useCallback(
    (e) => {
      if (reduced) return
      updateTilt(e)
      const now = performance.now()
      if (now - lastMove.current < 24) return
      lastMove.current = now
      drop(e, 150, 320)
    },
    [reduced, updateTilt, drop],
  )

  const onPointerDown = useCallback(
    (e) => {
      if (reduced) return
      updateTilt(e)
      drop(e, 640, 600)
    },
    [reduced, updateTilt, drop],
  )

  return (
    <div className="darkroom">
      <div className="safelight" aria-hidden="true" />

      <header className="dr-top">
        <button className="dr-back" onClick={onClose}>
          Back
        </button>
      </header>

      <div
        className="tray"
        ref={trayRef}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerDown}
      >
        <div className="liquid" aria-hidden="true" />

        <div className="paper-wrap">
          <div
            className={`film-paper phase-${phase} ${reduced ? 'reduced' : ''}`}
            style={{ '--rx': `${tilt.rx}deg`, '--ry': `${tilt.ry}deg` }}
          >
            {!camera && (
              <span className="paper-hint">
                Press “Random camera” to develop a photo
              </span>
            )}
            {camera && useGL && (
              <WebGLWater
                ref={glRef}
                className="photo-gl"
                camera={camera}
                developKey={developKey}
                duration={DEVELOP_MS}
              />
            )}
            {camera && !useGL && (
              <img
                key={camera.id + phase}
                src={camera.image}
                alt={`Developed photo of ${camera.name}`}
              />
            )}
            <div className="develop-overlay" aria-hidden="true" />
          </div>
        </div>

        {!reduced && <WaterCanvas ref={waterRef} className="water" active />}
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

import { useMemo, useState } from 'react'
import { cameras } from './data/cameras.js'
import Darkroom from './components/Darkroom.jsx'

export default function App() {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('All')
  const [view, setView] = useState('directory')

  const types = useMemo(
    () => ['All', ...Array.from(new Set(cameras.map((c) => c.type)))],
    [],
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return cameras.filter((c) => {
      const matchesType = type === 'All' || c.type === type
      const matchesQuery =
        q === '' ||
        c.name.toLowerCase().includes(q) ||
        c.brand.toLowerCase().includes(q) ||
        c.format.toLowerCase().includes(q)
      return matchesType && matchesQuery
    })
  }, [query, type])

  if (view === 'darkroom') {
    return <Darkroom onClose={() => setView('directory')} />
  }

  return (
    <div className="app">
      <header className="hero">
        <div className="hero-text">
          <h1>📷 Film Camera Directory</h1>
          <p>Browse classic film cameras by name, brand, format, or type.</p>
        </div>
        <button className="darkroom-link" onClick={() => setView('darkroom')}>
          🌙 Darkroom
        </button>
      </header>

      <div className="controls">
        <input
          className="search"
          type="search"
          placeholder="Search cameras, brands, formats…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search cameras"
        />
        <div className="filters">
          {types.map((t) => (
            <button
              key={t}
              className={`chip ${type === t ? 'active' : ''}`}
              onClick={() => setType(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <p className="count">
        {results.length} {results.length === 1 ? 'camera' : 'cameras'}
      </p>

      <ul className="grid">
        {results.map((c) => (
          <li key={c.id} className="card">
            <div className="thumb">
              <img src={c.image} alt={c.name} loading="lazy" />
            </div>
            <div className="card-head">
              <h2>{c.name}</h2>
              <span className="year">{c.year}</span>
            </div>
            <div className="badges">
              <span className="badge brand">{c.brand}</span>
              <span className="badge">{c.format}</span>
              <span className="badge">{c.type}</span>
            </div>
            <p className="desc">{c.description}</p>
            <p className="mount">Mount: {c.mount}</p>
          </li>
        ))}
      </ul>

      {results.length === 0 && (
        <p className="empty">No cameras match your search.</p>
      )}
    </div>
  )
}

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import App from './App.jsx'

describe('Film Camera Directory', () => {
  it('renders the heading', () => {
    render(<App />)
    expect(
      screen.getByRole('heading', { name: /film camera directory/i }),
    ).toBeInTheDocument()
  })

  it('filters cameras by search query', () => {
    render(<App />)
    const input = screen.getByLabelText(/search cameras/i)
    fireEvent.change(input, { target: { value: 'leica' } })
    expect(screen.getByText('Leica M6')).toBeInTheDocument()
    expect(screen.queryByText('Canon AE-1')).not.toBeInTheDocument()
  })

  it('filters cameras by type chip', () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: 'Rangefinder' }))
    expect(screen.getByText('Leica M6')).toBeInTheDocument()
    expect(screen.queryByText('Pentax K1000')).not.toBeInTheDocument()
  })
})

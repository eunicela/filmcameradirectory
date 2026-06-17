import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import Darkroom from './Darkroom.jsx'

describe('Darkroom', () => {
  it('starts blank with no developed photo', () => {
    render(<Darkroom onClose={() => {}} />)
    expect(
      screen.getByRole('button', { name: /random camera/i }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('img')).toBeNull()
  })

  it('develops a camera photo when the reveal button is clicked', () => {
    render(<Darkroom onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /random camera/i }))
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute('src')
    expect(img.getAttribute('src')).toMatch(/\/cameras\//)
  })

  it('calls onClose when back button is clicked', () => {
    let closed = false
    render(<Darkroom onClose={() => (closed = true)} />)
    fireEvent.click(screen.getByRole('button', { name: /back to directory/i }))
    expect(closed).toBe(true)
  })
})

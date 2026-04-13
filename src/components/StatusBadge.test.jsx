import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusBadge } from './StatusBadge'

describe('StatusBadge', () => {
  it('renderiza badge de loading', () => {
    render(<StatusBadge loading />)
    expect(screen.getByText('Carregando...')).toHaveClass('loading')
  })

  it('renderiza badge de erro', () => {
    render(<StatusBadge error="fail" />)
    expect(screen.getByText('Erro')).toHaveClass('error')
  })

  it('prioriza erro sobre loading', () => {
    render(<StatusBadge loading error="fail" />)
    expect(screen.getByText('Erro')).toBeInTheDocument()
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
  })

  it('não renderiza nada sem props', () => {
    const { container } = render(<StatusBadge />)
    expect(container.innerHTML).toBe('')
  })
})

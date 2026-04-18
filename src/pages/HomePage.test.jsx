import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import { HomePage } from './HomePage'

const mockGetCounts = vi.hoisted(() => vi.fn())
vi.mock('../hooks/useApiProdutos', () => ({
  useCounts: mockGetCounts,
}))

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCounts.mockReturnValue({ data: { reval: 3, ideal: 2 } })
  })

  it('renderiza welcome', () => {
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Bem-vindo a Papelaria Galileu')).toBeInTheDocument()
  })

  it('mostra contadores', () => {
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Reval: 3')).toBeInTheDocument()
    expect(screen.getByText('Ideal: 2')).toBeInTheDocument()
  })

  it('chama onNavigate ao clicar Buscar Produtos', () => {
    const onNavigate = vi.fn()
    renderWithProviders(<HomePage onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('Buscar Produtos'))
    expect(onNavigate).toHaveBeenCalledWith('produtos')
  })
})

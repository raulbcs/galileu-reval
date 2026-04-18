import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import { ProdutoCard } from './ProdutoCard'
import { mockProduto } from '../test/fixtures'

vi.mock('../hooks/useRevalApi', () => ({
  useImagemCapa: vi.fn().mockReturnValue({ data: null, isLoading: false }),
}))

describe('ProdutoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renderiza dados do produto', async () => {
    renderWithProviders(<ProdutoCard produto={mockProduto} />)

    expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    expect(screen.getByText('Abafador de som premium')).toBeInTheDocument()
    expect(screen.getByText('VIP')).toBeInTheDocument()
    expect(screen.getByText(/R\$ 25\.9/)).toBeInTheDocument()
    expect(screen.getByText(/088590/)).toBeInTheDocument()
    expect(screen.getByText(/100 a 250 un/)).toBeInTheDocument()
  })

  it('chama onClick com codigo e supplier ao clicar', async () => {
    const onClick = vi.fn()
    renderWithProviders(<ProdutoCard produto={{ ...mockProduto, supplier: 'reval' }} onClick={onClick} />)

    fireEvent.click(screen.getByText('ABAFADOR VIP PRETO'))
    expect(onClick).toHaveBeenCalledWith('088590', 'reval')
  })

  it('renderiza como link clicavel', () => {
    const { container } = renderWithProviders(<ProdutoCard produto={{ ...mockProduto, supplier: 'reval' }} onClick={() => {}} />)
    const card = container.querySelector('.produto-card')
    expect(card.tagName).toBe('A')
    expect(card.getAttribute('href')).toBe('/produto/reval/088590')
  })
})

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import { ProdutoCard } from './ProdutoCard'
import { mockProduto } from '../test/fixtures'

vi.mock('../api/imageCache', () => ({
  fetchAndCacheImage: vi.fn().mockResolvedValue(null),
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

  it('chama onClick com codigo ao clicar', async () => {
    const onClick = vi.fn()
    renderWithProviders(<ProdutoCard produto={mockProduto} onClick={onClick} />)

    fireEvent.click(screen.getByText('ABAFADOR VIP PRETO'))
    expect(onClick).toHaveBeenCalledWith('088590')
  })

  it('não tem cursor pointer sem onClick', () => {
    const { container } = renderWithProviders(<ProdutoCard produto={mockProduto} />)
    const card = container.querySelector('.produto-card')
    expect(card.style.cursor).toBe('')
  })

  it('tem cursor pointer com onClick', () => {
    const { container } = renderWithProviders(<ProdutoCard produto={mockProduto} onClick={() => {}} />)
    const card = container.querySelector('.produto-card')
    expect(card.style.cursor).toBe('pointer')
  })
})

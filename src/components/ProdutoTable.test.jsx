import { describe, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import { ProdutoTable } from './ProdutoTable'
import { mockProdutos } from '../test/fixtures'

vi.mock('../api/imageCache', () => ({
  fetchAndCacheImage: vi.fn().mockResolvedValue(null),
}))

describe('ProdutoTable', () => {
  it('mostra loading', () => {
    renderWithProviders(<ProdutoTable loading />)
    expect(screen.getByText('Carregando produtos...')).toBeInTheDocument()
  })

  it('mostra erro', () => {
    renderWithProviders(<ProdutoTable error={{ message: 'Falha na API' }} />)
    expect(screen.getByText(/Falha na API/)).toBeInTheDocument()
  })

  it('mostra empty state', () => {
    renderWithProviders(<ProdutoTable produtos={[]} />)
    expect(screen.getByText('Nenhum produto encontrado.')).toBeInTheDocument()
  })

  it('renderiza grid de produtos', async () => {
    renderWithProviders(<ProdutoTable produtos={mockProdutos} />)
    expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    expect(screen.getByText('CANETA AZUL')).toBeInTheDocument()
    expect(screen.getByText('ABAFADOR VIP BRANCO')).toBeInTheDocument()
  })
})

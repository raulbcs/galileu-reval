import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import { ProdutosPage } from './ProdutosPage'
import { mockProdutos } from '../test/fixtures'

const getProdutos = vi.hoisted(() => vi.fn())
vi.mock('../api/client', () => ({
  getProdutos: getProdutos,
}))
vi.mock('../api/imageCache', () => ({
  fetchAndCacheImage: vi.fn().mockResolvedValue(null),
}))

describe('ProdutosPage', () => {
  beforeEach(() => {
    getProdutos.mockResolvedValue([...mockProdutos])
  })

  it('mostra loading inicialmente', () => {
    getProdutos.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<ProdutosPage />)
    expect(screen.getByText(/Carregando produtos/)).toBeInTheDocument()
  })

  it('renderiza lista de produtos com total', async () => {
    renderWithProviders(<ProdutosPage />)
    await waitFor(() => {
      expect(screen.getByText(/Produtos \(3 total\)/)).toBeInTheDocument()
    })
    expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    expect(screen.getByText('CANETA AZUL')).toBeInTheDocument()
  })

  it('chama onSelectProduto ao clicar em produto', async () => {
    const onSelect = vi.fn()
    renderWithProviders(<ProdutosPage onSelectProduto={onSelect} />)
    await waitFor(() => {
      expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('ABAFADOR VIP PRETO'))
    expect(onSelect).toHaveBeenCalledWith('088590')
  })

  it('mostra erro quando API falha', async () => {
    getProdutos.mockRejectedValue(new Error('Falha na API'))
    renderWithProviders(<ProdutosPage />)
    await waitFor(() => {
      expect(screen.getByText(/Falha na API/)).toBeInTheDocument()
    })
  })

  it('renderiza paginação', async () => {
    const muitos = Array.from({ length: 25 }, (_, i) => ({
      ...mockProdutos[0],
      codigo: String(1000 + i),
      nome: `Produto ${i}`,
    }))
    getProdutos.mockResolvedValue(muitos)
    renderWithProviders(<ProdutosPage />)
    await waitFor(() => {
      expect(screen.getByText(/Produtos \(25 total\)/)).toBeInTheDocument()
    })
    expect(screen.getByText('Próxima')).toBeInTheDocument()
  })
})

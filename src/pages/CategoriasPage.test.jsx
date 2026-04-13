import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import { CategoriasPage } from './CategoriasPage'
import { mockCategorias, mockProdutos } from '../test/fixtures'

const getCategorias = vi.hoisted(() => vi.fn())
const getProdutosByCategoria = vi.hoisted(() => vi.fn())

vi.mock('../api/client', () => ({
  getCategorias,
  getProdutosByCategoria,
}))
vi.mock('../api/imageCache', () => ({
  fetchAndCacheImage: vi.fn().mockResolvedValue(null),
}))

describe('CategoriasPage', () => {
  beforeEach(() => {
    getCategorias.mockResolvedValue(mockCategorias)
    getProdutosByCategoria.mockResolvedValue(mockProdutos)
  })

  it('mostra loading de categorias', () => {
    getCategorias.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<CategoriasPage />)
    expect(screen.getByText('Carregando categorias...')).toBeInTheDocument()
  })

  it('lista categorias como tags', async () => {
    renderWithProviders(<CategoriasPage />)
    await waitFor(() => {
      expect(screen.getByText('Papelaria')).toBeInTheDocument()
      expect(screen.getByText('Escritorio')).toBeInTheDocument()
      expect(screen.getByText('Artes')).toBeInTheDocument()
    })
  })

  it('clica em categoria e mostra produtos', async () => {
    renderWithProviders(<CategoriasPage />)
    await waitFor(() => {
      expect(screen.getByText('Papelaria')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Papelaria'))

    await waitFor(() => {
      expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    })
  })

  it('volta para lista de categorias', async () => {
    renderWithProviders(<CategoriasPage />)
    await waitFor(() => {
      expect(screen.getByText('Papelaria')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Papelaria'))

    await waitFor(() => {
      expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('← Voltar'))

    await waitFor(() => {
      expect(screen.getByText('Escritorio')).toBeInTheDocument()
    })
  })

  it('chama onNavigateTo ao selecionar categoria', async () => {
    const onNavigateTo = vi.fn()
    renderWithProviders(<CategoriasPage onNavigateTo={onNavigateTo} />)
    await waitFor(() => {
      expect(screen.getByText('Papelaria')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Papelaria'))
    expect(onNavigateTo).toHaveBeenCalledWith('categorias', 'Papelaria')
  })

  it('mostra erro quando API falha', async () => {
    getCategorias.mockRejectedValue(new Error('Erro ao carregar'))
    renderWithProviders(<CategoriasPage />)
    await waitFor(() => {
      expect(screen.getByText(/Erro ao carregar/)).toBeInTheDocument()
    })
  })
})

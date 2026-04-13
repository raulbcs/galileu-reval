import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import { FornecedoresPage } from './FornecedoresPage'
import { mockFornecedores, mockProdutos } from '../test/fixtures'

const getFornecedores = vi.hoisted(() => vi.fn())
const getProdutos = vi.hoisted(() => vi.fn())

vi.mock('../api/client', () => ({
  getFornecedores,
  getProdutos,
}))
vi.mock('../api/imageCache', () => ({
  fetchAndCacheImage: vi.fn().mockResolvedValue(null),
}))

describe('FornecedoresPage', () => {
  beforeEach(() => {
    getFornecedores.mockResolvedValue(mockFornecedores)
    getProdutos.mockResolvedValue([...mockProdutos])
  })

  it('lista fornecedores como tags', async () => {
    renderWithProviders(<FornecedoresPage />)
    await waitFor(() => {
      expect(screen.getByText('VIP')).toBeInTheDocument()
      expect(screen.getByText('BIC')).toBeInTheDocument()
      expect(screen.getByText('Faber Castell')).toBeInTheDocument()
    })
  })

  it('clica em fornecedor e filtra produtos por marca', async () => {
    renderWithProviders(<FornecedoresPage />)
    await waitFor(() => {
      expect(screen.getByText('VIP')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('VIP'))

    await waitFor(() => {
      expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
      expect(screen.getByText('ABAFADOR VIP BRANCO')).toBeInTheDocument()
      expect(screen.queryByText('CANETA AZUL')).not.toBeInTheDocument()
    })
  })

  it('volta para lista de fornecedores', async () => {
    renderWithProviders(<FornecedoresPage />)
    await waitFor(() => {
      expect(screen.getByText('VIP')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('VIP'))
    await waitFor(() => {
      expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('← Voltar'))

    await waitFor(() => {
      expect(screen.getByText('BIC')).toBeInTheDocument()
    })
  })

  it('chama onNavigateTo ao selecionar fornecedor', async () => {
    const onNavigateTo = vi.fn()
    renderWithProviders(<FornecedoresPage onNavigateTo={onNavigateTo} />)
    await waitFor(() => {
      expect(screen.getByText('VIP')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('VIP'))
    expect(onNavigateTo).toHaveBeenCalledWith('fornecedores', 'VIP')
  })

  it('mostra empty state para fornecedor sem produtos', async () => {
    renderWithProviders(<FornecedoresPage />)
    await waitFor(() => {
      expect(screen.getByText('Faber Castell')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Faber Castell'))

    await waitFor(() => {
      expect(screen.getByText('Nenhum produto encontrado para este fornecedor.')).toBeInTheDocument()
    })
  })

  it('chama onClearPreSelect com initialSelected', async () => {
    const onClearPreSelect = vi.fn()
    renderWithProviders(
      <FornecedoresPage initialSelected="VIP" onClearPreSelect={onClearPreSelect} />
    )
    expect(onClearPreSelect).toHaveBeenCalled()
  })
})

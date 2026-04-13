import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import { HomePage } from './HomePage'
import { mockProdutos } from '../test/fixtures'

const getProdutos = vi.hoisted(() => vi.fn())
vi.mock('../api/client', () => ({
  getProdutos: getProdutos,
}))
vi.mock('../api/imageCache', () => ({
  fetchAndCacheImage: vi.fn().mockResolvedValue(null),
}))

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getProdutos.mockResolvedValue([...mockProdutos])
  })

  it('renderiza welcome e formulário de busca', () => {
    renderWithProviders(<HomePage />)
    expect(screen.getByText('Bem-vindo a Papelaria Galileu')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ex: ABAFADOR')).toBeInTheDocument()
  })

  it('busca por nome e mostra resultados', async () => {
    renderWithProviders(<HomePage />)
    const input = screen.getByPlaceholderText('Ex: ABAFADOR')
    fireEvent.change(input, { target: { value: 'ABAFADOR' } })

    await waitFor(() => {
      expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
      expect(screen.getByText('ABAFADOR VIP BRANCO')).toBeInTheDocument()
      expect(screen.queryByText('CANETA AZUL')).not.toBeInTheDocument()
    })
  })

  it('busca por código Reval', async () => {
    renderWithProviders(<HomePage />)
    fireEvent.click(screen.getByText('Codigo Reval'))
    const input = screen.getByPlaceholderText('Ex: 088590')
    fireEvent.change(input, { target: { value: '088590' } })

    await waitFor(() => {
      expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
      expect(screen.queryByText('CANETA AZUL')).not.toBeInTheDocument()
    })
  })

  it('busca por código de barras', async () => {
    renderWithProviders(<HomePage />)
    fireEvent.click(screen.getByText('Cod. Barras'))
    const input = screen.getByPlaceholderText('Ex: 7891040351916')
    fireEvent.change(input, { target: { value: '7891040351916' } })

    await waitFor(() => {
      expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    })
  })

  it('mostra empty state para busca sem resultados', async () => {
    renderWithProviders(<HomePage />)
    const input = screen.getByPlaceholderText('Ex: ABAFADOR')
    fireEvent.change(input, { target: { value: 'XYZINVALIDO' } })

    await waitFor(() => {
      expect(screen.getByText('Nenhum produto encontrado.')).toBeInTheDocument()
    })
  })

  it('não busca com menos de 3 caracteres', () => {
    renderWithProviders(<HomePage />)
    const input = screen.getByPlaceholderText('Ex: ABAFADOR')
    fireEvent.change(input, { target: { value: 'AB' } })
    expect(screen.queryByText('Nenhum produto encontrado.')).not.toBeInTheDocument()
    expect(getProdutos).not.toHaveBeenCalled()
  })

  it('chama onSelectProduto ao clicar em produto', async () => {
    const onSelect = vi.fn()
    renderWithProviders(<HomePage onSelectProduto={onSelect} />)
    const input = screen.getByPlaceholderText('Ex: ABAFADOR')
    fireEvent.change(input, { target: { value: 'ABAFADOR' } })

    await waitFor(() => {
      expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText('ABAFADOR VIP PRETO'))
    expect(onSelect).toHaveBeenCalledWith('088590')
  })
})

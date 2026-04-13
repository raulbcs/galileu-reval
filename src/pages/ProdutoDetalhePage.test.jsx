import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import { ProdutoDetalhePage } from './ProdutoDetalhePage'
import { mockProduto, mockImagens } from '../test/fixtures'

const getProduto = vi.hoisted(() => vi.fn())
const getImagens = vi.hoisted(() => vi.fn())

vi.mock('../api/client', () => ({
  getProduto,
  getImagens,
}))

describe('ProdutoDetalhePage', () => {
  beforeEach(() => {
    getProduto.mockResolvedValue(mockProduto)
    getImagens.mockResolvedValue(mockImagens)
  })

  it('mostra loading inicialmente', () => {
    getProduto.mockReturnValue(new Promise(() => {}))
    renderWithProviders(<ProdutoDetalhePage codigo="088590" />)
    expect(screen.getByText('Carregando produto...')).toBeInTheDocument()
  })

  it('renderiza detalhes do produto', async () => {
    renderWithProviders(<ProdutoDetalhePage codigo="088590" />)

    await waitFor(() => {
      expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    })
    expect(screen.getByText('Abafador de som premium')).toBeInTheDocument()
    expect(screen.getByText(/R\$ 25\.9/)).toBeInTheDocument()
    expect(screen.getByText(/100 a 250 un/)).toBeInTheDocument()
    expect(screen.getByText('088590')).toBeInTheDocument()
    expect(screen.getByText('7891040351916')).toBeInTheDocument()
    expect(screen.getByText('39269090')).toBeInTheDocument()
  })

  it('chama onBack ao clicar Voltar', async () => {
    const onBack = vi.fn()
    renderWithProviders(<ProdutoDetalhePage codigo="088590" onBack={onBack} />)

    await waitFor(() => {
      expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Voltar'))
    expect(onBack).toHaveBeenCalled()
  })

  it('mostra mensagem para produto não encontrado', async () => {
    getProduto.mockResolvedValue(null)
    renderWithProviders(<ProdutoDetalhePage codigo="INVALIDO" />)

    await waitFor(() => {
      expect(screen.getByText('Produto nao encontrado.')).toBeInTheDocument()
    })
  })

  it('renderiza galeria de imagens', async () => {
    renderWithProviders(<ProdutoDetalhePage codigo="088590" />)

    await waitFor(() => {
      expect(screen.getByText(/Imagens \(2\)/)).toBeInTheDocument()
    })
  })

  it('abre lightbox ao clicar na imagem da galeria', async () => {
    renderWithProviders(<ProdutoDetalhePage codigo="088590" />)

    await waitFor(() => {
      expect(screen.getByText(/Imagens \(2\)/)).toBeInTheDocument()
    })
    const galeriaImgs = screen.getAllByRole('img')
    const galeriaItem = galeriaImgs.find(img => img.alt === 'img1.jpg')
    fireEvent.click(galeriaItem)

    expect(screen.getByText('×')).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('fecha lightbox com Escape', async () => {
    renderWithProviders(<ProdutoDetalhePage codigo="088590" />)

    await waitFor(() => {
      expect(screen.getByText(/Imagens \(2\)/)).toBeInTheDocument()
    })
    const galeriaImgs = screen.getAllByRole('img')
    const galeriaItem = galeriaImgs.find(img => img.alt === 'img1.jpg')
    fireEvent.click(galeriaItem)
    expect(screen.getByText('1 / 2')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByText('1 / 2')).not.toBeInTheDocument()
  })

  it('navega entre imagens com setas do teclado', async () => {
    renderWithProviders(<ProdutoDetalhePage codigo="088590" />)

    await waitFor(() => {
      expect(screen.getByText(/Imagens \(2\)/)).toBeInTheDocument()
    })
    const galeriaImgs = screen.getAllByRole('img')
    const galeriaItem = galeriaImgs.find(img => img.alt === 'img1.jpg')
    fireEvent.click(galeriaItem)
    expect(screen.getByText('1 / 2')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('chama onNavigateTo ao clicar na Marca', async () => {
    const onNavigateTo = vi.fn()
    renderWithProviders(
      <ProdutoDetalhePage codigo="088590" onNavigateTo={onNavigateTo} />
    )

    await waitFor(() => {
      expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('VIP'))
    expect(onNavigateTo).toHaveBeenCalledWith('fornecedores', 'VIP')
  })

  it('mostra informações adicionais quando presentes', async () => {
    renderWithProviders(<ProdutoDetalhePage codigo="088590" />)

    await waitFor(() => {
      expect(screen.getByText('Informacoes adicionais')).toBeInTheDocument()
      expect(screen.getByText('Produto de alta qualidade')).toBeInTheDocument()
    })
  })
})

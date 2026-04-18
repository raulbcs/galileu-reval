import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import { ProdutoDetalhePage } from './ProdutoDetalhePage'

const mockUseProduto = vi.hoisted(() => vi.fn())
const mockUseImagens = vi.hoisted(() => vi.fn())

vi.mock('../hooks/useApiProdutos', () => ({
  useProduto: mockUseProduto,
}))
vi.mock('../hooks/useRevalApi', () => ({
  useImagens: mockUseImagens,
}))

const mockProduto = {
  codigo: '088590',
  supplier: 'reval',
  nome: 'ABAFADOR VIP PRETO',
  descricao: 'Abafador de som premium',
  marca: 'VIP',
  ean: '7891040351916',
  ncm: '39269090',
  cfop: '5102',
  cst: '00',
  icms: 18,
  origem_descricao: 'Nacional',
  embalagem: 'PCT',
  peso: 0.3,
  altura: 10,
  largura: 15,
  comprimento: 20,
  preco: 25.9,
  estoque: 'A',
  referencia: 'REF001',
  lista: 'LISTA VIP',
  inf_adicionais: 'Produto de alta qualidade',
}

const mockImagens = [
  { id: 1, nome: 'img1.jpg', arquivo: btoa('fake-image-data-1'), capa: true },
  { id: 2, nome: 'img2.jpg', arquivo: btoa('fake-image-data-2'), capa: false },
]

describe('ProdutoDetalhePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseProduto.mockReturnValue({ data: mockProduto, isLoading: false, error: null })
    mockUseImagens.mockReturnValue({ data: mockImagens, isLoading: false })
  })

  it('mostra loading inicialmente', () => {
    mockUseProduto.mockReturnValue({ data: undefined, isLoading: true, error: null })
    renderWithProviders(<ProdutoDetalhePage codigo="088590" supplier="reval" />)
    expect(screen.getByText('Carregando produto...')).toBeInTheDocument()
  })

  it('renderiza detalhes do produto', async () => {
    renderWithProviders(<ProdutoDetalhePage codigo="088590" supplier="reval" />)

    await waitFor(() => {
      expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    })
    expect(screen.getByText('Abafador de som premium')).toBeInTheDocument()
    expect(screen.getByText(/R\$ 25\.90/)).toBeInTheDocument()
    expect(screen.getByText(/100 a 250 un/)).toBeInTheDocument()
    expect(screen.getByText('088590')).toBeInTheDocument()
    expect(screen.getByText('7891040351916')).toBeInTheDocument()
    expect(screen.getByText('39269090')).toBeInTheDocument()
  })

  it('chama onBack ao clicar Voltar', async () => {
    const onBack = vi.fn()
    renderWithProviders(<ProdutoDetalhePage codigo="088590" supplier="reval" onBack={onBack} />)

    await waitFor(() => {
      expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('Voltar'))
    expect(onBack).toHaveBeenCalled()
  })

  it('mostra mensagem para produto nao encontrado', async () => {
    mockUseProduto.mockReturnValue({ data: null, isLoading: false, error: null })
    renderWithProviders(<ProdutoDetalhePage codigo="INVALIDO" supplier="reval" />)

    await waitFor(() => {
      expect(screen.getByText('Produto nao encontrado.')).toBeInTheDocument()
    })
  })

  it('renderiza galeria de imagens', async () => {
    renderWithProviders(<ProdutoDetalhePage codigo="088590" supplier="reval" />)

    await waitFor(() => {
      expect(screen.getByText(/Imagens \(2\)/)).toBeInTheDocument()
    })
  })

  it('abre lightbox ao clicar na imagem da galeria', async () => {
    renderWithProviders(<ProdutoDetalhePage codigo="088590" supplier="reval" />)

    await waitFor(() => {
      expect(screen.getByText(/Imagens \(2\)/)).toBeInTheDocument()
    })
    const galeriaImgs = screen.getAllByRole('img')
    const galeriaItem = galeriaImgs.find(img => img.alt === 'img1.jpg')
    fireEvent.click(galeriaItem)

    expect(screen.getByText('\u00d7')).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
  })

  it('fecha lightbox com Escape', async () => {
    renderWithProviders(<ProdutoDetalhePage codigo="088590" supplier="reval" />)

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
    renderWithProviders(<ProdutoDetalhePage codigo="088590" supplier="reval" />)

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
      <ProdutoDetalhePage codigo="088590" supplier="reval" onNavigateTo={onNavigateTo} />
    )

    await waitFor(() => {
      expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('VIP'))
    expect(onNavigateTo).toHaveBeenCalledWith('fornecedores', 'VIP')
  })

  it('mostra informacoes adicionais quando presentes', async () => {
    renderWithProviders(<ProdutoDetalhePage codigo="088590" supplier="reval" />)

    await waitFor(() => {
      expect(screen.getByText('Informacoes adicionais')).toBeInTheDocument()
      expect(screen.getByText('Produto de alta qualidade')).toBeInTheDocument()
    })
  })

  it('renderiza detalhe de produto Ideal', async () => {
    const mockIdealProduto = {
      codigo: '138971',
      supplier: 'ideal',
      nome: 'CANETA IDEAL',
      descricao: 'Caneta premium',
      marca: 'Ideal',
      ean: '7891234567890',
      ncm: '96081000',
      embalagem: 'CX',
      peso: 0.1,
      altura: 2,
      largura: 5,
      comprimento: 15,
      preco: 12.5,
      estoque: '50',
      referencia: 'REF-IDEAL',
      categoria: 'Papelaria',
      origem: 'Nacional',
      ean_caixa: '7891234567890123',
      imagem_url: 'https://cdn.example.com/img.jpg',
      url: 'https://example.com/produto',
    }
    mockUseProduto.mockReturnValue({ data: mockIdealProduto, isLoading: false, error: null })

    renderWithProviders(<ProdutoDetalhePage codigo="138971" supplier="ideal" />)

    await waitFor(() => {
      expect(screen.getByText('CANETA IDEAL')).toBeInTheDocument()
    })
    expect(screen.getByText('Caneta premium')).toBeInTheDocument()
    expect(screen.getAllByText('Ideal').some(el => el.classList.contains('supplier-badge'))).toBe(true)
    expect(screen.getByText('138971')).toBeInTheDocument()
    expect(screen.getByText(/R\$ 12\.50/)).toBeInTheDocument()
    expect(screen.getByText('Papelaria')).toBeInTheDocument()
    expect(screen.getByText('Ver no site Atacado Ideal')).toBeInTheDocument()
  })

  it('mostra erro ao carregar produto', async () => {
    mockUseProduto.mockReturnValue({ data: undefined, isLoading: false, error: new Error('fail') })
    renderWithProviders(<ProdutoDetalhePage codigo="088590" supplier="reval" />)

    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar produto.')).toBeInTheDocument()
    })
  })

  it('fecha lightbox ao clicar no overlay', async () => {
    renderWithProviders(<ProdutoDetalhePage codigo="088590" supplier="reval" />)

    await waitFor(() => {
      expect(screen.getByText(/Imagens \(2\)/)).toBeInTheDocument()
    })
    const galeriaImgs = screen.getAllByRole('img')
    const galeriaItem = galeriaImgs.find(img => img.alt === 'img1.jpg')
    fireEvent.click(galeriaItem)
    expect(screen.getByText('1 / 2')).toBeInTheDocument()

    fireEvent.click(screen.getByText('\u00d7').closest('.lightbox-overlay'))
    expect(screen.queryByText('1 / 2')).not.toBeInTheDocument()
  })
})

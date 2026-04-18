import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, fireEvent, waitFor } from '@testing-library/react'
import { renderWithProviders } from '../test/render'
import { ProdutosPage } from './ProdutosPage'

const mockSearchProdutos = vi.hoisted(() => vi.fn())
const mockGetCounts = vi.hoisted(() => vi.fn())
const mockGetMarcas = vi.hoisted(() => vi.fn())
vi.mock('../hooks/useApiProdutos', () => ({
  useSearchProdutos: mockSearchProdutos,
  useCounts: mockGetCounts,
  useMarcas: mockGetMarcas,
}))
vi.mock('../hooks/useRevalApi', () => ({
  useImagemCapa: vi.fn().mockReturnValue({ data: null, isLoading: false }),
}))

const mockItems = [
  { id: 'reval:1', codigo: '088590', supplier: 'reval', nome: 'ABAFADOR VIP PRETO', descricao: 'desc', marca: 'VIP', preco: 25.9, estoque: 'A', embalagem: 'PCT' },
  { id: 'reval:2', codigo: '088591', supplier: 'reval', nome: 'ABAFADOR VIP BRANCO', descricao: 'desc', marca: 'VIP', preco: 30.5, estoque: 'G', embalagem: 'CX' },
  { id: 'reval:3', codigo: '099999', supplier: 'reval', nome: 'CANETA AZUL', descricao: 'desc', marca: 'BIC', preco: 5.0, estoque: 'N', embalagem: 'UN' },
]

describe('ProdutosPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetCounts.mockReturnValue({ data: { reval: 3, ideal: 0 } })
    mockGetMarcas.mockReturnValue({ data: ['BIC', 'VIP'] })
    mockSearchProdutos.mockReturnValue({
      data: { items: mockItems, total: 3, page: 1, pageSize: 21, totalPages: 1 },
      isLoading: false,
      error: null,
    })
  })

  it('renderiza lista de produtos', async () => {
    renderWithProviders(<ProdutosPage />)
    expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    expect(screen.getByText('CANETA AZUL')).toBeInTheDocument()
  })

  it('renderiza filtros de busca, marca e preco', () => {
    renderWithProviders(<ProdutosPage />)
    expect(screen.getByPlaceholderText('Buscar por nome, descricao ou marca...')).toBeInTheDocument()
    expect(screen.getByText('BUSCA:')).toBeInTheDocument()
    expect(screen.getByText('FORNECEDOR:')).toBeInTheDocument()
    expect(screen.getByText('MARCA:')).toBeInTheDocument()
    expect(screen.getByText('PRECO:')).toBeInTheDocument()
  })

  it('renderiza combobox de marcas', () => {
    renderWithProviders(<ProdutosPage />)
    expect(screen.getByPlaceholderText('Buscar marca...')).toBeInTheDocument()
  })

  it('filtra por marca via combobox', async () => {
    renderWithProviders(<ProdutosPage />)
    const input = screen.getByPlaceholderText('Buscar marca...')
    fireEvent.change(input, { target: { value: 'VI' } })
    const dropdownItem = await screen.findByText('VIP', { selector: '.combobox-item' })
    fireEvent.click(dropdownItem)
    expect(mockSearchProdutos).toHaveBeenCalledWith(
      expect.objectContaining({ marca: 'VIP' })
    )
  })

  it('chama onSelectProduto ao clicar em produto', async () => {
    const onSelect = vi.fn()
    renderWithProviders(<ProdutosPage onSelectProduto={onSelect} />)
    await waitFor(() => {
      expect(screen.getByText('ABAFADOR VIP PRETO')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByText('ABAFADOR VIP PRETO'))
    expect(onSelect).toHaveBeenCalledWith('088590', 'reval')
  })

  it('mostra erro quando API falha', async () => {
    mockSearchProdutos.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: new Error('Falha na API'),
    })
    renderWithProviders(<ProdutosPage />)
    expect(screen.getByText(/Erro:/)).toBeInTheDocument()
  })

  it('renderiza paginacao', async () => {
    const muitos = Array.from({ length: 25 }, (_, i) => ({
      id: `reval:${1000 + i}`,
      codigo: String(1000 + i),
      supplier: 'reval',
      nome: `Produto ${i}`,
      descricao: 'desc',
      marca: 'M',
      preco: 10,
      estoque: 'A',
      embalagem: 'UN',
    }))
    mockSearchProdutos.mockReturnValue({
      data: { items: muitos, total: 25, page: 1, pageSize: 21, totalPages: 2 },
      isLoading: false,
      error: null,
    })
    renderWithProviders(<ProdutosPage />)
    expect(screen.getByText('Próxima')).toBeInTheDocument()
  })

  it('filtra por fornecedor', () => {
    renderWithProviders(<ProdutosPage />)
    const revalBtn = screen.getAllByText('Reval').find(el => el.classList.contains('supplier-filter-btn'))
    fireEvent.click(revalBtn)
    expect(mockSearchProdutos).toHaveBeenCalledWith(
      expect.objectContaining({ supplier: 'reval' })
    )
  })
})

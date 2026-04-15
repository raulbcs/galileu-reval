import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as XLSX from 'xlsx'

vi.mock('xlsx', async () => {
  const actual = await vi.importActual('xlsx')
  return {
    ...actual,
    writeFile: vi.fn(),
  }
})

describe('exportToXlsx', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('gera XLSX com colunas corretas e SKU Galileu', async () => {
    const { exportToXlsx } = await import('./export')

    const produtos = [
      {
        codigo: '088590',
        codigoBarras: '7891040351916',
        nome: 'ABAFADOR VIP PRETO',
        descricao: 'Abafador de som premium',
        marca: 'VIP',
        preco: 25.9,
        estoque: 'A',
        embalagem: 'PCT',
        peso: 0.3,
        altura: 10,
        largura: 15,
        comprimento: 20,
        ncm: '39269090',
        cfop: '5102',
        cst: '00',
        icms: 18,
        origemDescricao: 'Nacional',
        referencia: 'REF001',
        lista: 'LISTA VIP',
        procedencia: 'Nacional',
        reposicao: false,
        infAdicionais: 'Info extra',
      },
    ]

    exportToXlsx(produtos)

    expect(XLSX.writeFile).toHaveBeenCalledOnce()
    const [workbook, filename] = XLSX.writeFile.mock.calls[0]
    expect(filename).toMatch(/^produtos_galileu_\d{4}-\d{2}-\d{2}\.xlsx$/)

    const ws = workbook.Sheets.Produtos
    const json = XLSX.utils.sheet_to_json(ws)
    expect(json).toHaveLength(1)

    const row = json[0]
    expect(row['Codigo']).toBe('088590')
    expect(row['Nome']).toBe('ABAFADOR VIP PRETO')
    expect(row['Marca']).toBe('VIP')
    expect(row['SKU Galileu']).toBe('BFDR-VPPX-BFDR-001')
    expect(row['Preco']).toBe(25.9)
    expect(row['NCM']).toBe('39269090')
  })

  it('preenche campos ausentes com string vazia', async () => {
    const { exportToXlsx } = await import('./export')

    exportToXlsx([{ codigo: '1', nome: 'Teste', marca: 'Marca', descricao: 'Desc' }])

    const ws = XLSX.writeFile.mock.calls[0][0].Sheets.Produtos
    const json = XLSX.utils.sheet_to_json(ws)
    expect(json[0]['Codigo de Barras']).toBe('')
    expect(json[0]['Referencia']).toBe('')
  })
})

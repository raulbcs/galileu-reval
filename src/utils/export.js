import * as XLSX from 'xlsx'

const COLUNAS = [
  { header: 'Fornecedor', key: '_supplier' },
  { header: 'Codigo', key: 'codigo' },
  { header: 'Codigo de Barras', key: 'codigoBarras' },
  { header: 'Nome', key: 'nome' },
  { header: 'Descricao', key: 'descricao' },
  { header: 'Marca', key: 'marca' },
  { header: 'Preco', key: 'preco' },
  { header: 'Estoque', key: 'estoque' },
  { header: 'Embalagem', key: 'embalagem' },
  { header: 'Peso (kg)', key: 'peso' },
  { header: 'Altura (cm)', key: 'altura' },
  { header: 'Largura (cm)', key: 'largura' },
  { header: 'Comprimento (cm)', key: 'comprimento' },
  { header: 'NCM', key: 'ncm' },
  { header: 'CFOP', key: 'cfop' },
  { header: 'CST', key: 'cst' },
  { header: 'ICMS (%)', key: 'icms' },
  { header: 'Origem', key: 'origemDescricao' },
  { header: 'Referencia', key: 'referencia' },
  { header: 'Lista', key: 'lista' },
  { header: 'Procedencia', key: 'procedencia' },
  { header: 'Reposicao', key: 'reposicao' },
  { header: 'Informacoes Adicionais', key: 'infAdicionais' },
]

export function exportToXlsx(produtos) {
  const rows = produtos.map((p) => {
    const row = {}
    for (const col of COLUNAS) {
      row[col.header] = col.key === '_supplier'
        ? (p.supplier === 'ideal' ? 'Atacado Ideal' : 'Reval')
        : (p[col.key] ?? '')
    }
    return row
  })

  const ws = XLSX.utils.json_to_sheet(rows)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Produtos')

  const colWidths = COLUNAS.map((col) => ({
    wch: Math.max(col.header.length + 2, 14),
  }))
  ws['!cols'] = colWidths

  const now = new Date()
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-')
  XLSX.writeFile(wb, `produtos_galileu_${date}.xlsx`)
}

export const mockProduto = {
  codigo: '088590',
  codigoBarras: '7891040351916',
  codigoBarrasUnit: '7891040351916',
  codigoBarrasMaster: '7891040351923',
  nome: 'ABAFADOR VIP PRETO',
  descricao: 'Abafador de som premium',
  marca: 'VIP',
  procedencia: 'Nacional',
  peso: 0.3,
  altura: 10,
  largura: 15,
  comprimento: 20,
  preco: 25.9,
  cfop: '5102',
  cst: '00',
  icms: 18,
  estoque: 'A',
  embalagem: 'PCT',
  referencia: 'REF001',
  ncm: '39269090',
  lista: 'LISTA VIP',
  infAdicionais: 'Produto de alta qualidade',
  origem: '0',
  origemDescricao: 'Nacional',
  dataAttProduto: '2025-01-15',
  dataAlteracaoImagem: '2025-01-10',
  reposicao: false,
}

export const mockProduto2 = {
  codigo: '088591',
  codigoBarras: '7891040351923',
  nome: 'ABAFADOR VIP BRANCO',
  descricao: 'Abafador de som branco',
  marca: 'VIP',
  preco: 30.5,
  estoque: 'G',
  embalagem: 'CX',
  ncm: '39269090',
  cfop: '5102',
  cst: '00',
  icms: 18,
  altura: 10,
  largura: 15,
  comprimento: 20,
  lista: 'LISTA VIP',
}

export const mockProduto3 = {
  codigo: '099999',
  codigoBarras: '7891040399999',
  nome: 'CANETA AZUL',
  descricao: 'Caneta esferográfica azul',
  marca: 'BIC',
  preco: 5.0,
  estoque: 'N',
  embalagem: 'UN',
  ncm: '96081000',
  cfop: '5102',
  cst: '00',
  icms: 18,
  altura: 2,
  largura: 1,
  comprimento: 15,
  lista: 'LISTA ESCRITORIO',
}

export const mockCategorias = [
  { id: 1, descricao: 'Papelaria', subCategorias: [{ idSubCategoria: 1, descricao: 'Cadernos' }] },
  { id: 2, descricao: 'Escritorio', subCategorias: [] },
  { id: 3, descricao: 'Artes', subCategorias: [] },
]

export const mockFornecedores = [
  { codigo: 'F001', descricao: 'VIP' },
  { codigo: 'F002', descricao: 'BIC' },
  { codigo: 'F003', descricao: 'Faber Castell' },
]

export const mockLicencas = [
  { licenca: 'L001', descricao: 'Disney' },
  { licenca: 'L002', descricao: 'Marvel' },
]

export const mockImagens = [
  { id: 1, nome: 'img1.jpg', arquivo: btoa('fake-image-data-1'), capa: true },
  { id: 2, nome: 'img2.jpg', arquivo: btoa('fake-image-data-2'), capa: false },
]

export const mockProdutos = [mockProduto, mockProduto2, mockProduto3]

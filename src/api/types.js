/**
 * Reval API response types (JSDoc for reference)
 *
 * TokenResponse: { access_token, token_type, expires_in, codigo_reval }
 * Categoria: { id, descricao, subCategorias: [{ idSubCategoria, descricao }] }
 * Fornecedor: { codigo, descricao }
 * Licenca: { licenca, descricao }
 * Produto: {
 *   codigo, codigoBarras, codigoBarrasUnit, codigoBarrasMaster,
 *   nome, descricao, marca, procedencia, peso, altura, largura, comprimento,
 *   preco, cfop, cst, icms, estoque, embalagem, referencia, ncm, lista,
 *   infAdicionais, origem, origemDescricao, dataAttProduto, dataAlteracaoImagem, reposicao
 * }
 * ProdutoPage: { totalRegistros, models: Produto[] }
 * Imagem: { id, produto, nome, arquivo, dataAtualizacao, horaAtualizacao, capa, aplicacao, data, hora }
 */

export {}

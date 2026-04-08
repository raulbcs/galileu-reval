/**
 * Traduz código de estoque para faixa de quantidade.
 * Qtd < 30 | R 30-50 | N 50-100 | A 100-250 | G > 250
 */
export function traduzirEstoque(codigo) {
  const map = {
    Qtd: 'Menos de 30 un',
    R: '30 a 50 un',
    N: '50 a 100 un',
    A: '100 a 250 un',
    G: 'Mais de 250 un',
  }
  return map[codigo] || codigo
}

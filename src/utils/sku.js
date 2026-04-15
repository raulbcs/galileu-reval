/**
 * Gera SKUs no formato NNNN-MMMM-DDDD-SSS
 *
 * NNNN = 4 consoantes do nome do produto
 * MMMM = 4 consoantes da marca
 * DDDD = 4 consoantes da descrição
 * SSS  = 3 dígitos derivados do código Reval (determinístico, estável)
 */

const VOGAIS = new Set('AEIOU')

function consoantes(texto, n) {
  const cons = [...texto.toUpperCase()].filter(c => /[A-Z]/.test(c) && !VOGAIS.has(c))
  return cons.slice(0, n).join('').padEnd(n, 'X')
}

/**
 * DJB2 — algoritmo de hash de Daniel J. Bernstein (1991).
 * hash = hash * 33 + charCode, por caractere.
 * (hash << 5) - hash é o mesmo que hash * 32 - hash = hash * 33.
 * | 0 trunca pra 32-bit, Math.abs + módulo 999 + 1 resulta em 001–999.
 */
function djb2(codigo) {
  let hash = 0
  for (let i = 0; i < codigo.length; i++) {
    hash = ((hash << 5) - hash + codigo.charCodeAt(i)) | 0
  }
  return (Math.abs(hash) % 999) + 1
}

export function gerarSku(nome, marca, descricao, codigo) {
  const sss = String(djb2(String(codigo))).padStart(3, '0')
  return `${consoantes(nome, 4)}-${consoantes(marca, 4)}-${consoantes(descricao, 4)}-${sss}`
}

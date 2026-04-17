export function calcPreco(custo, lucro, taxaFixa, comissaoPct, adsPct, impostosPct, recebimentoPct, frete = 0) {
  const divisor = 1 - (comissaoPct / 100 + adsPct / 100 + impostosPct / 100 + recebimentoPct / 100)
  if (divisor <= 0) return null
  return (custo + lucro + taxaFixa + frete) / divisor
}

export function breakdown(preco, comissaoPct, adsPct, taxaFixa, impostosPct, recebimentoPct, frete = 0) {
  if (!preco) return {}
  const comissaoVal = preco * (comissaoPct / 100)
  const adsVal = preco * (adsPct / 100)
  const impostosVal = preco * (impostosPct / 100)
  const recebimentoVal = preco * (recebimentoPct / 100)
  const descontos = comissaoVal + adsVal + taxaFixa + frete + impostosVal + recebimentoVal
  return { comissaoVal, adsVal, impostosVal, recebimentoVal, descontos }
}

export function fmt(v) {
  return 'R$ ' + v.toFixed(2).replace('.', ',')
}

export function fmtPct(v) {
  return v.toFixed(1).replace('.', ',')
}

export function parseInput(raw) {
  if (raw === '' || raw === undefined || raw === null) return 0
  return parseFloat(String(raw).replace(',', '.')) || 0
}

export function toInputStr(num) {
  if (!num) return ''
  const s = num.toFixed(2)
  return s.endsWith('.00') ? s.slice(0, -3).replace('.', ',') || '0' : s.replace('.', ',')
}

export function fmtFaixaML(v) {
  if (v < 12.50) return { taxa: v / 2, desc: '50% do preço (< R$12,50)' }
  if (v < 29) return { taxa: 6.25, desc: 'R$6,25 (R$12,50–R$29)' }
  if (v < 50) return { taxa: 6.50, desc: 'R$6,50 (R$29–R$50)' }
  if (v < 79) return { taxa: 6.75, desc: 'R$6,75 (R$50–R$79)' }
  return { taxa: 0, desc: 'Isento (≥ R$79)' }
}

export function shopeeSubsidio(preco) {
  if (preco < 80) return 20
  if (preco < 200) return 30
  return 40
}

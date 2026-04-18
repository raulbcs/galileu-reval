const TABS = [
  { key: 'produtos', label: 'Busca de Produtos' },
  { key: 'simulador', label: 'Simulador de Preços' },
]

export { TABS }

export function buildUrl(tab, filter, produto, supplier) {
  if (produto) return supplier ? `/produto/${supplier}/${produto}` : `/produto/${produto}`
  if (!tab || tab === 'home') return '/'
  if (filter) return `/${tab}/${encodeURIComponent(filter)}`
  return `/${tab}`
}

export function readUrl(pathname = window.location.pathname) {
  const path = pathname.replace(/\/+$/, '')
  if (!path || path === '/') return { tab: 'home', filter: null, produto: null, supplier: null }

  const parts = path.slice(1).split('/')
  if (parts[0] === 'produto' && parts[1]) {
    if (parts[2]) return { tab: null, filter: null, produto: parts[2], supplier: parts[1] }
    return { tab: null, filter: null, produto: parts[1], supplier: 'reval' }
  }

  const tab = TABS.find((t) => t.key === parts[0])?.key || 'home'
  const filter = parts[1] ? decodeURIComponent(parts[1]) : null
  return { tab, filter, produto: null, supplier: null }
}

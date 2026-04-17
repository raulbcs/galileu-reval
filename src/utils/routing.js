const TABS = [
  { key: 'simulador', label: 'Simulador' },
  { key: 'produtos', label: 'Produtos' },
  { key: 'categorias', label: 'Categorias' },
  { key: 'fornecedores', label: 'Fornecedores' },
  { key: 'licencas', label: 'Licencas' },
  { key: 'listas', label: 'Listas' },
]

export { TABS }

export function buildUrl(tab, filter, produto) {
  if (produto) return `/produto/${produto}`
  if (!tab || tab === 'home') return '/'
  if (filter) return `/${tab}/${encodeURIComponent(filter)}`
  return `/${tab}`
}

export function readUrl(pathname = window.location.pathname) {
  const path = pathname.replace(/\/+$/, '')
  if (!path || path === '/') return { tab: 'home', filter: null, produto: null }

  const parts = path.slice(1).split('/')
  if (parts[0] === 'produto' && parts[1]) return { tab: null, filter: null, produto: parts[1] }

  const tab = TABS.find((t) => t.key === parts[0])?.key || 'home'
  const filter = parts[1] ? decodeURIComponent(parts[1]) : null
  return { tab, filter, produto: null }
}

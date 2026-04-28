import { useState, useRef, useEffect } from 'react'
import { useSearchProdutos, useCounts, useMarcas } from '../hooks/useApiProdutos'
import { ProdutoCard } from '../components/ProdutoCard'
import { Pagination } from '../components/Pagination'

const PAGE_SIZE = 21

const SUPPLIER_FILTERS = [
  { key: 'todos', label: 'Todos' },
  { key: 'reval', label: 'Reval' },
  { key: 'ideal', label: 'Ideal' },
]

function resetFilter(setter) {
  return (val) => { setter(val) }
}

function MarcaCombobox({ marcas, selected, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef(null)

  const filtered = search
    ? marcas.filter((m) => m.toLowerCase().includes(search.toLowerCase()))
    : marcas

  useEffect(() => {
    function onClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  function toggle(m) {
    if (selected.includes(m)) {
      onChange(selected.filter((s) => s !== m))
    } else {
      onChange([...selected, m])
    }
    setSearch('')
  }

  function remove(m, e) {
    e.stopPropagation()
    onChange(selected.filter((s) => s !== m))
  }

  function clearAll(e) {
    e.stopPropagation()
    onChange([])
    setSearch('')
  }

  return (
    <div className="combobox" ref={ref}>
      <div className="combobox-input" onClick={() => setOpen(!open)}>
        {selected.length > 0 && (
          <div className="combobox-tags">
            {selected.map((m) => (
              <span key={m} className="combobox-tag">
                {m}
                <button className="combobox-tag-remove" onClick={(e) => remove(m, e)}>&times;</button>
              </span>
            ))}
          </div>
        )}
        <input
          type="text"
          placeholder={selected.length > 0 ? 'Adicionar...' : 'Buscar marca...'}
          value={search}
          onChange={(e) => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
        />
        {selected.length > 0 && <button className="combobox-clear" onClick={clearAll}>&times;</button>}
      </div>
      {open && filtered.length > 0 && (
        <div className="combobox-dropdown">
          {filtered.map((m) => (
            <div
              key={m}
              className={`combobox-item ${selected.includes(m) ? 'active' : ''}`}
              onClick={() => toggle(m)}
            >
              {m}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ProdutosPage({ onSelectProduto }) {
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState('')
  const [supplierFilter, setSupplierFilter] = useState('todos')
  const [marcas, setMarcas] = useState([])
  const [precoMin, setPrecoMin] = useState('')
  const [precoMax, setPrecoMax] = useState('')

  function resetPage() { setPage(1) }

  const hasSupplierPrefix = /^(reval|ideal):/i.test(query)
  const minChars = query.length >= 3 || hasSupplierPrefix
  const searchQuery = minChars ? query : ''

  const { data, isLoading, error } = useSearchProdutos({
    query: searchQuery,
    supplier: supplierFilter,
    marca: marcas.join(','),
    precoMin,
    precoMax,
    page,
    pageSize: PAGE_SIZE,
  })
  const { data: counts } = useCounts()
  const { data: allMarcas } = useMarcas()

  const items = data?.items || []
  const total = data?.total || 0
  const totalPages = data?.totalPages || 0

  if (error) return <div className="page"><div className="error">Erro: {error.message}</div></div>

  return (
    <div className="page">
      <h2>Produtos</h2>
      {counts && (
        <div className="search-results-info">
          <span>Reval: {(counts.reval || 0).toLocaleString()}</span>
          <span>Ideal: {(counts.ideal || 0).toLocaleString()}</span>
        </div>
      )}

      <div className="filters">
        <div className="search-row">
          <span className="search-row-label">BUSCA:</span>
          <div className="search-row-options search-row-input">
            <input
              type="text"
              placeholder="Digite nome, descrição, código ou marca"
              value={query}
              onChange={(e) => { setQuery(e.target.value); resetPage() }}
            />
          </div>
        </div>
        <div className="search-row">
          <span className="search-row-label">FORNECEDOR:</span>
          <div className="search-row-options">
            {SUPPLIER_FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`supplier-filter-btn ${supplierFilter === f.key ? 'active' : ''}`}
                onClick={() => { setSupplierFilter(f.key); resetPage() }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="search-row">
          <span className="search-row-label">MARCA:</span>
          <div className="search-row-options">
            <MarcaCombobox
              marcas={allMarcas || []}
              selected={marcas}
              onChange={(v) => { setMarcas(v); resetPage() }}
            />
          </div>
        </div>
        <div className="search-row">
          <span className="search-row-label">PRECO:</span>
          <div className="search-row-options filter-price-row">
            <input
              type="number"
              placeholder="Min"
              value={precoMin}
              onChange={(e) => { setPrecoMin(e.target.value); resetPage() }}
              min="0"
              step="0.01"
            />
            <span className="filter-price-sep">—</span>
            <input
              type="number"
              placeholder="Max"
              value={precoMax}
              onChange={(e) => { setPrecoMax(e.target.value); resetPage() }}
              min="0"
              step="0.01"
            />
          </div>
        </div>
      </div>

      {isLoading && <div className="loading">Carregando...</div>}

      {!isLoading && items.length > 0 && (
        <>
          <div className="search-results-info">
            {total} resultado{total !== 1 ? 's' : ''}
          </div>
          <div className="produto-grid">
            {items.map((p) => (
              <ProdutoCard key={p.id} produto={p} onClick={onSelectProduto} />
            ))}
          </div>
        </>
      )}

      {!isLoading && items.length === 0 && (
        <div className="empty">Nenhum produto encontrado.</div>
      )}

      {totalPages > 1 && (
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      )}
    </div>
  )
}

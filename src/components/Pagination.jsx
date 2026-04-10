import { useState, useEffect, useRef } from 'react'

export function Pagination({ page, totalPages, onPageChange }) {
  const [jump, setJump] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const p = parseInt(params.get('page'))
    if (p && p >= 1 && p <= totalPages && p !== page) onPageChange(p)
  }, [])

  useEffect(() => {
    const url = new URL(window.location)
    if (page > 1) url.searchParams.set('page', page)
    else url.searchParams.delete('page')
    history.replaceState(null, '', url)
  }, [page])

  function handleJump(e) {
    e.preventDefault()
    const n = parseInt(jump)
    if (n >= 1 && n <= totalPages) { onPageChange(n); setJump('') }
  }

  function openJump() {
    setJump(String(page))
    setTimeout(() => inputRef.current?.select(), 0)
  }

  return (
    <div className="pagination">
      <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>Anterior</button>
      {jump ? (
        <form className="pagination-jump" onSubmit={handleJump}>
          <input
            ref={inputRef}
            type="number"
            min={1}
            max={totalPages}
            value={jump}
            onChange={(e) => setJump(e.target.value)}
            onBlur={() => setJump('')}
          />
          <span>/ {totalPages}</span>
        </form>
      ) : (
        <span className="pagination-info" onClick={openJump}>
          Página {page} de {totalPages}
        </span>
      )}
      <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Próxima</button>
    </div>
  )
}

import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

const DB_PATH = path.resolve('db/catalogo.db')

function parseRevalDate(raw) {
  if (!raw || raw.length !== 8) return null
  const d = raw.slice(0, 2), m = raw.slice(2, 4), y = raw.slice(4)
  return `${y}-${m}-${d}`
}

let _db = null

export function getDb() {
  if (_db) return _db
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true })
  _db = Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  _db.exec(`
    CREATE TABLE IF NOT EXISTS price_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      produto_id TEXT NOT NULL,
      supplier TEXT NOT NULL,
      preco_anterior REAL,
      preco_novo REAL NOT NULL,
      criado_em TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_price_history_produto ON price_history(produto_id);
    CREATE TRIGGER IF NOT EXISTS trg_price_change
    AFTER UPDATE ON produtos
    FOR EACH ROW
    WHEN NEW.preco IS NOT NULL AND OLD.preco IS NOT NEW.preco
    BEGIN
      INSERT INTO price_history (produto_id, supplier, preco_anterior, preco_novo)
      VALUES (NEW.id, NEW.supplier, OLD.preco, NEW.preco);
    END;
  `)
  return _db
}

export function upsertRevalProdutos(produtos) {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO produtos (
      id, supplier, codigo, nome, descricao, marca, ean, referencia, ncm,
      peso, altura, largura, comprimento, embalagem, imagem_url, preco, estoque,
      lista, cfop, cst, icms, origem_descricao, inf_adicionais,
      codigo_barras, codigo_barras_unit, codigo_barras_master,
      procedencia, reposicao, atualizado_em
    ) VALUES (
      'reval:' || @codigo, 'reval', @codigo, @nome, @descricao, @marca,
      @codigoBarras, @referencia, @ncm,
      @peso, @altura, @largura, @comprimento, @embalagem,
      '/cached-images/' || @codigo, @preco, @estoque,
      @lista, @cfop, @cst, @icms, @origemDescricao, @infAdicionais,
      @codigoBarras, @codigoBarrasUnit, @codigoBarrasMaster,
      @procedencia, @reposicao, @dataAttProduto
    )
    ON CONFLICT(supplier, codigo) DO UPDATE SET
      nome=excluded.nome, descricao=excluded.descricao, marca=excluded.marca,
      ean=excluded.ean, referencia=excluded.referencia, ncm=excluded.ncm,
      peso=excluded.peso, altura=excluded.altura, largura=excluded.largura,
      comprimento=excluded.comprimento, embalagem=excluded.embalagem,
      preco=excluded.preco, estoque=excluded.estoque,
      lista=excluded.lista, cfop=excluded.cfop, cst=excluded.cst,
      icms=excluded.icms, origem_descricao=excluded.origem_descricao,
      inf_adicionais=excluded.inf_adicionais,
      procedencia=excluded.procedencia, reposicao=excluded.reposicao,
      atualizado_em=excluded.atualizado_em
  `)

  const count = db.transaction((items) => {
    let n = 0
    for (const p of items) {
      try {
        stmt.run({
          codigo: String(p.codigo || ''),
          nome: p.nome || '',
          descricao: p.descricao || null,
          marca: p.marca || null,
          codigoBarras: p.codigoBarras || null,
          referencia: p.referencia || null,
          ncm: p.ncm || null,
          peso: p.peso ? parseFloat(p.peso) : null,
          altura: p.altura ? parseFloat(p.altura) : null,
          largura: p.largura ? parseFloat(p.largura) : null,
          comprimento: p.comprimento ? parseFloat(p.comprimento) : null,
          embalagem: p.embalagem || null,
          preco: p.preco ? parseFloat(p.preco) : null,
          estoque: p.estoque || null,
          lista: p.lista || null,
          cfop: p.cfop || null,
          cst: p.cst || null,
          icms: p.icms ? parseFloat(p.icms) : null,
          origemDescricao: p.origemDescricao || null,
          infAdicionais: p.infAdicionais || null,
          codigoBarrasUnit: p.codigoBarrasUnit || null,
          codigoBarrasMaster: p.codigoBarrasMaster || null,
          procedencia: p.procedencia || null,
          reposicao: p.reposicao ? 1 : 0,
          dataAttProduto: parseRevalDate(p.dataAttProduto),
        })
        n++
      } catch (err) {
        // skip duplicates/errors
      }
    }
    return n
  })(produtos)

  return count
}

export function searchProdutos({ query, supplier, marca, precoMin, precoMax, page = 1, pageSize = 30 } = {}) {
  const db = getDb()
  const where = []
  const params = {}

  // Parse supplier from query: "reval abaco" → supplier=reval, query=abaco
  // Also supports "reval:abaco" and "ideal:abaco"
  let effectiveQuery = query
  if (query) {
    const suppliers = ['reval', 'ideal']
    const words = query.split(/\s+/)
    const firstWord = words[0].replace(/:$/, '').toLowerCase()
    if (suppliers.includes(firstWord) && words.length > 1) {
      supplier = firstWord
      effectiveQuery = words.slice(1).join(' ')
    }
  }

  where.push('deleted_at IS NULL')

  if (supplier && supplier !== 'todos') {
    where.push('supplier = @supplier')
    params.supplier = supplier
  }

  if (marca) {
    const lista = marca.split(',').map((m) => m.trim()).filter(Boolean)
    if (lista.length === 1) {
      where.push('marca = @marca')
      params.marca = lista[0]
    } else if (lista.length > 1) {
      const placeholders = lista.map((_, i) => `@m${i}`).join(', ')
      where.push(`marca IN (${placeholders})`)
      lista.forEach((m, i) => { params[`m${i}`] = m })
    }
  }

  if (precoMin != null && precoMin !== '') {
    where.push('preco >= @precoMin')
    params.precoMin = Number(precoMin)
  }

  if (precoMax != null && precoMax !== '') {
    where.push('preco <= @precoMax')
    params.precoMax = Number(precoMax)
  }

  if (effectiveQuery && effectiveQuery.length >= 3) {
    const words = effectiveQuery.split(/\s+/).filter(Boolean)
    const conditions = words.map((_, i) => {
      params[`w${i}`] = `%${words[i].toLowerCase()}%`
      return `(LOWER(nome) LIKE @w${i} OR LOWER(descricao) LIKE @w${i} OR LOWER(marca) LIKE @w${i} OR LOWER(codigo) LIKE @w${i})`
    })
    where.push(`(${conditions.join(' AND ')})`)
  }

  const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : ''

  const total = db.prepare(`SELECT COUNT(*) as count FROM produtos ${whereClause}`).get(params).count

  const offset = (page - 1) * pageSize
  const rows = db.prepare(
    `SELECT * FROM produtos ${whereClause} ORDER BY nome LIMIT @limit OFFSET @offset`
  ).all({ ...params, limit: pageSize, offset })

  return { items: rows, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
}

export function getProduto(supplier, codigo) {
  const db = getDb()
  return db.prepare('SELECT * FROM produtos WHERE supplier = ? AND codigo = ?').get(supplier, codigo)
}

export function getCounts() {
  const db = getDb()
  const rows = db.prepare('SELECT supplier, COUNT(*) as count FROM produtos GROUP BY supplier').all()
  const counts = {}
  for (const r of rows) counts[r.supplier] = r.count
  return counts
}

export function getMarcas() {
  const db = getDb()
  return db.prepare("SELECT DISTINCT marca FROM produtos WHERE marca IS NOT NULL AND marca != '' ORDER BY marca").all().map(r => r.marca)
}

export function getPriceHistory(supplier, codigo) {
  const db = getDb()
  return db.prepare(
    `SELECT preco_anterior, preco_novo, criado_em
     FROM price_history WHERE produto_id = ?
     ORDER BY criado_em ASC`
  ).all(`${supplier}:${codigo}`)
}

export function softDeleteMissing(supplier, activeCodes) {
  if (!activeCodes.length) return { disappeared: 0, reappeared: 0 }
  const db = getDb()
  const now = new Date().toISOString()
  const placeholders = activeCodes.map(() => '?').join(',')

  const disappeared = db.prepare(
    `SELECT codigo FROM produtos WHERE supplier = ? AND codigo NOT IN (${placeholders}) AND deleted_at IS NULL`
  ).all(supplier, ...activeCodes)

  const reappeared = db.prepare(
    `SELECT codigo FROM produtos WHERE supplier = ? AND codigo IN (${placeholders}) AND deleted_at IS NOT NULL`
  ).all(supplier, ...activeCodes)

  if (disappeared.length || reappeared.length) {
    const tx = db.transaction(() => {
      const logStmt = db.prepare('INSERT INTO product_status_log (produto_id, supplier, evento, criado_em) VALUES (?, ?, ?, ?)')
      const deleteStmt = db.prepare('UPDATE produtos SET deleted_at = ? WHERE supplier = ? AND codigo = ?')
      const restoreStmt = db.prepare('UPDATE produtos SET deleted_at = NULL WHERE supplier = ? AND codigo = ?')

      for (const { codigo } of disappeared) {
        deleteStmt.run(now, supplier, codigo)
        logStmt.run(`${supplier}:${codigo}`, supplier, 'disappeared', now)
      }
      for (const { codigo } of reappeared) {
        restoreStmt.run(supplier, codigo)
        logStmt.run(`${supplier}:${codigo}`, supplier, 'reappeared', now)
      }
    })
    tx()
  }

  return { disappeared: disappeared.length, reappeared: reappeared.length }
}

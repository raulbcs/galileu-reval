import Database from 'better-sqlite3'
import path from 'node:path'
import fs from 'node:fs'

const DB_PATH = path.resolve('db/catalogo.db')

let _db = null

export function getDb() {
  if (_db) return _db
  _db = Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  _db.pragma('foreign_keys = ON')
  initSchema(_db)
  return _db
}

function initSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS produtos (
      id TEXT PRIMARY KEY,
      supplier TEXT NOT NULL,
      codigo TEXT NOT NULL,
      nome TEXT NOT NULL,
      descricao TEXT,
      marca TEXT,
      ean TEXT,
      referencia TEXT,
      ncm TEXT,
      peso REAL,
      altura REAL,
      largura REAL,
      comprimento REAL,
      embalagem TEXT,
      imagem_url TEXT,
      preco REAL,
      estoque TEXT,
      lista TEXT,
      cfop TEXT,
      cst TEXT,
      icms REAL,
      origem_descricao TEXT,
      inf_adicionais TEXT,
      url TEXT,
      categoria TEXT,
      ean_caixa TEXT,
      origem TEXT,
      codigo_barras TEXT,
      codigo_barras_unit TEXT,
      codigo_barras_master TEXT,
      procedencia TEXT,
      reposicao INTEGER DEFAULT 0,
      atualizado_em TEXT,
      UNIQUE(supplier, codigo)
    );

    CREATE INDEX IF NOT EXISTS idx_produtos_supplier ON produtos(supplier);
    CREATE INDEX IF NOT EXISTS idx_produtos_nome ON produtos(nome);
    CREATE INDEX IF NOT EXISTS idx_produtos_marca ON produtos(marca);
    CREATE INDEX IF NOT EXISTS idx_produtos_ean ON produtos(ean);
    CREATE INDEX IF NOT EXISTS idx_produtos_preco ON produtos(preco);
  `)
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
          dataAttProduto: p.dataAttProduto || null,
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

export function upsertIdealProdutos(produtos) {
  const db = getDb()
  const stmt = db.prepare(`
    INSERT INTO produtos (
      id, supplier, codigo, nome, descricao, marca, ean, referencia, ncm,
      peso, altura, largura, comprimento, embalagem, imagem_url, preco, estoque,
      url, categoria, ean_caixa, origem, atualizado_em
    ) VALUES (
      'ideal:' || @codigo, 'ideal', @codigo, @nome, @descricao, @marca,
      @ean, @referencia, @ncm,
      @peso, @altura, @largura, @comprimento, @embalagem,
      @imagem_url, @preco, @estoque,
      @url, @categoria, @ean_caixa, @origem, @atualizado_em
    )
    ON CONFLICT(supplier, codigo) DO UPDATE SET
      nome=excluded.nome, descricao=excluded.descricao, marca=excluded.marca,
      ean=excluded.ean, referencia=excluded.referencia, ncm=excluded.ncm,
      peso=excluded.peso, altura=excluded.altura, largura=excluded.largura,
      comprimento=excluded.comprimento, embalagem=excluded.embalagem,
      imagem_url=excluded.imagem_url, preco=excluded.preco, estoque=excluded.estoque,
      url=excluded.url, categoria=excluded.categoria, ean_caixa=excluded.ean_caixa,
      origem=excluded.origem, atualizado_em=excluded.atualizado_em
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
          ean: p.ean || null,
          referencia: p.sku_fabricante || null,
          ncm: p.ncm || null,
          peso: p.peso_kg ? parseFloat(p.peso_kg) : null,
          altura: p.altura_cm ? parseFloat(p.altura_cm) : null,
          largura: p.largura_cm ? parseFloat(p.largura_cm) : null,
          comprimento: p.comprimento_cm ? parseFloat(p.comprimento_cm) : null,
          embalagem: p.embalagem || null,
          imagem_url: p.imagem_url || null,
          preco: p.preco ? parseFloat(p.preco) : null,
          estoque: p.estoque || null,
          url: p.url || null,
          categoria: p.categoria || null,
          ean_caixa: p.ean_caixa || null,
          origem: p.origem || null,
          atualizado_em: p.atualizado_em || null,
        })
        n++
      } catch (err) {
        // skip
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

  // Parse "reval:" or "ideal:" prefix from query
  let effectiveQuery = query
  if (query && /^(reval|ideal):/i.test(query)) {
    const match = query.match(/^(reval|ideal):(.*)/i)
    supplier = match[1].toLowerCase()
    effectiveQuery = match[2].trim()
  }

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
      return `(LOWER(nome) LIKE @w${i} OR LOWER(descricao) LIKE @w${i} OR LOWER(marca) LIKE @w${i})`
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

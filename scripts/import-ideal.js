#!/usr/bin/env node
import Database from 'better-sqlite3'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { upsertIdealProdutos, getDb } from '../src/server/db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IDEAL_DB_PATH = path.resolve(__dirname, '../../disassembly-atacado-ideal-apk/output/catalogo.db')

async function main() {
  const fs = await import('node:fs')
  if (!fs.existsSync(IDEAL_DB_PATH)) {
    console.error(`DB nao encontrado: ${IDEAL_DB_PATH}`)
    process.exit(1)
  }

  console.log('Lendo produtos do Atacado Ideal...')
  const srcDb = new Database(IDEAL_DB_PATH, { readonly: true })
  const produtos = srcDb.prepare('SELECT * FROM produtos').all()
  srcDb.close()

  console.log(`Encontrados ${produtos.length} produtos. Importando...`)
  const count = upsertIdealProdutos(produtos)

  const counts = getDb().prepare('SELECT supplier, COUNT(*) as count FROM produtos GROUP BY supplier').all()
  console.log(`Importados ${count} produtos Ideal.`)
  console.log('Totais:', counts)
}

main().catch((err) => {
  console.error('Erro:', err.message)
  process.exit(1)
})

#!/usr/bin/env node
import 'dotenv/config'
import axios from 'axios'
import { getDb, upsertRevalProdutos } from '../src/server/db.js'

const REVAL_BASE_URL = 'http://api.reval.net'

async function getToken() {
  const { data } = await axios.get(`${REVAL_BASE_URL}/api/get-token`, {
    params: {
      username: process.env.REVAL_USER,
      password: process.env.REVAL_PASS,
    },
  })
  return data.access_token
}

async function main() {
  console.log('Buscando token...')
  const token = await getToken()

  console.log('Buscando produtos da Reval...')
  const { data } = await axios.get(
    `${REVAL_BASE_URL}/api/produto/get-all-tabela?usuario=${process.env.REVAL_USER}`,
    { headers: { Authorization: `Bearer ${token}` }, timeout: 240000 }
  )

  console.log(`Encontrados ${data.length} produtos. Importando...`)
  const count = upsertRevalProdutos(data)

  const counts = getDb().prepare('SELECT supplier, COUNT(*) as count FROM produtos GROUP BY supplier').all()
  console.log(`Importados ${count} produtos Reval.`)
  console.log('Totais:', counts)
}

main().catch((err) => {
  console.error('Erro:', err.message)
  process.exit(1)
})

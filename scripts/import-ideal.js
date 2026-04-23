#!/usr/bin/env node
import 'dotenv/config'
import { importIdealProducts } from '../src/server/import.js'

importIdealProducts()
  .then(r => console.log('Done:', r))
  .catch(err => { console.error('Error:', err.message); process.exit(1) })

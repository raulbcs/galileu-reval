#!/usr/bin/env node
import 'dotenv/config'
import { importRevalProducts } from '../src/server/import.js'

importRevalProducts()
  .then(r => console.log('Done:', r))
  .catch(err => { console.error('Error:', err.message); process.exit(1) })

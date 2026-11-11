// Writes the phpMyAdmin import files: database/crewdesk_demo.sql and database/crewdesk_empty.sql
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSQL } from './build-sql.js'

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../database')
fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(dir, 'crewdesk_demo.sql'), await buildSQL({ demo: true }))
fs.writeFileSync(path.join(dir, 'crewdesk_empty.sql'), await buildSQL({ demo: false }))
console.log('Wrote database/crewdesk_demo.sql and database/crewdesk_empty.sql')

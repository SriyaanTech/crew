// Creates the database (if needed) and loads the schema + demo data.
//   npm run db:setup            -> schema + demo data
//   npm run db:setup -- --empty -> schema + one admin account only
// WARNING: drops and recreates all CrewDesk tables.
import 'dotenv/config'
import mysql from 'mysql2/promise'
import { buildSQL, DEMO_STAFF_PASSWORD, DEMO_CREW_PASSWORD } from './build-sql.js'

const empty = process.argv.includes('--empty')
const name = process.env.DB_NAME || 'crewdesk'
const conn = await mysql.createConnection({
  host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root', password: process.env.DB_PASSWORD || '', multipleStatements: true, charset: 'utf8mb4',
})
await conn.query(`CREATE DATABASE IF NOT EXISTS \`${name}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
await conn.query(`USE \`${name}\``)
await conn.query(await buildSQL({ demo: !empty }))
await conn.end()
console.log(`Database "${name}" is ready${empty ? ' (empty)' : ' with demo data'}.`)
console.log(`Staff login: admin@crewdesk.com / ${DEMO_STAFF_PASSWORD}`)
if (!empty) console.log(`Crew portal: CRW-0001 (or the seafarer's email) / ${DEMO_CREW_PASSWORD}`)

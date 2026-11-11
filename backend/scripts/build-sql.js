// Builds the full SQL script (schema + optional demo data) used by both
// `npm run db:setup` and the phpMyAdmin import file in database/.
import mysql from 'mysql2'
import bcrypt from 'bcryptjs'
import { RESOURCES, createTableSQL, CONFIG_TABLE_SQL } from '../src/resources.js'
import { toRow } from '../src/mapper.js'
import { DEFAULT_PERMISSIONS, defaultSettings } from '../src/permissions.js'
import { buildSeed } from '../src/seed/mockData.js'

export const DEMO_STAFF_PASSWORD = 'Staff@12345'
export const DEMO_CREW_PASSWORD = 'Crew@12345'
const SEED_TS = '2024-01-01 00:00:00'

function insertSQL(resource, records) {
  if (!records.length) return ''
  const { table } = RESOURCES[resource]
  const rows = records.map((rec) => {
    const { row, extra } = toRow(resource, rec)
    return { id: rec.id, ...row, extra: Object.keys(extra).length ? JSON.stringify(extra) : null, created_at: SEED_TS }
  })
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const out = []
  for (let i = 0; i < rows.length; i += 200) {
    const chunk = rows.slice(i, i + 200)
    out.push(`INSERT INTO \`${table}\` (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES\n${chunk.map((r) => `(${cols.map((c) => mysql.escape(r[c] ?? null)).join(', ')})`).join(',\n')};`)
  }
  return out.join('\n')
}

export async function buildSQL({ demo = true } = {}) {
  const parts = [
    '-- CrewDesk Crew Management System – MySQL / MariaDB schema',
    `-- Generated ${new Date().toISOString()}${demo ? ' with demo data' : ' (empty – admin account only)'}`,
    '-- Import into an existing, empty database (e.g. `crewdesk`) via phpMyAdmin → Import.',
    '',
    'SET NAMES utf8mb4;',
    "SET time_zone = '+00:00';",
    'SET FOREIGN_KEY_CHECKS = 0;',
    '',
  ]
  for (const name of Object.keys(RESOURCES)) {
    parts.push(`DROP TABLE IF EXISTS \`${RESOURCES[name].table}\`;`)
    parts.push(createTableSQL(name), '')
  }
  parts.push('DROP TABLE IF EXISTS `app_config`;', CONFIG_TABLE_SQL, '')
  parts.push(`INSERT INTO \`app_config\` (\`config_key\`, \`value\`) VALUES (${mysql.escape('permissions')}, ${mysql.escape(JSON.stringify(DEFAULT_PERMISSIONS))}), (${mysql.escape('settings')}, ${mysql.escape(JSON.stringify(defaultSettings()))});`, '')

  const staffHash = await bcrypt.hash(DEMO_STAFF_PASSWORD, 10)
  if (demo) {
    const seed = buildSeed()
    const crewHash = await bcrypt.hash(DEMO_CREW_PASSWORD, 10)
    seed.crew = seed.crew.map((c) => ({ ...c, passwordHash: c.status === 'Candidate' ? '' : crewHash }))
    seed.users = seed.users.map((u) => ({ ...u, mfa: false, scope: 'All records', passwordHash: staffHash }))
    for (const name of Object.keys(RESOURCES)) {
      const records = seed[name] || []
      if (records.length) parts.push(`-- ${name}: ${records.length} rows`, insertSQL(name, records), '')
    }
  } else {
    parts.push(insertSQL('users', [{ id: 'USR-0001', name: 'Admin User', email: 'admin@crewdesk.com', role: 'Super Admin', status: 'Active', mfa: false, scope: 'All records', passwordHash: staffHash }]), '')
  }
  parts.push('SET FOREIGN_KEY_CHECKS = 1;', '')
  return parts.join('\n')
}

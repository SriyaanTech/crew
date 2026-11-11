// Converts between API records (camelCase, JS types) and MySQL rows (snake_case).
import { RESOURCES, colName } from './resources.js'

const pad = (n) => String(n).padStart(2, '0')

function toSqlDate(v) {
  if (v === '' || v == null) return null
  return String(v).slice(0, 10)
}
function toSqlDateTime(v) {
  if (v === '' || v == null) return null
  const s = String(v)
  if (/[zZ]$|[+-]\d\d:?\d\d$/.test(s)) {
    const d = new Date(s)
    if (isNaN(d)) return null
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`
  }
  return s.replace('T', ' ').slice(0, 19)
}

export function toRow(resource, data) {
  const { columns } = RESOURCES[resource]
  const row = {}
  const extra = {}
  for (const [k, v] of Object.entries(data)) {
    if (k === 'id') continue
    const type = columns[k]
    if (!type) { extra[k] = v; continue }
    const col = colName(resource, k)
    switch (type) {
      case 'd': row[col] = toSqlDate(v); break
      case 'dt': row[col] = toSqlDateTime(v); break
      case 'n': case 'i': row[col] = v === '' || v == null || isNaN(Number(v)) ? null : Number(v); break
      case 'b': row[col] = v ? 1 : 0; break
      case 'j': row[col] = v == null ? null : JSON.stringify(v); break
      default: row[col] = v == null ? null : String(v)
    }
  }
  return { row, extra }
}

export function fromRow(resource, row) {
  if (!row) return null
  const { columns, hidden = [] } = RESOURCES[resource]
  const out = { id: row.id }
  let extra = {}
  if (row.extra) { try { extra = JSON.parse(row.extra) } catch { extra = {} } }
  Object.assign(out, extra)
  for (const [k, type] of Object.entries(columns)) {
    if (hidden.includes(k)) continue
    const v = row[colName(resource, k)]
    switch (type) {
      case 'b': out[k] = !!v; break
      case 'j': { let p = v; if (typeof v === 'string') { try { p = JSON.parse(v) } catch { p = null } } out[k] = p ?? []; break }
      case 'dt': out[k] = v ? String(v).replace(' ', 'T').slice(0, 16) : ''; break
      default: out[k] = v ?? ''
    }
  }
  return out
}

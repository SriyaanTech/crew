// Low-level record operations shared by the REST router and the business hooks.
// Every function takes a connection (`db`) so callers can run several steps in one transaction.
import { RESOURCES, snake } from './resources.js'
import { toRow, fromRow } from './mapper.js'

const WIDTH = { DOC: 5, SS: 5, TRN: 5 }

export const tableOf = (resource) => RESOURCES[resource].table

export async function nextId(db, resource) {
  const { table, prefix } = RESOURCES[resource]
  const [[r]] = await db.query(`SELECT MAX(CAST(SUBSTRING_INDEX(id, '-', -1) AS UNSIGNED)) AS m FROM \`${table}\` WHERE id LIKE ?`, [`${prefix}-%`])
  return `${prefix}-${String((r.m || 0) + 1).padStart(WIDTH[prefix] || 4, '0')}`
}

export async function getRaw(db, resource, id) {
  const [[row]] = await db.query(`SELECT * FROM \`${tableOf(resource)}\` WHERE id = ?`, [id])
  return row || null
}

export async function getRecord(db, resource, id) {
  return fromRow(resource, await getRaw(db, resource, id))
}

export async function listRecords(db, resource, { where = '', params = [], limit } = {}) {
  const order = resource === 'audit' ? '`at` DESC, `id` DESC' : '`created_at` DESC, `id` ASC'
  const [rows] = await db.query(`SELECT * FROM \`${tableOf(resource)}\` ${where ? `WHERE ${where}` : ''} ORDER BY ${order} ${limit ? `LIMIT ${Number(limit)}` : ''}`, params)
  return rows.map((r) => fromRow(resource, r))
}

export async function insertRecord(db, resource, data) {
  const { row, extra } = toRow(resource, data)
  if (Object.keys(extra).length) row.extra = JSON.stringify(extra)
  for (let attempt = 0; attempt < 4; attempt++) {
    const id = data.id && attempt === 0 ? data.id : await nextId(db, resource)
    const full = { id, ...row }
    const cols = Object.keys(full)
    try {
      await db.query(`INSERT INTO \`${tableOf(resource)}\` (${cols.map((c) => `\`${c}\``).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`, cols.map((c) => full[c]))
      return getRecord(db, resource, id)
    } catch (e) {
      if (e.code !== 'ER_DUP_ENTRY' || !String(e.message).includes('PRIMARY')) throw e
    }
  }
  throw new Error('Could not allocate a new id, please retry')
}

export async function updateRecord(db, resource, id, patch) {
  const current = await getRaw(db, resource, id)
  if (!current) return null
  const { row, extra } = toRow(resource, patch)
  if (Object.keys(extra).length) {
    let prev = {}
    try { prev = current.extra ? JSON.parse(current.extra) : {} } catch { prev = {} }
    row.extra = JSON.stringify({ ...prev, ...extra })
  }
  const cols = Object.keys(row)
  if (cols.length) {
    await db.query(`UPDATE \`${tableOf(resource)}\` SET ${cols.map((c) => `\`${c}\` = ?`).join(', ')} WHERE id = ?`, [...cols.map((c) => row[c]), id])
  }
  return getRecord(db, resource, id)
}

export async function deleteRecord(db, resource, id) {
  const [r] = await db.query(`DELETE FROM \`${tableOf(resource)}\` WHERE id = ?`, [id])
  return r.affectedRows > 0
}

export const col = (k) => `\`${snake(k)}\``

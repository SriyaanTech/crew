// Generic REST router: GET/POST/PATCH/DELETE for every resource in resources.js,
// with role-based access control, crew self-service scoping, password hashing and audit logging.
import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { pool } from './db.js'
import { RESOURCES } from './resources.js'
import { can, getConfig } from './config.js'
import { audit } from './audit.js'
import { HOOKS, onboardApplication } from './hooks.js'
import { listRecords, getRecord, insertRecord, updateRecord, deleteRecord, col } from './records.js'
import { passwordProblem } from './auth.js'

export const crudRouter = Router()

const http = (status, message) => Object.assign(new Error(message), { status })
const isCrew = (u) => u.role === 'Crew Member'

// What a logged-in seafarer may do in the self-service portal
const CREW_READ_ALL = ['vessels', 'clients', 'courses', 'vacancies']
const CREW_CREATE = ['documents', 'applications', 'requests']
const CREW_PROFILE_FIELDS = ['phone', 'email', 'address', 'emergencyName', 'emergencyRelation', 'emergencyPhone', 'availableFrom', 'expectedSalary', 'photo']
const CREW_DOC_FIELDS = ['number', 'issuingAuthority', 'issueDate', 'expiryDate', 'fileName', 'fileUrl', 'type']

async function withTx(fn) {
  const conn = await pool.getConnection()
  try {
    await conn.beginTransaction()
    const out = await fn(conn)
    await conn.commit()
    return out
  } catch (e) {
    await conn.rollback()
    throw e
  } finally {
    conn.release()
  }
}

function resourceOr404(name) {
  const r = RESOURCES[name]
  if (!r) throw http(404, `Unknown resource "${name}"`)
  return r
}

async function requireStaff(user, module, actions) {
  for (const a of [].concat(actions)) if (await can(user, module, a)) return
  throw http(403, `Your role (${user.role}) is not allowed to ${[].concat(actions)[0]} ${module}`)
}

// Turn a plain "password" field into a bcrypt hash, and never accept hashes/secrets from the client.
async function handlePassword(resource, data, { required = false } = {}) {
  delete data.passwordHash; delete data.mfaSecret
  if (resource !== 'users' && resource !== 'crew') { delete data.password; return }
  const pw = data.password
  delete data.password
  if (!pw) { if (required) throw http(400, 'An initial password is required'); return }
  const err = passwordProblem(pw, await getConfig('settings'))
  if (err) throw http(400, err)
  data.passwordHash = await bcrypt.hash(pw, 10)
}

function pickQueryFilters(resource, query) {
  const cols = RESOURCES[resource].columns
  const parts = []; const params = []
  for (const [k, v] of Object.entries(query)) {
    if (cols[k] && !RESOURCES[resource].hidden?.includes(k)) { parts.push(`${col(k)} = ?`); params.push(v) }
  }
  return { parts, params }
}

// ---------- list ----------
crudRouter.get('/:resource', async (req, res) => {
  const name = req.params.resource
  const r = resourceOr404(name)
  const user = req.user
  const { parts, params } = pickQueryFilters(name, req.query)

  if (isCrew(user)) {
    if (name === 'crew') { parts.push('id = ?'); params.push(user.crewId) }
    else if (name === 'notifications') { parts.push(`(${col('crewId')} = ? OR (${col('audience')} = 'Crew' AND (${col('crewId')} IS NULL OR ${col('crewId')} = '')))`); params.push(user.crewId) }
    else if (r.crewScoped) { parts.push(`${col('crewId')} = ?`); params.push(user.crewId) }
    else if (!CREW_READ_ALL.includes(name)) throw http(403, 'Not available in the crew portal')
  } else {
    await requireStaff(user, r.module, 'view')
  }
  const rows = await listRecords(pool, name, { where: parts.join(' AND '), params, limit: name === 'audit' ? 2000 : undefined })
  res.json(rows)
})

// ---------- get one ----------
crudRouter.get('/:resource/:id', async (req, res) => {
  const name = req.params.resource
  const r = resourceOr404(name)
  const rec = await getRecord(pool, name, req.params.id)
  if (!rec) throw http(404, 'Not found')
  if (isCrew(req.user)) {
    const own = name === 'crew' ? rec.id === req.user.crewId : rec.crewId === req.user.crewId
    if (!own && !CREW_READ_ALL.includes(name)) throw http(404, 'Not found')
  } else await requireStaff(req.user, r.module, 'view')
  res.json(rec)
})

// ---------- create ----------
crudRouter.post('/:resource', async (req, res) => {
  const name = req.params.resource
  const r = resourceOr404(name)
  if (r.readOnly) throw http(405, `${name} is read-only`)
  const user = req.user
  const data = { ...(req.body || {}) }
  delete data.id

  if (isCrew(user)) {
    if (!CREW_CREATE.includes(name)) throw http(403, 'Not available in the crew portal')
    data.crewId = user.crewId
    if (name === 'documents') Object.assign(data, { status: 'Pending', remarks: '', version: 1 })
    if (name === 'requests') Object.assign(data, { status: 'Open', response: '', date: new Date().toISOString().slice(0, 10) })
    if (name === 'applications') {
      const vac = await getRecord(pool, 'vacancies', data.vacancyId)
      if (!vac || vac.status !== 'Open') throw http(400, 'This vacancy is no longer open')
      const dup = await listRecords(pool, 'applications', { where: `${col('crewId')} = ? AND ${col('vacancyId')} = ?`, params: [user.crewId, data.vacancyId], limit: 1 })
      if (dup.length) throw http(409, 'You have already applied for this vacancy')
      Object.assign(data, { stage: 'Sourcing', source: 'Portal', screeningResult: 'Pending', internalApproval: 'Pending', clientApproval: 'Not Sent', status: 'Active', appliedOn: new Date().toISOString().slice(0, 10) })
    }
  } else {
    await requireStaff(user, r.module, 'create')
  }
  await handlePassword(name, data, { required: name === 'users' })
  if (name === 'users') data.status = data.status || 'Active'

  const rec = await withTx(async (db) => {
    const msg = await HOOKS[name]?.validate?.(db, data, null)
    if (msg) throw http(409, msg)
    const created = await insertRecord(db, name, data)
    await HOOKS[name]?.afterCreate?.(db, created)
    return created
  })
  await audit(user, 'CREATE', name, rec.id)
  res.status(201).json(rec)
})

// ---------- update ----------
crudRouter.patch('/:resource/:id', async (req, res) => {
  const name = req.params.resource
  const r = resourceOr404(name)
  if (r.readOnly) throw http(405, `${name} is read-only`)
  const user = req.user
  const id = req.params.id
  let patch = { ...(req.body || {}) }
  delete patch.id

  const before = await getRecord(pool, name, id)
  if (!before) throw http(404, 'Not found')

  if (isCrew(user)) {
    if (name === 'crew' && id === user.crewId) patch = Object.fromEntries(Object.entries(patch).filter(([k]) => CREW_PROFILE_FIELDS.includes(k)))
    else if (name === 'documents' && before.crewId === user.crewId) {
      patch = Object.fromEntries(Object.entries(patch).filter(([k]) => CREW_DOC_FIELDS.includes(k)))
      Object.assign(patch, { status: 'Pending', remarks: '', version: (Number(before.version) || 1) + 1 })
    } else throw http(403, 'Not available in the crew portal')
  } else {
    await requireStaff(user, r.module, ['edit', 'approve'])
  }
  await handlePassword(name, patch)
  if (name === 'users' && patch.mfa === false) patch.mfaSecret = null
  if (name === 'users' && id === user.id && patch.status && patch.status !== 'Active') throw http(400, 'You cannot suspend your own account')

  const rec = await withTx(async (db) => {
    const msg = await HOOKS[name]?.validate?.(db, { ...patch, id }, before)
    if (msg) throw http(409, msg)
    const updated = await updateRecord(db, name, id, patch)
    await HOOKS[name]?.afterUpdate?.(db, updated, before, patch)
    return updated
  })
  await audit(user, 'UPDATE', name, id, Object.keys(patch).filter((k) => k !== 'passwordHash').join(', ') + (patch.passwordHash ? ', password' : ''))
  res.json(rec)
})

// ---------- delete ----------
crudRouter.delete('/:resource/:id', async (req, res) => {
  const name = req.params.resource
  const r = resourceOr404(name)
  if (r.readOnly) throw http(405, `${name} is read-only`)
  if (isCrew(req.user)) throw http(403, 'Not available in the crew portal')
  await requireStaff(req.user, r.module, 'delete')
  if (name === 'users' && req.params.id === req.user.id) throw http(400, 'You cannot delete your own account')
  const ok = await deleteRecord(pool, name, req.params.id)
  if (!ok) throw http(404, 'Not found')
  await audit(req.user, 'DELETE', name, req.params.id)
  res.status(204).end()
})

// ---------- actions ----------
export const actionRouter = Router()

actionRouter.post('/applications/:id/onboard', async (req, res) => {
  if (isCrew(req.user)) throw http(403, 'Not allowed')
  await requireStaff(req.user, 'recruitment', 'edit')
  const out = await withTx((db) => onboardApplication(db, req.params.id))
  await audit(req.user, 'UPDATE', 'applications', req.params.id, 'onboarded: assignment + draft contract created')
  res.json(out)
})

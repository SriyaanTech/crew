import { Router } from 'express'
import { pool } from './db.js'
import { can } from './config.js'
import { audit } from './audit.js'
import { listRecords } from './records.js'

export const clientPortalRouter = Router()
export const isClientAccount = (user) => user?.role === 'Client Representative'

// The vessel's existing extra fields store the account ID on current installations.
const ownerId = (column) => `JSON_UNQUOTE(JSON_EXTRACT(CASE WHEN JSON_VALID(${column}) THEN ${column} ELSE '{}' END, '$.ownerUserId'))`
const pick = (record, keys) => Object.fromEntries(keys.split(' ').map((key) => [key, record[key]]))
const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)

export async function setVesselOwner(db, data, previous) {
  if (!has(data, 'ownerUserId')) return
  const id = data.ownerUserId
  if (id === '' || id == null) {
    if (previous?.ownerUserId) data.owner = ''
    data.ownerUserId = null
    return
  }
  if (typeof id === 'string' && previous?.ownerUserId === id) {
    data.owner = previous.owner
    return
  }
  const [[owner]] = typeof id === 'string'
    ? await db.query('SELECT id, name, role, status FROM users WHERE id = ? FOR UPDATE', [id])
    : [[]]
  if (!isClientAccount(owner) || owner.status !== 'Active') {
    throw Object.assign(new Error('Select an available owner.'), { status: 400 })
  }
  data.ownerUserId = owner.id
  data.owner = owner.name
}

export async function checkOwnerBeforeDelete(db, id) {
  await db.query('SELECT id FROM users WHERE id = ? FOR UPDATE', [id])
  const [[vessel]] = await db.query(`SELECT id FROM vessels WHERE ${ownerId('extra')} = ? LIMIT 1 FOR UPDATE`, [id])
  if (vessel) throw Object.assign(new Error('Reassign this account’s vessels before deleting it.'), { status: 409 })
}

clientPortalRouter.get('/vessel-owners', async (req, res) => {
  const { user } = req
  if (isClientAccount(user) || !(await can(user, 'vessels', 'create') || await can(user, 'vessels', 'edit'))) {
    return res.status(403).json({ error: 'Not allowed' })
  }
  const rows = await listRecords(pool, 'users', { where: 'role = ? AND status = ?', params: ['Client Representative', 'Active'] })
  res.json(rows.map((row) => pick(row, 'id name')).sort((a, b) => a.name.localeCompare(b.name)))
})

async function loadPortal(db, user, canApprove, canViewRecruitment) {
  const vessels = await listRecords(db, 'vessels', { where: `${ownerId('extra')} = ?`, params: [user.id] })
  const result = { vessels: [], assignments: [], crew: [], qualifications: [], payroll: [], contracts: [], applications: [], canApprove }
  if (!vessels.length) return result

  const vesselIds = vessels.map((vessel) => vessel.id)
  const vesselScope = { where: `vessel_id IN (${vesselIds.map(() => '?').join(', ')})`, params: vesselIds }
  const [assignments, payroll, contracts, vacancies] = await Promise.all([
    listRecords(db, 'assignments', vesselScope), listRecords(db, 'payroll', vesselScope), listRecords(db, 'contracts', vesselScope),
    canViewRecruitment ? listRecords(db, 'vacancies', vesselScope) : [],
  ])
  const vacanciesById = new Map(vacancies.map((vacancy) => [vacancy.id, vacancy]))
  const applications = vacancies.length ? await listRecords(db, 'applications', {
    where: `vacancy_id IN (${vacancies.map(() => '?').join(', ')}) AND internal_approval = ? AND client_approval IN (?, ?, ?)`,
    params: [...vacanciesById.keys(), 'Approved', 'Pending', 'Approved', 'Rejected'],
  }) : []
  const crewIds = [...new Set([...assignments, ...payroll, ...contracts, ...applications].map((record) => record.crewId).filter(Boolean))]
  const crew = crewIds.length ? await listRecords(db, 'crew', { where: `id IN (${crewIds.map(() => '?').join(', ')})`, params: crewIds }) : []
  const onboardIds = [...new Set(assignments.filter((row) => row.status === 'Onboard').map((row) => row.crewId).filter(Boolean))]
  const qualificationRecords = onboardIds.length ? await listRecords(db, 'trainingRecords', {
    where: `crew_id IN (${onboardIds.map(() => '?').join(', ')}) AND status = ?`, params: [...onboardIds, 'Completed'],
  }) : []
  const courses = qualificationRecords.length ? await listRecords(db, 'courses') : []
  const courseNames = new Map(courses.map((course) => [course.id, course.name]))

  return {
    vessels: vessels.map((vessel) => ({
      ...pick(vessel, 'id name imo type flag manager grt dwt built tradingArea status'),
      owner: user.name,
      documents: Array.isArray(vessel.documents) ? vessel.documents.filter(Boolean).map((document) => pick(document, 'name expiry fileName fileUrl')) : [],
    })),
    assignments: assignments.map((row) => pick(row, 'id crewId vesselId rank signOnDate plannedSignOff actualSignOff joiningPort status relievingId')),
    crew: crew.map((row) => pick(row, 'id firstName lastName rank nationality totalExperienceMonths')),
    qualifications: qualificationRecords.map((row) => ({ ...pick(row, 'id crewId completedOn expiryDate'), name: courseNames.get(row.courseId) || 'Training course' })),
    payroll: payroll.map((row) => pick(row, 'id crewId vesselId period basic fixedOT extraOT leaveWages allowances advance deductions gross net allotment currency status paidOn')),
    contracts: contracts.map((row) => pick(row, 'id crewId vesselId rank startDate endDate durationMonths currency basicWage fixedOT leavePay otherAllowance cba terms signed signedAt status version')),
    applications: applications.map((row) => ({ ...pick(row, 'id crewId appliedOn clientApproval status stage'), ...pick(vacanciesById.get(row.vacancyId), 'vesselId title rank') })),
    canApprove,
  }
}

clientPortalRouter.get('/client-portal', async (req, res) => {
  const { user } = req
  if (!isClientAccount(user) || !(await can(user, 'vessels', 'view'))) return res.status(403).json({ error: 'Not allowed' })
  const canViewRecruitment = await can(user, 'recruitment', 'view')
  const canApprove = canViewRecruitment && await can(user, 'recruitment', 'approve')
  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()
    const data = await loadPortal(connection, user, canApprove, canViewRecruitment)
    await connection.commit()
    res.set('Cache-Control', 'private, no-store').json(data)
  } catch (error) {
    await connection.rollback()
    throw error
  } finally {
    connection.release()
  }
})

clientPortalRouter.post('/client-portal/applications/:id/decision', async (req, res) => {
  const { user } = req
  if (!isClientAccount(user) || !(await can(user, 'vessels', 'view')) || !(await can(user, 'recruitment', 'view')) || !(await can(user, 'recruitment', 'approve'))) {
    return res.status(403).json({ error: 'Not allowed' })
  }
  const decision = req.body?.decision
  if (!['Approved', 'Rejected'].includes(decision)) return res.status(400).json({ error: 'Choose a valid decision.' })
  const [result] = await pool.query(`
    UPDATE applications a
    JOIN vacancies j ON j.id = a.vacancy_id
    JOIN vessels v ON v.id = j.vessel_id
    SET a.client_approval = ?, a.stage = IF(? = 'Approved', 'Selected', a.stage),
        a.status = IF(? = 'Rejected', 'Rejected', a.status)
    WHERE a.id = ? AND ${ownerId('v.extra')} = ? AND a.internal_approval = 'Approved'
      AND a.client_approval = 'Pending' AND a.status = 'Active' AND a.stage = 'Client Approval'
  `, [decision, decision, decision, req.params.id, user.id])
  if (!result.affectedRows) return res.status(409).json({ error: 'This application is no longer available for a decision.' })
  await audit(user, 'UPDATE', 'applications', req.params.id, `Client decision: ${decision}`)
  res.json({ id: req.params.id, clientApproval: decision })
})

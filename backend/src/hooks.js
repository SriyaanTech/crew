// Business rules that touch several tables. They run inside the same transaction as the triggering write,
// so a sign-off, for example, either updates assignment + contract + sea service + crew together or not at all.
import { listRecords, insertRecord, updateRecord, getRecord, col } from './records.js'

const today = () => new Date().toISOString().slice(0, 10)
const addDays = (n, base) => { const d = base ? new Date(base) : new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10) }
const one = async (db, resource, where, params) => (await listRecords(db, resource, { where, params, limit: 1 }))[0]

const CREW_STATUS_FOR = { Planned: 'Planned', Onboard: 'Onboard', Completed: 'Available', Cancelled: 'Available' }

async function syncCrewFromAssignment(db, a) {
  const status = CREW_STATUS_FOR[a.status]
  if (!status || !a.crewId) return
  const patch = { status }
  if (a.status === 'Onboard') { patch.lastSignOn = a.signOnDate; patch.availableFrom = '' }
  if (a.status === 'Completed') { patch.lastSignOff = a.actualSignOff || a.plannedSignOff; patch.availableFrom = addDays(30, patch.lastSignOff) }
  await updateRecord(db, 'crew', a.crewId, patch)
}

export const HOOKS = {
  assignments: {
    // Server-side guard: no overlapping active assignments for the same seafarer
    async validate(db, data, existing) {
      const merged = { ...(existing || {}), ...data }
      if (!merged.crewId || !merged.signOnDate) return null
      const end = merged.actualSignOff || merged.plannedSignOff || merged.signOnDate
      const clash = await one(db, 'assignments',
        `${col('crewId')} = ? AND id <> ? AND ${col('status')} IN ('Planned','Onboard') AND NOT (? < ${col('signOnDate')} OR ? > COALESCE(${col('actualSignOff')}, ${col('plannedSignOff')}))`,
        [merged.crewId, merged.id || '', end, merged.signOnDate])
      if (clash && ['Planned', 'Onboard'].includes(merged.status || 'Planned')) return `Overlaps with ${clash.id} (${clash.status} ${clash.signOnDate} – ${clash.plannedSignOff})`
      return null
    },
    async afterCreate(db, a) { await syncCrewFromAssignment(db, a) },
    async afterUpdate(db, a, before, patch) { if ('status' in patch && patch.status !== before.status) await syncCrewFromAssignment(db, a) },
  },

  signOns: {
    async afterCreate(db, s) {
      const planned = await one(db, 'assignments', `${col('crewId')} = ? AND ${col('vesselId')} = ? AND ${col('status')} = 'Planned'`, [s.crewId, s.vesselId])
      if (planned) await updateRecord(db, 'assignments', planned.id, { status: 'Onboard', signOnDate: s.joiningDate, approval: 'Approved' })
      else await insertRecord(db, 'assignments', { crewId: s.crewId, vesselId: s.vesselId, rank: s.rank, signOnDate: s.joiningDate, plannedSignOff: addDays(180, s.joiningDate), joiningPort: s.port, status: 'Onboard', approval: 'Approved' })
      await updateRecord(db, 'crew', s.crewId, { status: 'Onboard', lastSignOn: s.joiningDate, availableFrom: '' })
      if (s.contractCommenced) {
        const con = await one(db, 'contracts', `${col('crewId')} = ? AND ${col('status')} IN ('Draft','Pending Approval')`, [s.crewId])
        if (con) await updateRecord(db, 'contracts', con.id, { status: 'Active', startDate: s.joiningDate })
      }
    },
  },

  signOffs: {
    async afterCreate(db, s) {
      const a = await one(db, 'assignments', `${col('crewId')} = ? AND ${col('status')} = 'Onboard'`, [s.crewId])
      if (a) await updateRecord(db, 'assignments', a.id, { status: 'Completed', actualSignOff: s.signOffDate })
      const con = await one(db, 'contracts', `${col('crewId')} = ? AND ${col('status')} = 'Active'`, [s.crewId])
      if (con) await updateRecord(db, 'contracts', con.id, { status: 'Completed' })
      const v = await getRecord(db, 'vessels', s.vesselId)
      const crew = await getRecord(db, 'crew', s.crewId)
      await insertRecord(db, 'seaService', { crewId: s.crewId, vesselName: v?.name || '', vesselType: v?.type || '', rank: s.rank, company: v?.manager || '', signOn: a?.signOnDate || crew?.lastSignOn || '', signOff: s.signOffDate, grt: v?.grt || '' })
      await updateRecord(db, 'crew', s.crewId, { status: s.nextEligibility === 'Not Eligible' ? 'Inactive' : 'On Leave', lastSignOff: s.signOffDate, availableFrom: addDays(60, s.signOffDate) })
    },
  },

  vacancies: {
    async afterCreate(db, v) {
      if (v.status !== 'Open') return
      const vessel = await getRecord(db, 'vessels', v.vesselId)
      await insertRecord(db, 'notifications', { type: 'Vacancy', title: `New vacancy: ${v.title}`, body: `${v.rank} for ${vessel?.name || v.vesselId} · joining ${v.joiningDate || 'TBA'} at ${v.joiningPort || 'TBA'}`, channel: 'WhatsApp', audience: 'Crew', crewId: '', date: today(), read: false, status: 'Sent' })
    },
  },
}

// Recruitment: selected candidate -> planned assignment + draft contract + crew status Planned
export async function onboardApplication(db, appId) {
  const app = await getRecord(db, 'applications', appId)
  if (!app) throw Object.assign(new Error('Application not found'), { status: 404 })
  if (app.status === 'Onboarded') throw Object.assign(new Error('Candidate already onboarded'), { status: 409 })
  const vac = await getRecord(db, 'vacancies', app.vacancyId)
  if (!vac) throw Object.assign(new Error('Vacancy not found'), { status: 404 })
  const start = vac.joiningDate || addDays(14)
  const months = Number(vac.contractMonths) || 6
  const end = addDays(months * 30, start)
  const assignment = await insertRecord(db, 'assignments', { crewId: app.crewId, vesselId: vac.vesselId, rank: vac.rank, signOnDate: start, plannedSignOff: end, joiningPort: vac.joiningPort, status: 'Planned', approval: 'Pending', fromApplication: app.id })
  const existingDraft = await one(db, 'contracts', `${col('crewId')} = ? AND ${col('status')} IN ('Draft','Pending Approval')`, [app.crewId])
  let contract = existingDraft
  if (!existingDraft) {
    const s = await one(db, 'salaryStructures', `${col('rank')} = ?`, [vac.rank]) || {}
    contract = await insertRecord(db, 'contracts', { crewId: app.crewId, vesselId: vac.vesselId, rank: vac.rank, startDate: start, endDate: end, durationMonths: months, basicWage: s.basic || vac.salary || 0, fixedOT: s.fixedOT || 0, leavePay: s.leavePay || 0, otherAllowance: s.otherAllowance || 0, currency: vac.currency || 'USD', cba: 'Company CBA', terms: 'As per MLC 2006 and applicable CBA.', status: 'Pending Approval', approval: 'Pending', signed: false, version: 1, history: [] })
  }
  await updateRecord(db, 'crew', app.crewId, { status: 'Planned', rank: vac.rank, department: vac.department })
  const updated = await updateRecord(db, 'applications', app.id, { stage: 'Joining Preparation', status: 'Onboarded' })
  return { application: updated, assignment, contract }
}

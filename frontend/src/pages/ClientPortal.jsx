import { useEffect, useState } from 'react'
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom'
import { CalendarRange, Eye, Ship, Users } from 'lucide-react'
import { api, subscribe } from '../api/client'
import { Badge, Card, Empty, KV, Modal, PageHeader, Stat, useToast } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { expiryStatus, fmtDate, fullName, money } from '../utils/format'
import PortalDocumentActions from './portal/PortalDocumentActions'

const PAGES = {
  dashboard: ['Dashboard', 'Fleet and crew activity across your vessels.'],
  vessels: ['My Vessels', 'Vessel particulars and onboard crew.'],
  crew: ['Crew Details', 'Onboard roster and current assignments.'],
  'crew-changes': ['Crew Changes', 'Planned sign-ons and sign-offs by vessel.'],
  documents: ['Contracts & Documents', 'Employment agreements and vessel certificates.'],
  payments: ['Crew Payments', 'Monthly wages and payment status by vessel.'],
  recruitment: ['Recruitment Approvals', 'Candidates submitted for your vessels.'],
}
const amount = (value, currency) => money(value, currency || 'USD', 2)

function Records({ title, columns, rows, empty, actions }) {
  return (
    <Card title={title} actions={actions} pad={false}>
      {rows.length ? <div className="table-scroll"><table className="simple-table" aria-label={title}>
        <thead><tr>{columns.map((label) => <th key={label} scope="col" style={label === 'Actions' ? { textAlign: 'center' } : undefined}>{label}</th>)}</tr></thead>
        <tbody>{rows.map(({ id, cells }) => <tr key={id}>{cells.map((value, index) => <td key={columns[index]}>{value ?? '—'}</td>)}</tr>)}</tbody>
      </table></div> : <Empty title={empty} />}
    </Card>
  )
}

function ViewButton({ label, onClick }) {
  return <div className="row-actions" style={{ justifyContent: 'center' }}><button type="button" className="icon-btn" title={label} aria-label={label} aria-haspopup="dialog" onClick={onClick}><Eye size={15} aria-hidden="true" /></button></div>
}

export default function ClientPortal() {
  const { page = 'dashboard' } = useParams()
  const [filters, setFilters] = useSearchParams()
  const { user, can } = useAuth()
  const toast = useToast()
  const [state, setState] = useState({ data: null, error: '' })
  const [detail, setDetail] = useState(null)
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const userId = user.id

  useEffect(() => {
    let current = true
    let request = 0
    const load = async () => {
      const id = ++request
      try {
        const data = await api.getClientPortal(userId)
        if (current && id === request) setState({ data, error: '' })
      } catch (error) {
        if (current && id === request) setState({ data: null, error: error.message })
      }
    }
    load()
    const unsubscribe = subscribe((resource) => {
      if (['*', 'vessels', 'assignments', 'crew', 'trainingRecords', 'payroll', 'applications', 'contracts'].includes(resource)) load()
    })
    return () => { current = false; unsubscribe() }
  }, [userId, attempt])

  const open = (title, items, footer, body) => setDetail({ title, items, footer, body })
  if (!Object.prototype.hasOwnProperty.call(PAGES, page) || (page === 'recruitment' && !can('recruitment', 'view'))) return <Navigate to="/client" replace />
  const [title, subtitle] = PAGES[page]
  if (!state.data) return <><PageHeader title={title} subtitle={subtitle} />{state.error
    ? <Card><p role="alert">{state.error}</p><button className="btn mt" onClick={() => setAttempt((value) => value + 1)}>Try again</button></Card>
    : <p className="muted" role="status">Loading…</p>}</>

  const data = state.data
  const requestedVessel = filters.get('vessel') || ''
  const vesselId = data.vessels.some((vessel) => vessel.id === requestedVessel) ? requestedVessel : ''
  const choose = (key, value) => setFilters((previous) => {
    const next = new URLSearchParams(previous)
    if (value) next.set(key, value)
    else next.delete(key)
    return next
  }, { replace: true })
  const matching = (rows) => rows.filter((row) => !vesselId || row.vesselId === vesselId)
  const vessels = data.vessels.filter((vessel) => !vesselId || vessel.id === vesselId)
  const vesselById = new Map(data.vessels.map((vessel) => [vessel.id, vessel]))
  const crewById = new Map(data.crew.map((crew) => [crew.id, crew]))
  const vesselName = (id) => vesselById.get(id)?.name || '—'
  const crewName = (id) => fullName(crewById.get(id))
  const onboard = matching(data.assignments).filter((row) => row.status === 'Onboard')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dateIsUpcoming = (value) => value && new Date(`${value.slice(0, 10)}T00:00:00`) >= today
  const changes = matching(data.assignments).flatMap((row) => {
    if (row.status === 'Planned' && row.signOnDate) return [{ ...row, movement: 'Sign on', date: row.signOnDate }]
    if (row.status === 'Onboard' && row.plannedSignOff) return [{ ...row, movement: 'Sign off', date: row.plannedSignOff }]
    return []
  }).sort((a, b) => a.date.localeCompare(b.date))

  const vesselsTable = () => <Records title="Vessel register" empty="No vessels assigned" columns={['Vessel', 'Type', 'Flag', 'Onboard', 'Status', 'Actions']}
    rows={vessels.map((vessel) => ({ id: vessel.id, cells: [
      <><strong>{vessel.name}</strong><br /><small className="muted">IMO {vessel.imo}</small></>, vessel.type, vessel.flag,
      onboard.filter((row) => row.vesselId === vessel.id).length, <Badge>{vessel.status}</Badge>,
      <ViewButton label={`View ${vessel.name}`} onClick={() => open(vessel.name, [
        ['IMO number', vessel.imo], ['Vessel type', vessel.type], ['Flag', vessel.flag], ['Owner', vessel.owner],
        ['Ship manager', vessel.manager], ['Operational status', vessel.status], ['Gross tonnage', vessel.grt], ['Deadweight', vessel.dwt],
        ['Year built', vessel.built], ['Trading area', vessel.tradingArea],
      ], <><Link className="btn" to={`/client/crew?vessel=${encodeURIComponent(vessel.id)}`} onClick={() => setDetail(null)}>View crew</Link><Link className="btn" to={`/client/payments?vessel=${encodeURIComponent(vessel.id)}`} onClick={() => setDetail(null)}>Crew payments</Link></>)} />,
    ] }))} />

  const changesTable = () => <Records title="Planned crew changes" empty="No planned crew changes" columns={['Date', 'Vessel', 'Crew member', 'Rank', 'Movement', 'Port']}
    rows={changes.map((row) => ({ id: row.id, cells: [fmtDate(row.date), vesselName(row.vesselId), crewName(row.crewId), row.rank, row.movement, row.joiningPort] }))} />

  const crewTable = () => <Records title="Onboard roster" empty="No crew currently onboard" columns={['Crew member', 'Rank', 'Vessel', 'Signed on', 'Planned sign-off', 'Actions']}
    rows={onboard.map((row) => ({ id: row.id, cells: [
      <><strong>{crewName(row.crewId)}</strong><br /><small className="muted">{row.crewId}</small></>, row.rank, vesselName(row.vesselId), fmtDate(row.signOnDate), fmtDate(row.plannedSignOff),
      <ViewButton label={`View ${crewName(row.crewId)}`} onClick={() => open(crewName(row.crewId), [
        ['Crew ID', row.crewId], ['Rank', row.rank], ['Vessel', vesselName(row.vesselId)], ['Nationality', crewById.get(row.crewId)?.nationality],
        ['Signed on', fmtDate(row.signOnDate)], ['Planned sign-off', fmtDate(row.plannedSignOff)], ['Status', row.status],
      ], null, <Records title="Qualifications" empty="No completed qualifications recorded" columns={['Course', 'Completed', 'Valid until']}
        rows={(data.qualifications || []).filter((entry) => entry.crewId === row.crewId).map((entry) => ({ id: entry.id, cells: [entry.name, fmtDate(entry.completedOn), fmtDate(entry.expiryDate)] }))} />)} />,
    ] }))} />

  const documentsTable = () => <>
    <Records title="Employment agreements" empty="No contracts for this selection" columns={['Contract', 'Seafarer', 'Vessel', 'Period', 'Signed', 'Actions']}
      rows={matching(data.contracts).map((row) => ({ id: row.id, cells: [row.id, crewName(row.crewId), vesselName(row.vesselId),
        `${fmtDate(row.startDate)} – ${fmtDate(row.endDate)}`, <Badge tone={row.signed ? 'ok' : 'warn'}>{row.signed ? 'Signed' : 'Awaiting signature'}</Badge>,
        <ViewButton label={`Preview contract ${row.id}`} onClick={() => open(`Employment agreement · ${row.id}`, [
          ['Seafarer', crewName(row.crewId)], ['Vessel', vesselName(row.vesselId)], ['Rank', row.rank], ['Version', row.version || 1],
          ['Start date', fmtDate(row.startDate)], ['End date', fmtDate(row.endDate)], ['Signed on', fmtDate(row.signedAt)], ['Status', row.status],
          ['Basic wage', amount(row.basicWage, row.currency)], ['Fixed overtime', amount(row.fixedOT, row.currency)], ['Leave pay', amount(row.leavePay, row.currency)], ['Other allowances', amount(row.otherAllowance, row.currency)],
          ['Applicable CBA', row.cba], ['Terms', row.terms],
        ])} />,
      ] }))} />
    <Records title="Vessel documents" empty="No vessel documents for this selection" columns={['Document', 'Vessel', 'Expiry', 'Status', 'Actions']}
      rows={vessels.flatMap((vessel) => (vessel.documents || []).map((doc, index) => ({ id: `${vessel.id}-${index}`, cells: [
        doc.name, vessel.name, fmtDate(doc.expiry), <Badge tone={expiryStatus(doc.expiry).tone}>{expiryStatus(doc.expiry).label}</Badge>,
        <PortalDocumentActions title={doc.name || 'Vessel document'} fileName={doc.fileName} fileUrl={doc.fileUrl} />,
      ] })))} />
  </>

  const paymentsTable = () => {
    const records = matching(data.payroll)
    const periods = [...new Set(records.map((row) => row.period).filter(Boolean))].sort().reverse()
    const requested = filters.get('period') || ''
    const period = periods.includes(requested) ? requested : periods[0] || ''
    const rows = records.filter((row) => row.period === period)
    const totals = new Map()
    rows.forEach((row) => {
      const currency = row.currency || 'USD'
      const total = totals.get(currency) || { net: 0, paid: 0, pending: 0 }
      const net = Number(row.net) || 0
      total.net += net
      if (row.status === 'Paid') total.paid += net
      else total.pending += net
      totals.set(currency, total)
    })
    return <>
      {totals.size > 0 && <Card><KV items={[...totals].flatMap(([currency, total]) => [
        [`Net wages (${currency})`, amount(total.net, currency)], [`Paid (${currency})`, amount(total.paid, currency)], [`Pending (${currency})`, amount(total.pending, currency)],
      ])} /></Card>}
      <Records title="Monthly crew payments" empty="No payroll records for this selection" columns={['Crew member', 'Vessel', 'Gross', 'Deductions', 'Net pay', 'Status', 'Actions']}
        actions={periods.length > 0 && <label className="row">Payroll month <select className="input input-sm" value={period} onChange={(event) => choose('period', event.target.value)}>{periods.map((value) => <option key={value}>{value}</option>)}</select></label>}
        rows={rows.map((row) => {
          const deductions = Number(row.advance || 0) + Number(row.deductions || 0)
          return { id: row.id, cells: [crewName(row.crewId), vesselName(row.vesselId), amount(row.gross, row.currency), amount(deductions, row.currency),
            <strong>{amount(row.net, row.currency)}</strong>, <Badge>{row.status}</Badge>,
            <ViewButton label={`Preview payslip for ${crewName(row.crewId)}`} onClick={() => open(`Payslip · ${crewName(row.crewId)}`, [
              ['Period', row.period], ['Vessel', vesselName(row.vesselId)], ['Basic wage', amount(row.basic, row.currency)], ['Fixed overtime', amount(row.fixedOT, row.currency)],
              ['Extra overtime', amount(row.extraOT, row.currency)], ['Leave wages', amount(row.leaveWages, row.currency)], ['Allowances', amount(row.allowances, row.currency)],
              ['Gross wages', amount(row.gross, row.currency)], ['Deductions', amount(deductions, row.currency)], ['Net pay', amount(row.net, row.currency)],
              ['Home allotment', amount(row.allotment, row.currency)], ['Payment status', row.status], ['Paid on', fmtDate(row.paidOn)],
            ])} />,
          ] }
        })} />
    </>
  }

  const recruitmentTable = () => <Records title="Submitted candidates" empty="No candidates submitted for this selection" columns={['Candidate', 'Position', 'Vessel', 'Submitted', 'Decision', 'Actions']}
    rows={matching(data.applications).map((row) => ({ id: row.id, cells: [crewName(row.crewId), row.title || row.rank, vesselName(row.vesselId), fmtDate(row.appliedOn), <Badge>{row.clientApproval}</Badge>,
      <ViewButton label={`Review ${crewName(row.crewId)}`} onClick={() => open(crewName(row.crewId), [
        ['Position', row.title || row.rank], ['Vessel', vesselName(row.vesselId)], ['Rank', row.rank], ['Experience (months)', crewById.get(row.crewId)?.totalExperienceMonths],
        ['Submitted', fmtDate(row.appliedOn)], ['Client decision', row.clientApproval],
      ], data.canApprove && row.clientApproval === 'Pending' && row.status === 'Active' && row.stage === 'Client Approval' ? { applicationId: row.id } : null)} />,
    ] }))} />

  async function decide(decision) {
    if (busy || !detail?.footer?.applicationId) return
    setBusy(true)
    try {
      await api.decideClientApplication(userId, detail.footer.applicationId, decision)
      setDetail(null)
      toast(decision === 'Approved' ? 'Candidate approved' : 'Candidate declined')
    } catch (error) {
      toast(error.message, 'danger')
      setAttempt((value) => value + 1)
    } finally { setBusy(false) }
  }

  const render = {
    dashboard: () => <><div className="stats">
      <Stat label="Vessels" value={vessels.length} icon={Ship} tone="blue" />
      <Stat label="Crew onboard" value={onboard.length} icon={Users} tone="teal" />
      <Stat label="Upcoming crew changes" value={changes.filter((row) => dateIsUpcoming(row.date)).length} icon={CalendarRange} tone="amber" />
    </div>{vesselsTable()}{changesTable()}</>,
    vessels: vesselsTable, crew: crewTable, 'crew-changes': changesTable, documents: documentsTable, payments: paymentsTable, recruitment: recruitmentTable,
  }

  return <>
    <PageHeader title={title} subtitle={subtitle} actions={<label className="row">Vessel <select className="input input-sm" value={vesselId} onChange={(event) => choose('vessel', event.target.value)}>
      <option value="">All vessels</option>{data.vessels.map((vessel) => <option key={vessel.id} value={vessel.id}>{vessel.name}</option>)}
    </select></label>} />
    {render[page]()}
    {detail && <Modal open title={detail.title} onClose={() => { if (!busy) setDetail(null) }}
      footer={detail.footer?.applicationId ? <><button className="btn" disabled={busy} onClick={() => decide('Rejected')}>Decline</button><button className="btn btn-primary" disabled={busy} onClick={() => decide('Approved')}>Approve candidate</button></> : detail.footer}>
      <KV items={detail.items} />
      {detail.body && <div className="mt">{detail.body}</div>}
    </Modal>}
  </>
}

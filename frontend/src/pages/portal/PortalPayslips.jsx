import { Badge, Card, Empty } from '../../components/ui'
import { useData } from '../../api/hooks'
import { payslipPDF } from '../../utils/documents'
import { money } from '../../utils/format'
import PortalDocumentActions from './PortalDocumentActions'
import { usePortal } from './usePortal'

export default function PortalPayslips() {
  const { me, mine, vesselById } = usePortal()
  const { payroll } = useData('payroll')
  const list = mine(payroll).sort((a, b) => b.period.localeCompare(a.period))
  return (
    <>
      <div className="page-head"><div><h1>Salary Slips</h1><p className="muted">Preview and download monthly payslips.</p></div></div>
      <Card pad={false}>
        {list.length ? (
          <table className="simple-table">
            <thead><tr><th>Period</th><th>Vessel</th><th>Gross</th><th>Deductions</th><th>Net</th><th>Allotment</th><th>Status</th><th scope="col" style={{ textAlign: 'center' }}>Actions</th></tr></thead>
            <tbody>{list.map((p) => (
              <tr key={p.id}><td><strong>{p.period}</strong></td><td>{vesselById[p.vesselId]?.name}</td><td>{money(p.gross, p.currency)}</td><td>{money(Number(p.advance || 0) + Number(p.deductions || 0), p.currency)}</td><td><strong>{money(p.net, p.currency)}</strong></td><td>{money(p.allotment, p.currency)}</td><td><Badge>{p.status}</Badge></td>
                <td><PortalDocumentActions title={`Payslip · ${p.period}`} downloadLabel="Payslip"
                  createPdf={(options) => payslipPDF({ pay: p, crew: me, vessel: vesselById[p.vesselId] }, options)} /></td></tr>
            ))}</tbody>
          </table>
        ) : <Empty title="No payslips yet" />}
      </Card>
    </>
  )
}

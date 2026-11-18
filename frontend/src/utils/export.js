// Export helpers: CSV, Excel (.xlsx) and PDF. Heavy libs are loaded on demand.

function cellValue(col, row) {
  if (col.exportValue) return col.exportValue(row)
  const value = row[col.key]
  return value === undefined || value === null ? '' : value
}

function toMatrix(columns, rows) {
  const cols = columns.filter((c) => c.key !== '_actions' && c.export !== false)
  return {
    headers: cols.map((c) => c.label),
    body: rows.map((row) => cols.map((col) => cellValue(col, row))),
  }
}

function download(blob, filename) {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(link.href), 1000)
}

const stamp = () => new Date().toISOString().slice(0, 10)
const safe = (s) => s.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '')

export function exportCSV(title, columns, rows) {
  const { headers, body } = toMatrix(columns, rows)
  const escapeCell = (value) => {
    const text = String(value)
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
  }
  const csv = [headers, ...body].map((row) => row.map(escapeCell).join(',')).join('\n')
  download(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' }), `${safe(title)}_${stamp()}.csv`)
}

export async function exportExcel(title, columns, rows) {
  const XLSX = await import('xlsx')
  const { headers, body } = toMatrix(columns, rows)
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...body])

  sheet['!cols'] = headers.map((header, index) => ({
    wch: Math.min(40, Math.max(header.length, ...body.map((row) => String(row[index] ?? '').length)) + 2),
  }))

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, sheet, title.slice(0, 31))
  XLSX.writeFile(workbook, `${safe(title)}_${stamp()}.xlsx`)
}

async function pdfLib() {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  return { jsPDF, autoTable }
}

function header(doc, title, subtitle) {
  const width = doc.internal.pageSize.getWidth()

  doc.setFillColor(11, 37, 69)
  doc.rect(0, 0, width, 54, 'F')
  doc.setTextColor(255, 255, 255)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.text('CrewDesk', 40, 25)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text('Integrated Crew Management System', 40, 40)

  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text(title, width - 40, 25, { align: 'right' })

  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.text(subtitle, width - 40, 40, { align: 'right' })
  }

  doc.setTextColor(20, 20, 20)
}

export async function exportPDF(title, columns, rows) {
  const { jsPDF, autoTable } = await pdfLib()
  const { headers, body } = toMatrix(columns, rows)
  const doc = new jsPDF({
    orientation: headers.length > 6 ? 'landscape' : 'portrait',
    unit: 'pt',
    format: 'a4',
  })

  header(doc, title, `Generated ${new Date().toLocaleString('en-GB')} · ${rows.length} records`)
  autoTable(doc, {
    head: [headers],
    body,
    startY: 70,
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [28, 77, 122] },
    alternateRowStyles: { fillColor: [244, 247, 251] },
  })

  doc.save(`${safe(title)}_${stamp()}.pdf`)
}

// Used for offer letters, contracts, payslips and joining instructions.
export async function documentPDF({ title, subtitle, filename, blocks }, { preview = false } = {}) {
  const { jsPDF, autoTable } = await pdfLib()
  const doc = new jsPDF({ unit: 'pt', format: 'a4' })
  header(doc, title, subtitle)

  let y = 80
  const width = doc.internal.pageSize.getWidth()

  for (const block of blocks) {
    if (block.heading) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.text(block.heading, 40, y)
      y += 8
    }

    if (block.pairs) {
      autoTable(doc, {
        startY: y,
        body: block.pairs.map(([label, value]) => [label, String(value ?? '—')]),
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 5 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 170, fillColor: [244, 247, 251] },
        },
        margin: { left: 40, right: 40 },
      })
      y = doc.lastAutoTable.finalY + 20
    }

    if (block.table) {
      autoTable(doc, {
        startY: y,
        head: [block.table.head],
        body: block.table.body,
        styles: { fontSize: 9 },
        headStyles: { fillColor: [28, 77, 122] },
        margin: { left: 40, right: 40 },
      })
      y = doc.lastAutoTable.finalY + 20
    }

    if (block.text) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      const lines = doc.splitTextToSize(block.text, width - 80)
      doc.text(lines, 40, y + 6)
      y += lines.length * 13 + 16
    }

    if (block.signatures) {
      y += 30
      block.signatures.forEach((signature, index) => {
        const x = 40 + index * ((width - 80) / block.signatures.length)
        doc.line(x, y, x + 160, y)
        doc.setFontSize(9)
        doc.text(signature, x, y + 14)
      })
      y += 40
    }

    if (y > 760) {
      doc.addPage()
      y = 50
    }
  }

  if (preview) return { blob: doc.output('blob'), filename }
  doc.save(filename)
}
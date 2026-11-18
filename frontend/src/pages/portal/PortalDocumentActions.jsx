import { useEffect, useState } from 'react'
import { Eye, FileDown } from 'lucide-react'
import { Modal } from '../../components/ui'

function getAttachmentUrl(fileUrl) {
  if (typeof fileUrl !== 'string' || !fileUrl.trim()) return null
  try {
    const url = new URL(fileUrl, window.location.href)
    if (url.protocol === 'http:' || url.protocol === 'https:') return url
    if (url.protocol === 'blob:' && url.origin === window.location.origin) return url
  } catch {
    return null
  }
  return null
}

function PreviewDialog({ title, fileName, attachmentUrl, createPdf, onClose }) {
  const names = [fileName || '', attachmentUrl?.pathname || '']
  const isPdf = Boolean(createPdf) || names.some((name) => /\.pdf$/i.test(name))
  const isImage = names.some((name) => /\.(png|jpe?g|webp|gif)$/i.test(name))
  const attachment = attachmentUrl?.href
  const [pdf, setPdf] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!isPdf) return undefined
    const controller = new AbortController()
    let previewUrl

    async function loadPdf() {
      try {
        let file
        if (createPdf) {
          file = await createPdf({ preview: true })
        } else {
          // A blob URL lets the portal display PDFs served by the API on another origin.
          const response = await fetch(attachment, { signal: controller.signal, referrerPolicy: 'no-referrer' })
          if (!response.ok) throw new Error('Could not load the PDF')
          const blob = await response.blob()
          if (await blob.slice(0, 5).text() !== '%PDF-') throw new Error('Invalid PDF')
          file = { blob: blob.slice(0, blob.size, 'application/pdf'), filename: fileName }
        }
        if (controller.signal.aborted) return
        previewUrl = URL.createObjectURL(file.blob)
        setPdf({ url: previewUrl, filename: file.filename })
      } catch {
        if (!controller.signal.aborted) setFailed(true)
      }
    }

    loadPdf()
    return () => {
      controller.abort()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [attachment, createPdf, fileName, isPdf])

  let footer
  if (attachment) {
    footer = <a className="btn" href={attachment} target="_blank" rel="noreferrer">Open file in new tab</a>
  } else if (pdf) {
    footer = <a className="btn" href={pdf.url} download={pdf.filename}>Download PDF</a>
  }

  let content
  if (failed || (!isPdf && !isImage)) {
    content = <p role="status">{attachment ? 'This file cannot be displayed here. Open it in a new tab to view it.' : 'The PDF could not be generated. Close the preview and try again.'}</p>
  } else if (isPdf) {
    if (!pdf) content = <p role="status">Loading document…</p>
    else if (navigator.pdfViewerEnabled === false) content = <p role="status">Use the button below to open or download this PDF.</p>
    else content = <iframe title={`Preview of ${title}`} src={pdf.url} style={{ display: 'block', width: '100%', height: '58vh', border: 0 }} />
  } else {
    content = <img src={attachment} alt={`${title} attachment`} referrerPolicy="no-referrer" onError={() => setFailed(true)}
      style={{ display: 'block', maxWidth: '100%', maxHeight: '60vh', margin: '0 auto' }} />
  }

  return (
    <Modal open title={title} onClose={onClose} width={900} footer={footer}>
      {fileName && <p className="muted" style={{ marginBottom: 12 }}>{fileName}</p>}
      {content}
    </Modal>
  )
}

export default function PortalDocumentActions({ title, fileName, fileUrl, createPdf, downloadLabel, children }) {
  const [preview, setPreview] = useState(null)
  const attachmentUrl = getAttachmentUrl(fileUrl)
  const canPreview = Boolean(attachmentUrl || createPdf)

  return (
    <>
      <div className="row-actions" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <button type="button" className="icon-btn" aria-haspopup="dialog" disabled={!canPreview}
          title={canPreview ? 'Preview' : 'No attachment to preview'} aria-label={`Preview ${title}`}
          onClick={() => setPreview({ title, fileName, attachmentUrl, createPdf })}><Eye size={15} aria-hidden="true" /></button>
        {createPdf && <button type="button" className="btn btn-sm" aria-label={`Download ${title}`} onClick={() => createPdf()}>
          <FileDown size={14} aria-hidden="true" /> {downloadLabel}
        </button>}
        {children}
      </div>
      {preview && <PreviewDialog {...preview} onClose={() => setPreview(null)} />}
    </>
  )
}

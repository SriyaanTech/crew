import { useState } from "react";
import { Upload } from "lucide-react";
import { Badge, Card, useToast } from "../../components/ui";
import FormModal from "../../components/FormModal";
import { api } from "../../api/client";
import { useData } from "../../api/hooks";
import { DOCUMENT_TYPES } from "../../config/constants";
import { fmtDate, expiryStatus } from "../../utils/format";
import PortalDocumentActions from "./PortalDocumentActions";
import { usePortal } from "./usePortal";

export default function PortalDocuments() {
  const { id, mine } = usePortal();
  const { documents } = useData("documents");
  const [up, setUp] = useState(null);
  const toast = useToast();
  const docs = mine(documents);
  return (
    <>
      <div className="page-head">
        <div>
          <h1>My Documents</h1>
          <p className="muted">
            Upload passport and certificates. The documentation team will verify
            each upload.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setUp({})}>
          <Upload size={15} /> Upload document
        </button>
      </div>
      <Card pad={false}>
        <table className="simple-table">
          <thead>
            <tr>
              <th>Document</th>
              <th>Number</th>
              <th>Issued</th>
              <th>Expiry</th>
              <th>Alert</th>
              <th>Verification</th>
              <th>Remarks</th>
              <th scope="col" style={{ textAlign: "center" }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => {
              const expiry = expiryStatus(d.expiryDate);
              return (
                <tr key={d.id}>
                  <td>
                    <strong>{d.type}</strong>
                    <br />
                    <small className="muted">{d.fileName}</small>
                  </td>
                  <td>{d.number}</td>
                  <td>{fmtDate(d.issueDate)}</td>
                  <td>{fmtDate(d.expiryDate)}</td>
                  <td>
                    <Badge tone={expiry.tone}>{expiry.label}</Badge>
                  </td>
                  <td>
                    <Badge>{d.status}</Badge>
                  </td>
                  <td>
                    <small>{d.remarks}</small>
                  </td>
                  <td>
                    <PortalDocumentActions
                      title={d.type}
                      fileName={d.fileName}
                      fileUrl={d.fileUrl}
                    >
                      <button
                        type="button"
                        className="icon-btn"
                        title="Re-upload"
                        aria-label={`Re-upload ${d.type}`}
                        aria-haspopup="dialog"
                        onClick={() => setUp(d)}
                      >
                        <Upload size={15} aria-hidden="true" />
                      </button>
                    </PortalDocumentActions>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <FormModal
        open={!!up}
        title={up?.id ? `Re-upload ${up.type}` : "Upload document"}
        initial={up}
        onClose={() => setUp(null)}
        width={720}
        fields={[
          {
            name: "type",
            label: "Document type",
            type: "select",
            options: DOCUMENT_TYPES,
            required: true,
            disabled: !!up?.id,
          },
          { name: "number", label: "Document number", required: true },
          { name: "issuingAuthority", label: "Issuing authority" },
          { name: "issueDate", label: "Issue date", type: "date" },
          { name: "expiryDate", label: "Expiry date", type: "date" },
          {
            name: "fileName",
            label: "File (PDF / image)",
            type: "file",
            urlField: "fileUrl",
            required: true,
          },
        ]}
        onSubmit={async (v) => {
          if (up?.id)
            await api.update("documents", up.id, {
              ...v,
              status: "Pending",
              remarks: "",
              version: (up.version || 1) + 1,
            });
          else
            await api.create("documents", {
              ...v,
              crewId: id,
              status: "Pending",
              version: 1,
            });
          toast("Uploaded – pending verification");
        }}
      />
    </>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { partyDocumentSections } from './billingProfile';
import { billingDocPath, filterDocsByPeriod, money } from './billingUtils';

const TYPE_LABEL = {
  tax_invoice: 'Tax Invoice',
  bill_of_supply: 'Bill of Supply',
  debit_note: 'Debit Note',
  credit_note: 'Credit Note',
};

function fmtDateDdMmYyyy(v) {
  if (!v) return '—';
  const s = String(v).slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return s;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

/** Sample Document View: oldest → newest, then by number. */
function sortDocs(list) {
  return [...list].sort((a, b) => {
    const da = String(a.document_date || '');
    const db = String(b.document_date || '');
    if (da !== db) return da.localeCompare(db);
    return String(a.number || '').localeCompare(String(b.number || ''));
  });
}

/**
 * Sample Document View — single flat table of all document types:
 * Document Type | Document No. | Date | Taxable Value | CGST | SGST | IGST | Total
 */
function SampleDocumentTable({ docs, onClose, viewPath }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="bp-table">
        <thead>
          <tr>
            <th>Document Type</th>
            <th>Document No.</th>
            <th>Date</th>
            <th>Taxable Value</th>
            <th>CGST</th>
            <th>SGST</th>
            <th>IGST</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {docs.map((r) => (
            <tr key={r.id || `${r.type}-${r.number}`}>
              <td>{TYPE_LABEL[r.type] || r.type}</td>
              <td>
                {r.id ? (
                  <Link to={viewPath(r)} onClick={onClose} style={{ fontWeight: 600, color: 'var(--bp-navy)' }}>
                    {r.number}
                  </Link>
                ) : (
                  r.number
                )}
              </td>
              <td>{fmtDateDdMmYyyy(r.document_date)}</td>
              <td>{money(r.taxable_amount)}</td>
              <td>{money(r.cgst_amount)}</td>
              <td>{money(r.sgst_amount)}</td>
              <td>{money(r.igst_amount)}</td>
              <td>{money(r.grand_total || r.total_amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Party Document Details popup.
 * Matches Sample Document View: all types on one screen / one table.
 */
export default function PartyDocumentsModal({
  open,
  onClose,
  partyName,
  fetchUrl = null,
  documents = null,
  detailBasePath = null,
  profile = null,
  from = '',
  to = '',
  fy = '',
}) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (!open) return;
    setErr('');
    if (Array.isArray(documents)) {
      setRows(documents);
      setLoading(false);
      return;
    }
    if (!fetchUrl) {
      setRows([]);
      return;
    }
    setLoading(true);
    api(fetchUrl)
      .then((d) => setRows(d.data || d || []))
      .catch((e) => setErr(e.message || 'Failed to load documents'))
      .finally(() => setLoading(false));
  }, [open, fetchUrl, documents]);

  const periodDocs = useMemo(
    () => filterDocsByPeriod(rows, { from, to }),
    [rows, from, to],
  );

  const allowedTypes = useMemo(
    () => new Set(partyDocumentSections(profile).map((s) => s.type)),
    [profile],
  );

  const flatDocs = useMemo(
    () => sortDocs(periodDocs.filter((d) => allowedTypes.has(d.type))),
    [periodDocs, allowedTypes],
  );

  if (!open) return null;

  const viewPath = (doc) => {
    if (detailBasePath) return `${detailBasePath}/${doc.id}`;
    return billingDocPath(doc.type, doc.id);
  };

  const periodLabel = [
    fy ? `FY ${fy}` : null,
    from || to ? `${from ? fmtDateDdMmYyyy(from) : '…'} to ${to ? fmtDateDdMmYyyy(to) : '…'}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div
      className="bp-modal-backdrop"
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 80,
        background: 'rgba(15, 23, 42, 0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        className="bp-card"
        role="dialog"
        aria-modal="true"
        aria-label={`Party Document Details — ${partyName}`}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(1100px, 100%)',
          maxHeight: '85vh',
          overflow: 'auto',
          margin: 0,
          boxShadow: '0 20px 50px rgba(0,0,0,.25)',
        }}
      >
        <div className="bp-toolbar" style={{ marginBottom: 12 }}>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0 }}>Party Document Details — {partyName || 'Party'}</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--bp-muted)' }}>
              {periodLabel ? <>Filtered: <strong>{periodLabel}</strong> · </> : null}
              {loading ? 'Loading…' : `${flatDocs.length} document${flatDocs.length === 1 ? '' : 's'}`}
            </p>
          </div>
          <button type="button" className="bp-btn bp-btn-outline" onClick={onClose}>Close</button>
        </div>

        {err && <p style={{ color: 'var(--bp-red)' }}>{err}</p>}

        {!loading && flatDocs.length > 0 && (
          <SampleDocumentTable docs={flatDocs} onClose={onClose} viewPath={viewPath} />
        )}

        {!loading && !err && flatDocs.length === 0 && (
          <p style={{
            margin: 0,
            padding: '16px 14px',
            background: '#f8fafc',
            border: '1px dashed #c8d3e6',
            borderRadius: 8,
            color: 'var(--bp-muted)',
            fontSize: 13,
          }}
          >
            No Records Found.
          </p>
        )}
      </div>
    </div>
  );
}

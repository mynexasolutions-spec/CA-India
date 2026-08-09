import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, getAuthToken } from '../../api/client';
import ReportTable from '../billing/ReportTable';
import GstSummaryMatrix from '../billing/GstSummaryMatrix';
import { currentFyLabel, currentFyRange } from '../billing/billingUtils';

function money(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

const GST_TABS = [
  { id: 'tax_invoices', label: 'Tax Invoice/Bill of Supply', export: 'tax_invoice_register' },
  { id: 'debit_notes', label: 'Debit Notes', export: 'debit_note_register' },
  { id: 'credit_notes', label: 'Credit Notes', export: 'credit_note_register' },
  { id: 'bill_of_supply', label: 'Bill of Supply', export: 'bill_of_supply_register' },
  { id: 'gst_summary', label: 'GST Summary', export: 'gst_summary' },
  { id: 'hsn_summary', label: 'HSN Summary', export: 'hsn_summary' },
  { id: 'party_wise', label: 'Party-wise Detail', export: 'billing_summary' },
];

const RETAIL_TABS = [
  { id: 'tax_invoices', label: 'Invoice', export: 'tax_invoice_register' },
];

export default function AdminClientBilling() {
  const { id } = useParams();
  const fy = currentFyRange();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('tax_invoices');
  const [from] = useState(fy.from);
  const [to] = useState(fy.to);

  const load = () => {
    const qs = new URLSearchParams({
      preset: 'custom',
      from,
      to,
    });
    api(`/admin/clients/${id}/billing/dashboard?${qs}`).then(setData).catch(console.error);
  };

  useEffect(() => { load(); }, [id]);

  const download = async (type, format) => {
    const token = getAuthToken();
    const qs = new URLSearchParams({ type, format, preset: 'custom', from, to });
    const res = await fetch(`/api/admin/clients/${id}/billing/export?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${type}.${format === 'pdf' ? 'pdf' : 'xls'}`;
    a.click();
  };

  if (!data) return <p>Loading client billing…</p>;

  const s = data.summary || {};
  const client = data.client || {};
  const isNonGst = client.has_gst === false || client.has_gst === 0;
  const tabs = isNonGst ? RETAIL_TABS : GST_TABS;
  const activeTab = tabs.find((t) => t.id === tab) || tabs[0];

  const kpis = isNonGst
    ? [
        ['Total Invoices', s.tax_invoices ?? s.total_documents ?? 0],
        ['Invoice Value', money(s.total_invoice_value)],
        ['Invoice Count', s.tax_invoices ?? s.total_documents ?? 0],
      ]
    : [
        ['Total Invoices', s.tax_invoices ?? 0],
        ['Taxable Value', money(s.taxable_value)],
        ['CGST', money(s.cgst)],
        ['SGST', money(s.sgst)],
        ['IGST', money(s.igst)],
        ['Total GST', money(s.total_gst)],
        ['Invoice Value', money(s.total_invoice_value)],
        ['Invoice Count', s.total_documents ?? 0],
      ];

  return (
    <div>
      <div className="bp-toolbar">
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>Client Billing Dashboard</h2>
          <div style={{ fontSize: 12, color: 'var(--bp-muted)' }}>
            {client.business_name || client.client_name} · {client.client_code}
            {' · '}FY {currentFyLabel()} ({from} → {to})
            {isNonGst ? ' · Non-GST' : ` · GSTIN: ${client.gstin || '—'}`}
          </div>
        </div>
        <Link className="bp-btn bp-btn-outline" to="/admin/billing">All Clients</Link>
        <Link className="bp-btn bp-btn-outline" to={`/admin/clients/${id}/edit`}>Edit Profile</Link>
      </div>

      <div className="bp-grid-4" style={{ marginTop: 14 }}>
        {kpis.map(([label, val]) => (
          <div key={label} className="bp-card bp-kpi">
            <div className="label">{label}</div>
            <div className="value" style={{ fontSize: 20 }}>{val}</div>
          </div>
        ))}
      </div>

      <nav className="bp-section-nav" style={{ marginTop: 16 }} aria-label="Client billing tabs">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`bp-section-nav-link${(activeTab?.id === t.id) ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="bp-card" style={{ marginTop: 14 }}>
        <div className="bp-toolbar">
          <h3 style={{ margin: 0, flex: 1 }}>{activeTab.label}</h3>
          <button type="button" className="bp-btn bp-btn-green" onClick={() => download(activeTab.export, 'xls')}>
            Export Excel
          </button>
          <button type="button" className="bp-btn bp-btn-danger" onClick={() => download(activeTab.export, 'pdf')}>
            Export PDF
          </button>
        </div>

        {activeTab.id === 'gst_summary' && (
          <div style={{ marginTop: 12 }}>
            <GstSummaryMatrix matrix={data.gst_matrix} title="" profile={data.client} />
          </div>
        )}

        {activeTab.id === 'hsn_summary' && (
          <div style={{ marginTop: 12 }}>
            <ReportTable type="hsn_summary" payload={{ data: data.hsn_summary }} />
          </div>
        )}

        {['tax_invoices', 'debit_notes', 'credit_notes', 'bill_of_supply'].includes(activeTab.id) && (
          <div style={{ marginTop: 12, overflowX: 'auto' }}>
            <ReportTable
              type="invoice_register"
              payload={{ data: data.documents?.[activeTab.id] || [] }}
              detailBasePath="/admin/firm-billing/invoices"
            />
          </div>
        )}

        {activeTab.id === 'party_wise' && (
          <div style={{ marginTop: 12, overflowX: 'auto' }}>
            <ReportTable
              type="party_wise"
              payload={{ data: data.party_wise || [] }}
              from={from}
              to={to}
              fy={currentFyLabel()}
              detailBasePath="/admin/firm-billing/invoices"
              profile={data.client}
              documentPool={[
                ...(data.documents?.tax_invoices || []),
                ...(data.documents?.bill_of_supply || []),
                ...(data.documents?.debit_notes || []),
                ...(data.documents?.credit_notes || []),
              ]}
            />
          </div>
        )}
      </div>
    </div>
  );
}

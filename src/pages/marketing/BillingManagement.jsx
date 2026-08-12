import { Link } from 'react-router-dom';
import Seo from '../../components/seo/Seo';

const FEATURES = [
  'Tax Invoice/Bill of Supply, Credit Note, Debit Note, Quotation, Proforma & Delivery Challan',
  'Customer & Product masters with HSN/SAC and GST rates',
  'CGST / SGST / IGST auto-calculation for intra & inter-state',
  'PDF generation, email & WhatsApp share links',
  'Invoice series, prefix & FY numbering',
  '17 business reports with Excel/CSV export',
  'Multi-user ready with role-based client access',
  'Mobile-friendly billing workspace',
];

export default function BillingManagement() {
  return (
    <>
      <Seo
        title="GST Billing Management Software | A B KHAN & ASSOCIATES"
        description="GST-ready billing software for businesses in Navi Mumbai — invoices, credit notes, masters, reports, PDF and WhatsApp sharing."
        path="/billing-management"
      />
      <section className="page-hero">
        <div className="container">
          <p className="eyebrow" style={{ color: 'var(--gold-light)' }}>
            Billing Management
          </p>
          <h1>GST Billing Software Built for Growing Businesses</h1>
          <p>
            Create GST-compliant invoices, manage customers and products, and export reports — all from your Client
            Portal. Designed for SMEs in Navi Mumbai and beyond.
          </p>
          <div className="hero-actions">
            <Link to="/login" className="btn btn-gold">
              Login
            </Link>
            <Link to="/contact" className="btn btn-outline">
              Book a Demo
            </Link>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container two-col">
          <div>
            <p className="eyebrow">Product Overview</p>
            <h2>End-to-end invoicing with GST accuracy</h2>
            <p>
              Our Billing Management module helps you raise professional documents, track dues, and stay audit-ready.
              It is included with engagement through A B KHAN & ASSOCIATES Client Portal.
            </p>
            <ul className="check-list">
              {FEATURES.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>
          <div className="feature-card" style={{ padding: 24 }}>
            <h3 style={{ marginTop: 0 }}>Document types</h3>
            <ol>
              <li>Tax Invoice/Bill of Supply</li>
              <li>Credit Note</li>
              <li>Debit Note</li>
              <li>Quotation</li>
              <li>Proforma Invoice</li>
              <li>Delivery Challan</li>
            </ol>
            <Link to="/login" className="btn btn-navy" style={{ marginTop: 16 }}>
              Access Billing Workspace
            </Link>
          </div>
        </div>
      </section>

      <section className="section" style={{ background: 'var(--bg-soft, #f5f7fa)' }}>
        <div className="container" style={{ textAlign: 'center' }}>
          <h2>Ready to digitise your billing?</h2>
          <p>Talk to our team about enabling Billing Management for your business.</p>
          <Link to="/contact" className="btn btn-gold">
            Contact Us
          </Link>
        </div>
      </section>
    </>
  );
}

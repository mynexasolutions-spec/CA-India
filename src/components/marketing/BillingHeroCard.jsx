import { Link } from 'react-router-dom';

function DocIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="9" y1="13" x2="15" y2="13" />
      <line x1="9" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function SupplyIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M12 11v6M9 14h6" />
    </svg>
  );
}

function NotesIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 12h.01M15 12h.01" />
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <path d="M7 6V4h10v2" />
    </svg>
  );
}

function QuoteIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

function WalletIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.3l-5.9 3.2 1.2-6.5-4.8-4.6 6.6-.9z" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="13 6 19 12 13 18" />
    </svg>
  );
}

function HandshakeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m11 17 2 2a1 1 0 1 0 3-3" />
      <path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4" />
      <path d="m21 3 1 11h-2" />
      <path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3" />
      <path d="M3 4h8" />
    </svg>
  );
}

const heroFeatures = [
  { label: 'GST Invoices', icon: <DocIcon /> },
  { label: 'Bill of Supply', icon: <SupplyIcon /> },
  { label: 'Debit & Credit Notes', icon: <NotesIcon /> },
  { label: 'Quotations', icon: <QuoteIcon /> },
  { label: 'GST Reports', icon: <ChartIcon /> },
  { label: 'Outstanding Tracking', icon: <WalletIcon /> },
];

/**
 * The navy "Turn Your Billing Into a Smarter Digital Experience" hero card — shared by
 * the homepage's billing showcase section and the /billing-management landing page, so
 * both stay pixel-identical instead of drifting apart as two copy-pasted versions.
 * `exploreTo` controls where the "Explore Billing Management" button goes: an in-page
 * anchor ("#overview") on /billing-management itself, or a route (e.g.
 * "/billing-management") when embedded elsewhere like the homepage.
 */
export default function BillingHeroCard({ exploreTo = '#overview' }) {
  const isAnchor = exploreTo.startsWith('#');
  const ExploreTag = isAnchor ? 'a' : Link;
  const exploreProps = isAnchor ? { href: exploreTo } : { to: exploreTo };

  return (
    <div className="billing-hero-card">
      <div className="billing-hero-grid">
        <div>
          <p className="billing-hero-eyebrow">Client Portal &nbsp;•&nbsp; Billing Management</p>
          <h1>
            Turn Your Billing Into a Smarter <span className="text-accent-green">Digital Experience</span>
          </h1>
          <p>
            Create GST invoices, manage parties, track payments and access powerful reports — all from one
            secure Client Portal.
          </p>

          <div className="billing-hero-highlight">
            <StarIcon />
            <span>Everything you need, in one place</span>
          </div>

          <div className="billing-hero-featurerow">
            {heroFeatures.map((f) => (
              <div key={f.label} className="billing-hero-feature">
                <span className="billing-hero-feature-icon">{f.icon}</span>
                <span>{f.label}</span>
              </div>
            ))}
          </div>

          <div className="billing-hero-pricerow">
            <div className="price-badge-green">
              <span>Starting at just</span>
              <strong>
                ₹1,499<sup>*</sup>
              </strong>
            </div>
            <ExploreTag {...exploreProps} className="btn btn-gold">
              Explore Billing Management <ArrowRightIcon />
            </ExploreTag>
            <Link to="/login" className="btn btn-outline billing-hero-loginbtn">
              <PersonIcon /> Client Login
            </Link>
          </div>

          <div className="billing-hero-note">
            <span className="billing-hero-note-icon">
              <HandshakeIcon />
            </span>
            <span>Already our GST Filing client? Get Billing + Compliance support from one trusted team.</span>
          </div>
        </div>

        {/* Single composited laptop+mobile dashboard graphic, used on both the
            homepage and the /billing-management hero. */}
        <div className="billing-hero-visual billing-hero-visual-plain">
          <img
            src="/assets/laptop-mobile-dashboard.png"
            alt="Client Portal billing dashboard preview on laptop and mobile"
            className="billing-hero-visual-img"
          />
        </div>
      </div>
    </div>
  );
}

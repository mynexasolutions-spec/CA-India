import { Link } from 'react-router-dom';
import Seo, { firmJsonLd } from '../../components/seo/Seo';
import { CONTACT, REGISTRATIONS, SERVICES } from '../../data/nav';

const practiceHighlights = [
  { value: '9', label: 'Professional service areas' },
  { value: '12', label: 'Business registration options' },
  { value: '4', label: 'Regions in our associate network' },
  { value: '24/7', label: 'Secure portal access' },
];

const serviceDescriptions = {
  '/services/accounting': 'Bookkeeping, management reporting, and outsourced accounting support.',
  '/services/audit': 'Independent assurance, internal controls, and statutory audit support.',
  '/services/income-tax': 'Return filing, tax planning, notices, and practical advisory.',
  '/services/gst': 'Registration, returns, reconciliation, refunds, and GST advisory.',
  '/services/roc-compliance': 'Company filings, annual compliance, and governance support.',
  '/services/financial-advisory': 'Financial analysis, planning, and decision-ready business insights.',
};

const serviceCodes = {
  '/services/accounting': 'AC',
  '/services/audit': 'AU',
  '/services/income-tax': 'IT',
  '/services/gst': 'GST',
  '/services/roc-compliance': 'ROC',
  '/services/financial-advisory': 'FA',
};

const featuredServices = [SERVICES[0], SERVICES[1], SERVICES[2], SERVICES[3], SERVICES[4], SERVICES[6]];

const process = [
  {
    number: '01',
    title: 'Understand',
    text: 'We review your structure, priorities, and current compliance position.',
  },
  {
    number: '02',
    title: 'Plan',
    text: 'You receive a clear scope, document checklist, and practical next steps.',
  },
  {
    number: '03',
    title: 'Deliver',
    text: 'Our team completes the work and keeps you informed through every stage.',
  },
];

const assurancePoints = [
  'Integrity and transparent communication',
  'Accurate, detail-focused execution',
  'Timely compliance and proactive follow-up',
  'Secure online access for clients and staff',
];

export default function HomePage() {
  return (
    <>
      <Seo path="/" jsonLd={firmJsonLd} />

      <section className="home-page__hero">
        <div className="container home-page__hero-grid">
          <div className="home-page__hero-copy">
            <p className="eyebrow">Chartered Accountants &amp; Business Advisors</p>
            <h1>Financial clarity for confident business decisions.</h1>
            <p className="home-page__lead">
              Accounting, audit, taxation, GST, registrations, and compliance support delivered with accuracy,
              responsiveness, and a clear understanding of your business.
            </p>
            <div className="home-page__hero-actions">
              <Link to="/contact" className="btn btn-gold">Book a Consultation</Link>
              <Link to="/services" className="btn btn-outline">Explore Services</Link>
            </div>
            <div className="home-page__trust-row" aria-label="Service advantages">
              <span>Professional guidance</span>
              <span>Timely compliance</span>
              <span>Secure client access</span>
            </div>
            <div className="home-page__hero-badge" aria-hidden="true">
              <span>Navi Mumbai</span>
              <span>&middot;</span>
              <span>Pan-India clients</span>
              <span>&middot;</span>
              <span>All major GST states</span>
            </div>
          </div>

          <div className="home-page__hero-visual" aria-label="Overview of the firm's digital services">
            <div className="home-page__visual-orbit home-page__visual-orbit--one" />
            <div className="home-page__visual-orbit home-page__visual-orbit--two" />
            <div className="home-page__dashboard-card">
              <div className="home-page__dashboard-head">
                <div>
                  <span>Business overview</span>
                  <strong>Compliance at a glance</strong>
                </div>
                <span className="home-page__status">Up to date</span>
              </div>
              <div className="home-page__chart" aria-hidden="true">
                <span style={{ height: '42%' }} />
                <span style={{ height: '64%' }} />
                <span style={{ height: '50%' }} />
                <span style={{ height: '82%' }} />
                <span style={{ height: '70%' }} />
                <span style={{ height: '94%' }} />
              </div>
              <div className="home-page__dashboard-metrics">
                <div><span>Tax &amp; GST</span><strong>Organised</strong></div>
                <div><span>Documents</span><strong>Accessible</strong></div>
              </div>
            </div>
            <div className="home-page__floating-card home-page__floating-card--top">
              <span className="home-page__floating-icon">01</span>
              <div><strong>One secure login</strong><span>Automatic role-based access</span></div>
            </div>
            <div className="home-page__floating-card home-page__floating-card--bottom">
              <span className="home-page__floating-icon">24</span>
              <div><strong>Always available</strong><span>Invoices, reports, and records</span></div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-page__metrics" aria-label="Firm capabilities">
        <div className="container home-page__metric-grid">
          {practiceHighlights.map((item) => (
            <div key={item.label} className="home-page__metric">
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="section home-page__services" id="services">
        <div className="container">
          <div className="home-page__section-heading">
            <div>
              <p className="eyebrow">What We Do</p>
              <h2>Professional services built around your business.</h2>
            </div>
            <p>
              From day-to-day accounting to complex compliance, our team brings structure, clarity, and dependable
              execution to every engagement.
            </p>
          </div>
          <div className="home-page__service-grid">
            {featuredServices.map((service) => (
              <Link key={service.path} to={service.path} className="home-page__service-card">
                <span className="home-page__service-icon" aria-hidden="true">{serviceCodes[service.path]}</span>
                <h3>{service.label}</h3>
                <p>{serviceDescriptions[service.path]}</p>
                <span className="home-page__card-link">Learn more <span aria-hidden="true">&rarr;</span></span>
              </Link>
            ))}
          </div>
          <div className="home-page__center-action">
            <Link to="/services" className="btn btn-outline-navy">View All Services</Link>
          </div>
        </div>
      </section>

      <section className="section home-page__about">
        <div className="container home-page__about-grid">
          <div className="home-page__about-visual" aria-hidden="true">
            <div className="home-page__monogram">ABK</div>
            <div className="home-page__about-label">
              <strong>Structured advice.</strong>
              <span>Practical outcomes.</span>
            </div>
          </div>
          <div className="home-page__about-copy">
            <p className="eyebrow">About Our Firm</p>
            <h2>Professional advice, delivered with clarity and care.</h2>
            <p>
              A B Khan &amp; Associates supports businesses, startups, professionals, and individuals with financial and
              compliance solutions tailored to their goals. We combine technical rigour with communication that stays
              straightforward and useful.
            </p>
            <div className="home-page__assurance-grid">
              {assurancePoints.map((point) => (
                <div key={point}><span aria-hidden="true">✓</span>{point}</div>
              ))}
            </div>
            <Link to="/about" className="btn btn-navy">Discover Our Firm</Link>
          </div>
        </div>
      </section>

      <section className="section home-page__process-section">
        <div className="container">
          <div className="section-head center home-page__center-heading">
            <p className="eyebrow">How We Work</p>
            <h2>A clear process from first conversation to final delivery.</h2>
            <p>Every engagement is structured to reduce uncertainty and keep the next step visible.</p>
          </div>
          <div className="home-page__process-grid">
            {process.map((step) => (
              <article key={step.number} className="home-page__step-card">
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section home-page__portal-section">
        <div className="container home-page__portal-grid">
          <div>
            <p className="eyebrow">Secure Online Portal</p>
            <h2>One login. The right dashboard, automatically.</h2>
            <p>
              Use your registered credentials to sign in. Admin and staff accounts are directed to the admin dashboard,
              while client accounts open the client portal—no separate login pages to choose from.
            </p>
            <ul className="home-page__portal-list">
              <li>Access billing, invoices, reports, and business records</li>
              <li>Role-based access keeps each account in the correct workspace</li>
              <li>Responsive experience across desktop, tablet, and mobile</li>
            </ul>
            <Link to="/login" className="btn btn-gold home-page__login-btn">Login to Your Account</Link>
          </div>
          <div className="home-page__registration-card">
            <p className="eyebrow">Start a Business</p>
            <h3>Choose the right structure with confidence.</h3>
            <p>Get support for incorporation, registrations, and the compliance steps that follow.</p>
            <div className="home-page__chip-row">
              {REGISTRATIONS.slice(0, 6).map((item) => (
                <Link key={item.path} to={item.path}>{item.label}</Link>
              ))}
            </div>
            <Link to="/business-registration" className="home-page__text-link">
              Explore registration services <span aria-hidden="true">&rarr;</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="section home-page__contact-section">
        <div className="container">
          <div className="home-page__contact-card">
            <div>
              <p className="eyebrow">Let&apos;s Talk</p>
              <h2>Ready to bring more clarity to your finances?</h2>
              <p>Tell us what you need and our team will help you identify the right next step.</p>
            </div>
            <div className="home-page__contact-actions">
              <Link to="/contact" className="btn btn-gold">Book a Consultation</Link>
              <a href={CONTACT.phoneHref} className="btn btn-outline">Call {CONTACT.phone}</a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

import Seo from '../../components/seo/Seo';

function LegalPage({ title, path, children }) {
  return (
    <>
      <Seo title={`${title} | A B KHAN & ASSOCIATES`} path={path} description={`${title} for A B KHAN & ASSOCIATES.`} />
      <section className="page-hero">
        <div className="container">
          <h1>{title}</h1>
        </div>
      </section>
      <section className="section">
        <div className="container" style={{ maxWidth: 800, lineHeight: 1.7 }}>
          {children}
        </div>
      </section>
    </>
  );
}

export function PrivacyPolicy() {
  return (
    <LegalPage title="Privacy Policy" path="/privacy-policy">
      <p>Last updated: 14 July 2026</p>
      <p>
        A B KHAN & ASSOCIATES (“we”, “us”) respects your privacy. This policy explains how we collect and use
        information submitted through our website, contact forms, Client Portal, and related services.
      </p>
      <h2>Information we collect</h2>
      <ul>
        <li>Contact details you provide (name, phone, email, message)</li>
        <li>Business details for Client Portal accounts (GSTIN, PAN, address, documents)</li>
        <li>Technical logs needed for security and troubleshooting</li>
      </ul>
      <h2>How we use information</h2>
      <ul>
        <li>To respond to enquiries and provide professional services</li>
        <li>To operate Client Portal, Billing, and compliance features</li>
        <li>To send service updates or newsletters when you opt in</li>
      </ul>
      <h2>Sharing</h2>
      <p>
        We do not sell personal data. We may share information with trusted processors (hosting, email) solely to
        deliver our services, or when required by law.
      </p>
      <h2>Contact</h2>
      <p>
        For privacy requests: <a href="mailto:abkhanassociates@gmail.com">abkhanassociates@gmail.com</a>
      </p>
    </LegalPage>
  );
}

export function TermsAndConditions() {
  return (
    <LegalPage title="Terms & Conditions" path="/terms-and-conditions">
      <p>Last updated: 14 July 2026</p>
      <p>
        By using https://abkhanassociates.com you agree to these terms. Website content is for general
        information and does not constitute formal professional advice unless confirmed in an engagement letter.
      </p>
      <h2>Services</h2>
      <p>
        Chartered Accountancy and related services are provided subject to separate engagement terms, ICAI
        requirements, and applicable Indian law.
      </p>
      <h2>Portal & Billing</h2>
      <p>
        Client Portal credentials are confidential. You are responsible for accuracy of data entered in billing and
        for safeguarding your account.
      </p>
      <h2>Limitation</h2>
      <p>
        To the extent permitted by law, we are not liable for indirect or consequential losses arising from use of
        this website.
      </p>
    </LegalPage>
  );
}

export function CookiePolicy() {
  return (
    <LegalPage title="Cookie Policy" path="/cookie-policy">
      <p>Last updated: 14 July 2026</p>
      <p>
        We use essential cookies required for site security and preference storage (for example, cookie consent). We
        may use analytics cookies only after consent where applicable.
      </p>
      <h2>Managing cookies</h2>
      <p>
        You can clear or block cookies in your browser settings. Refusing essential cookies may affect login and form
        features.
      </p>
    </LegalPage>
  );
}

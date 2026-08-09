import { Link } from 'react-router-dom';
import { CONTACT } from '../data/nav';

export default function Footer() {
  return (
    <footer>
      <div className="container">
        <div className="footer-grid">
          <div>
            <div className="footer-brand">
              <div className="footer-logo footer-logo-visible">
                <img src="/assets/ca-india-logo.png" alt="CA India logo" />
              </div>
              <div className="footer-brand-text">
                <span className="footer-brand-name">A B KHAN & ASSOCIATES</span>
                <span className="footer-brand-tagline">Chartered Accountants</span>
              </div>
            </div>
            <p>
              A B KHAN & ASSOCIATES is a trusted Chartered Accountancy firm providing expert services in
              Accounting, Taxation, Audit, GST, Income Tax, Business Registration, ROC Compliance, Payroll, and
              Financial Advisory. We are committed to delivering accurate, timely, and value-driven solutions
              tailored to the needs of businesses and individuals.
            </p>
          </div>
          <div>
            <h4>Quick Links</h4>
            <ul>
              <li>
                <Link to="/about">About Us</Link>
              </li>
              <li>
                <Link to="/services">Our Services</Link>
              </li>
              <li>
                <Link to="/business-registration">Business Registration</Link>
              </li>
              <li>
                <Link to="/billing-management">Billing Management</Link>
              </li>
              <li>
                <Link to="/knowledge-centre">Knowledge Centre</Link>
              </li>
              <li>
                <Link to="/contact">Contact Us</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Services</h4>
            <ul>
              <li>
                <Link to="/services/accounting">Accounting Services</Link>
              </li>
              <li>
                <Link to="/services/audit">Audit Services</Link>
              </li>
              <li>
                <Link to="/services/income-tax">Income Tax Services</Link>
              </li>
              <li>
                <Link to="/services/gst">GST Services</Link>
              </li>
              <li>
                <Link to="/services/roc-compliance">ROC Compliance</Link>
              </li>
              <li>
                <Link to="/services/virtual-cfo">Virtual CFO Services</Link>
              </li>
            </ul>
          </div>
          <div>
            <h4>Contact</h4>
            <ul>
              <li>{CONTACT.address}</li>
              <li>
                <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
              </li>
              <li>
                <a href={CONTACT.emailHref}>{CONTACT.email}</a>
              </li>
              <li>Mon – Sat: 10:00 AM – 07:00 PM</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2026 A B KHAN & ASSOCIATES. All rights reserved.</span>
          <ul>
            <li>
              <Link to="/privacy-policy">Privacy Policy</Link>
            </li>
            <li>
              <Link to="/terms-and-conditions">Terms & Conditions</Link>
            </li>
            <li>
              <Link to="/cookie-policy">Cookie Policy</Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

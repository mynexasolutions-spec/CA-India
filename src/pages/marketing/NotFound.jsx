import { Link } from 'react-router-dom';
import Seo from '../../components/seo/Seo';

export default function NotFound() {
  return (
    <>
      <Seo title="Page Not Found | A B KHAN & ASSOCIATES" path="/404" />
      <section className="page-hero">
        <div className="container" style={{ textAlign: 'center' }}>
          <p className="eyebrow" style={{ color: 'var(--gold-light)' }}>
            404
          </p>
          <h1>Page not found</h1>
          <p>The page you are looking for does not exist or has moved.</p>
          <div className="hero-actions" style={{ justifyContent: 'center' }}>
            <Link to="/" className="btn btn-gold">
              Go Home
            </Link>
            <Link to="/contact" className="btn btn-outline">
              Contact Us
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

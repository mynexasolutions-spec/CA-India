import { CONTACT } from '../data/nav';

export default function TopBar() {
  return (
    <div className="topbar">
      <div className="container">
        <div className="topbar-left">
          <span>📍 {CONTACT.address}</span>
        </div>
        <div className="topbar-right">
          <a className="contact-item" href={CONTACT.phoneHref}>
            📞 {CONTACT.phone}
          </a>
          <a className="contact-item" href={CONTACT.emailHref}>
            ✉️ {CONTACT.email}
          </a>
          <span>🕐 {CONTACT.hours}</span>
          <div className="topbar-social">
            <a href="#" aria-label="Facebook">
              f
            </a>
            <a href="#" aria-label="Instagram">
              ig
            </a>
            <a href="#" aria-label="LinkedIn">
              in
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

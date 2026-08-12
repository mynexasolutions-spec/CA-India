import { CONTACT } from '../data/nav';

export default function TopBar() {
  return (
    <div className="topbar">
      <div className="container">
        <div className="topbar-left">
          <span><strong>Office:</strong> {CONTACT.address}</span>
        </div>
        <div className="topbar-right">
          <a className="contact-item topbar-phone" href={CONTACT.phoneHref}>
            <strong>Call:</strong> {CONTACT.phone}
          </a>
          <a className="contact-item topbar-email" href={CONTACT.emailHref}>
            <strong>Email:</strong> {CONTACT.email}
          </a>
          <span className="topbar-hours">{CONTACT.hours}</span>
          <div className="topbar-social">
            <a href="#" aria-label="Facebook">f</a>
            <a href="#" aria-label="Instagram">ig</a>
            <a href="#" aria-label="LinkedIn">in</a>
          </div>
        </div>
      </div>
    </div>
  );
}

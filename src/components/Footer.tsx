import { NAV_LINKS } from '../config/content';
import { AstrionMark } from './Icons';
import './Footer.css';

export function Footer() {
  return (
    <footer className="footer">
      <div className="footer__brand">
        <AstrionMark className="footer__mark" />
        <div>
          <div className="footer__word">Astrion</div>
          <div className="footer__tag">Beyond the Dying Earth — a 2D action-adventure across the stars</div>
        </div>
      </div>
      <nav className="footer__links" aria-label="Footer">
        {NAV_LINKS.map((l) => (
          <a key={l.id} href={`#${l.id}`}>
            {l.label}
          </a>
        ))}
        <a href="#join">Waitlist</a>
      </nav>
      <p className="footer__fine">
        © {new Date().getFullYear()} Astrion. In development — features, resources and NFT mechanics are subject to change.
      </p>
    </footer>
  );
}

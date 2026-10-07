import { useEffect, useState } from 'react';
import { NAV_LINKS } from '../config/content';
import { openWaitlist } from '../lib/waitlistDialog';
import { AstrionMark } from './Icons';
import './Navigation.css';

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <header className={`nav ${scrolled ? 'is-scrolled' : ''} ${open ? 'is-open' : ''}`}>
      <a className="nav__brand" href="#top" aria-label="Astrion — back to top">
        <AstrionMark className="nav__mark" />
        <span className="nav__word">Astrion</span>
      </a>

      <nav className="nav__links" id="nav-menu" aria-label="Primary">
        {NAV_LINKS.map((l) => (
          <a key={l.id} href={`#${l.id}`} onClick={() => setOpen(false)}>
            {l.label}
          </a>
        ))}
        <button
          type="button"
          className="nav__cta"
          onClick={() => {
            setOpen(false);
            openWaitlist('nav');
          }}
        >
          Join waitlist
        </button>
      </nav>

      <button
        type="button"
        className="nav__toggle"
        aria-expanded={open}
        aria-controls="nav-menu"
        aria-label={open ? 'Close menu' : 'Open menu'}
        onClick={() => setOpen((v) => !v)}
      >
        <span />
        <span />
      </button>
    </header>
  );
}

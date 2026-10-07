import { useEffect, useRef } from 'react';
import { CHAPTERS } from '../chapters';
import { journey, onJourneyFrame } from '../journeyStore';
import { scrollToJourneyTime } from '../scrollTo';

/** Fixed vertical chapter rail: makes the long single shot navigable. */
export function ChapterIndicator() {
  const root = useRef<HTMLElement>(null);
  const items = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(
    () =>
      onJourneyFrame((t) => {
        const el = root.current;
        if (!el) return;
        const on = journey.visible && t > 0.07 && t < 0.999;
        el.dataset.on = on ? '1' : '0';
        let active = 0;
        CHAPTERS.forEach((c, i) => {
          if (t >= c.at - 0.04) active = i;
        });
        items.current.forEach((b, i) => {
          if (!b) return;
          const state = i === active ? 'active' : i < active ? 'past' : 'next';
          if (b.dataset.state !== state) b.dataset.state = state;
        });
        el.style.setProperty('--rail', t.toFixed(4));
      }),
    [],
  );

  return (
    <nav ref={root} className="chapters" aria-label="Chapters" data-on="0">
      <span className="chapters__rail" aria-hidden>
        <i />
      </span>
      <ol>
        {CHAPTERS.map((c, i) => (
          <li key={c.id}>
            <button
              type="button"
              ref={(el) => {
                items.current[i] = el;
              }}
              data-state="next"
              onClick={() => scrollToJourneyTime(c.at)}
            >
              <span className="chapters__index">{c.index}</span>
              <span className="chapters__label">{c.label}</span>
            </button>
          </li>
        ))}
      </ol>
    </nav>
  );
}

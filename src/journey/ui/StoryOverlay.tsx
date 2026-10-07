import { useEffect, useRef } from 'react';
import { prefersReducedMotion } from '../../hooks/useReducedMotion';
import { charsIn, splitChars } from '../../lib/textFx';
import { ConversionDiagram } from '../../components/ConversionDiagram';
import { WaitlistButton } from '../../components/WaitlistButton';
import { BEAT_FADE, BEATS, PORTAL_CUT, type Beat } from '../chapters';
import * as THREE from 'three';
import { envelope, journey, onJourneyFrame } from '../journeyStore';

/**
 * Story text laid over the world — no cards, no containers. Each beat breathes in
 * and out with the camera (opacity, blur, drift, scale) and its title rises in
 * letter by letter the moment it takes the stage.
 */
export function StoryOverlay() {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const flash = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const splits = refs.current.map((el) => {
      const title = el?.querySelector<HTMLElement>('.beat__title');
      return title && !reduced ? splitChars(title).chars : null;
    });
    const shown = BEATS.map(() => false);

    return onJourneyFrame((t) => {
      BEATS.forEach((b, i) => {
        const el = refs.current[i];
        if (!el) return;
        const v = envelope(t, b.in, b.out, BEAT_FADE);
        const entering = t < (b.in + b.out) / 2;
        if (v <= 0.001) {
          if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
          shown[i] = false;
          return;
        }
        el.style.visibility = 'visible';
        el.style.opacity = v.toFixed(3);
        const drift = (1 - v) * (entering ? 24 : -24);
        const scale = 1 + (1 - v) * (entering ? -0.04 : 0.05);
        el.style.transform = `translate3d(0, ${drift.toFixed(1)}px, 0) scale(${scale.toFixed(4)})`;
        el.style.filter = v < 0.97 ? `blur(${((1 - v) * 4).toFixed(1)}px)` : 'none';
        if (!shown[i] && v > 0.05) {
          shown[i] = true;
          const chars = splits[i];
          if (chars) charsIn(chars, 0.05);
        }
      });
      // the portal swallows the camera: a flash hides the cut back to Earth
      // the portal's light at both ends of the journey: the hero's push hands over inside
      // a full-screen flash that clears onto the dying Earth; the return dives back in
      const intro = 1 - THREE.MathUtils.smoothstep(t, journey.introEnd * 0.93, journey.introEnd + 0.03);
      const outro = envelope(t, PORTAL_CUT - 0.004, PORTAL_CUT + 0.002, 0.012);
      if (flash.current) flash.current.style.opacity = Math.max(intro, outro).toFixed(3);
    });
  }, []);

  return (
    <div className="story-overlay">
      {BEATS.map((b, i) => (
        <section
          key={b.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className={`beat beat--${b.align} beat--${b.kind}`}
          style={{ visibility: 'hidden' }}
          aria-label={b.title}
        >
          <BeatContent beat={b} />
        </section>
      ))}
      <div ref={flash} className="journey__flash" aria-hidden />
    </div>
  );
}

function BeatContent({ beat: b }: { beat: Beat }) {
  if (b.kind === 'cta') {
    return (
      <>
        <p className="beat__line beat__line--dying">The Earth is dying.</p>
        <p className="beat__line beat__line--hope">But hope is out there.</p>
        <h2 className="display beat__title beat__title--cta">
          <span className="beat__title-line">Beyond</span>
          <span className="beat__title-line">
            <span className="beat__the">The</span> <span className="gradient-text">Dying Earth</span>
          </span>
        </h2>
        <WaitlistButton source="journey-end" />
      </>
    );
  }
  return (
    <>
      <span className="kicker beat__kicker">{b.kicker}</span>
      <h2 className={`display beat__title ${b.kind === 'title' ? 'beat__title--big' : ''}`}>{b.title}</h2>
      {b.body && <p className="beat__body">{b.body}</p>}
      {b.bullets && (
        <ul className="beat__bullets">
          {b.bullets.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
      {b.kind === 'economy' && (
        <div className="beat__diagram hud-frame">
          <ConversionDiagram compact />
        </div>
      )}
    </>
  );
}

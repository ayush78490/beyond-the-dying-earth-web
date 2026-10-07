import { useEffect, useRef } from 'react';
import { HUD_READOUT } from '../config/content';
import { HUD_ANCHORS, parallaxWeight } from '../config/heroLayout';
import { parallax } from '../hooks/useParallax';
import { portalPhase } from '../lib/portalCycle';
import { MAX_SHIFT } from './scene/sceneEnv';
import './HeroHud.css';

interface Props {
  active: boolean;
  /** css px per source-image px */
  scale: number;
  motion: number;
}

/**
 * Game-interface overlay: a scanner locked on the portal, a hostile marker over the
 * RARI, an energy readout and a mission clock. Anchored to positions inside the
 * painting and moved with the same parallax as the pixels beneath them.
 */
export function HeroHud({ active, scale, motion }: Props) {
  const portalRef = useRef<HTMLDivElement>(null);
  const rariRef = useRef<HTMLDivElement>(null);
  const clockRef = useRef<HTMLSpanElement>(null);
  const olivaRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const start = performance.now();
    let lastSecond = -1;
    const place = (el: HTMLElement | null, depth: number) => {
      if (!el) return;
      const w = parallaxWeight(depth) * scale * motion;
      el.style.transform = `translate3d(${(-parallax.x * MAX_SHIFT.x * w).toFixed(2)}px, ${(-parallax.y * MAX_SHIFT.y * w).toFixed(2)}px, 0)`;
    };
    const tick = (now: number) => {
      place(portalRef.current, 0.3);
      place(rariRef.current, 0.48);
      const t = (now - start) / 1000;
      if (portalRef.current) portalRef.current.dataset.surge = portalPhase(t).charge > 0.4 ? '1' : '0';
      const s = Math.floor(t);
      if (s !== lastSecond) {
        lastSecond = s;
        if (clockRef.current) {
          const hh = String(Math.floor(s / 3600)).padStart(2, '0');
          const mm = String(Math.floor(s / 60) % 60).padStart(2, '0');
          const ss = String(s % 60).padStart(2, '0');
          clockRef.current.textContent = `T+${hh}:${mm}:${ss}`;
        }
        if (olivaRef.current && motion) olivaRef.current.textContent = String(40 + ((s * 7) % 5)).padStart(3, '0');
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, scale, motion]);

  return (
    <div className="hud" aria-hidden>
      {/* scanner locked on the portal */}
      <div
        className="hud__anchor"
        style={{ ['--ax' as string]: HUD_ANCHORS.portal.x, ['--ay' as string]: HUD_ANCHORS.portal.y }}
      >
        <div ref={portalRef} className="hud-portal">
          <div className="hud-portal__reticle">
            <span className="hud-portal__ring" />
            <span className="hud-portal__ticks" />
          </div>
          <div className="hud-portal__label">
            <span className="hud-portal__line" />
            <span className="hud-tag">
              <b>Signal source // RARI citadel</b>
              <small>47°12′N 122°04′E · core unstable</small>
            </span>
          </div>
        </div>
      </div>

      {/* hostile marker */}
      <div
        className="hud__anchor hud__anchor--secondary"
        style={{ ['--ax' as string]: HUD_ANCHORS.rari.x, ['--ay' as string]: HUD_ANCHORS.rari.y }}
      >
        <div ref={rariRef} className="hud-rari">
          <span className="hud-rari__box" />
          <span className="hud-tag hud-tag--red">
            <b>RARI × 07</b>
            <small>Hostile patrol</small>
          </span>
        </div>
      </div>

      {/* energy readout */}
      <div className="hud-readout hud-frame">
        <div className="hud-readout__head">
          <span className="hud-blink" /> Cosmic energy detected
        </div>
        <ul>
          {HUD_READOUT.map((r) => (
            <li key={r.name}>
              <span className="hud-readout__name">{r.name}</span>
              <span className="hud-readout__bar">
                <i style={{ transform: `scaleX(${r.level})` }} />
              </span>
              <span className="hud-readout__val" ref={r.name === 'OLIVA' ? olivaRef : undefined}>
                {r.value}
              </span>
            </li>
          ))}
        </ul>
        <div className="hud-readout__scan" />
      </div>

      {/* mission clock */}
      <div className="hud-coords">
        <span>SECTOR 07 · KEPLER RIFT</span>
        <span ref={clockRef}>T+00:00:00</span>
      </div>
    </div>
  );
}

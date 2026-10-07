import { useEffect, useRef, useState } from 'react';
import { AstrionMark } from './Icons';
import './Loader.css';

interface Props {
  /** 0..1 real loading progress */
  progress: number;
  ready: boolean;
  onDone: () => void;
}

/**
 * "Initializing cosmic link…" → "Planetary signal detected" → reveal.
 * Never artificially long: when assets arrive from cache the sequence collapses
 * to a short beat.
 */
export function Loader({ progress, ready, onDone }: Props) {
  const [phase, setPhase] = useState<'linking' | 'signal' | 'exit'>('linking');
  const started = useRef(performance.now());
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!ready) return;
    const fast = performance.now() - started.current < 450;
    setPhase('signal');
    const toExit = window.setTimeout(() => setPhase('exit'), fast ? 260 : 700);
    const toDone = window.setTimeout(() => done.current(), fast ? 900 : 1500);
    return () => {
      window.clearTimeout(toExit);
      window.clearTimeout(toDone);
    };
  }, [ready]);

  const pct = Math.round((ready ? 1 : progress) * 100);

  return (
    <div className={`loader loader--${phase}`} role="status" aria-live="polite" aria-label="Loading">
      <div className="loader__core">
        <AstrionMark className="loader__mark" />
        <div className="loader__word">Astrion</div>
        <div className="loader__bar" aria-hidden>
          <span style={{ transform: `scaleX(${Math.max(0.04, pct / 100)})` }} />
        </div>
        <div className="loader__status">
          {phase === 'linking' ? (
            <>
              <span>Initializing cosmic link…</span>
              <span className="loader__pct">{String(pct).padStart(3, '0')}%</span>
            </>
          ) : (
            <span className="loader__signal">Planetary signal detected</span>
          )}
        </div>
      </div>
      <div className="loader__scan" aria-hidden />
    </div>
  );
}

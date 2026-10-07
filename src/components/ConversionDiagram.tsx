import { useEffect, useMemo, useRef, useState } from 'react';
import { ECONOMY_CHAINS, REFINED, RESOURCES, type Resource, type ResourceId } from '../config/content';
import { useInView } from '../hooks/useInView';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { ResourceGlyph } from './Icons';
import './ConversionDiagram.css';

const ALL: Record<ResourceId, Resource> = Object.fromEntries(
  [...RESOURCES, ...REFINED].map((r) => [r.id, r]),
) as Record<ResourceId, Resource>;

type Layout = { w: number; h: number; pos: Record<ResourceId, [number, number]> };

/** Horizontal flow on wide screens, vertical lanes on phones (matches the ↓ notation). */
const LAYOUTS: Record<'wide' | 'tall', Layout> = {
  wide: {
    w: 1200,
    h: 470,
    pos: {
      rego: [130, 110],
      kama: [400, 110],
      oliva: [130, 340],
      joro: [370, 340],
      schreiber: [610, 340],
      triolite: [850, 340],
      nft: [1080, 340],
    },
  },
  tall: {
    w: 400,
    h: 1080,
    pos: {
      rego: [100, 90],
      kama: [100, 330],
      oliva: [300, 90],
      joro: [300, 330],
      schreiber: [300, 570],
      triolite: [300, 790],
      nft: [300, 1000],
    },
  },
};

const NODE_R = 50;
const PER_EDGE = 3;

function useNarrow() {
  const query = '(max-width: 760px)';
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const on = () => setNarrow(mql.matches);
    mql.addEventListener('change', on);
    return () => mql.removeEventListener('change', on);
  }, []);
  return narrow;
}

function edgePath(a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  const x1 = a[0] + ux * NODE_R;
  const y1 = a[1] + uy * NODE_R;
  const x2 = b[0] - ux * NODE_R;
  const y2 = b[1] - uy * NODE_R;
  // a slight arc reads as "energy flow" rather than a plain arrow
  const bend = 14;
  const mx = (x1 + x2) / 2 - uy * bend;
  const my = (y1 + y2) / 2 + ux * bend;
  return `M${x1.toFixed(1)} ${y1.toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/** The conversion diagram + travelling energy particles (positions set imperatively). */
export function ConversionDiagram({ compact = false }: { compact?: boolean }) {
  // the HUD version keeps the horizontal flow at a smaller scale
  const narrow = useNarrow() && !compact;
  const layout = narrow ? LAYOUTS.tall : LAYOUTS.wide;
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const dotRefs = useRef<(SVGCircleElement | null)[]>([]);
  const inView = useInView(wrapRef, '0px');
  const reduced = useReducedMotion();

  const edges = useMemo(
    () =>
      ECONOMY_CHAINS.flatMap((chain) =>
        chain.slice(1).map((to, i) => {
          const from = chain[i];
          return { from, to, d: edgePath(layout.pos[from], layout.pos[to]) };
        }),
      ),
    [layout],
  );

  useEffect(() => {
    if (!inView) return;
    let raf = 0;
    const start = performance.now();
    const lengths = pathRefs.current.map((p) => p?.getTotalLength() ?? 0);
    const tick = (now: number) => {
      const t = reduced ? 0.6 : (now - start) / 1000;
      edges.forEach((_, ei) => {
        const path = pathRefs.current[ei];
        if (!path) return;
        for (let k = 0; k < PER_EDGE; k++) {
          const dot = dotRefs.current[ei * PER_EDGE + k];
          if (!dot) continue;
          const u = (t * 0.32 + k / PER_EDGE + ei * 0.13) % 1;
          const pt = path.getPointAtLength(u * lengths[ei]);
          dot.setAttribute('cx', pt.x.toFixed(1));
          dot.setAttribute('cy', pt.y.toFixed(1));
          dot.setAttribute('opacity', (Math.sin(u * Math.PI) * 0.95).toFixed(2));
        }
      });
      if (!reduced) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, edges, reduced]);

  return (
    <div
      ref={wrapRef}
      className={`diagram ${narrow ? 'diagram--tall' : ''} ${compact ? 'diagram--hud' : ''}`}
      style={{ aspectRatio: `${layout.w} / ${layout.h}` }}
    >
      <svg className="diagram__svg" viewBox={`0 0 ${layout.w} ${layout.h}`} aria-hidden>
        <defs>
          {edges.map((e, i) => (
            <linearGradient
              key={i}
              id={`edge-${i}`}
              gradientUnits="userSpaceOnUse"
              x1={layout.pos[e.from][0]}
              y1={layout.pos[e.from][1]}
              x2={layout.pos[e.to][0]}
              y2={layout.pos[e.to][1]}
            >
              <stop offset="0" stopColor={ALL[e.from].color} />
              <stop offset="1" stopColor={ALL[e.to].color} />
            </linearGradient>
          ))}
          <marker id="edge-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M1 1 L8 5 L1 9" fill="none" stroke="rgba(230,220,255,0.8)" strokeWidth="1.4" />
          </marker>
          <filter id="dot-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
        </defs>
        {edges.map((e, i) => (
          <g key={`${e.from}-${e.to}`}>
            <path className="diagram__edge-glow" d={e.d} stroke={`url(#edge-${i})`} />
            <path
              className="diagram__edge"
              d={e.d}
              markerEnd="url(#edge-arrow)"
              stroke={`url(#edge-${i})`}
              ref={(el) => {
                pathRefs.current[i] = el;
              }}
            />
          </g>
        ))}
        {edges.map((e, i) =>
          Array.from({ length: PER_EDGE }, (_, k) => (
            <g key={`${i}-${k}`}>
              <circle
                r="4.5"
                fill={ALL[e.from].color}
                filter="url(#dot-glow)"
                ref={(el) => {
                  dotRefs.current[i * PER_EDGE + k] = el;
                }}
              />
            </g>
          )),
        )}
      </svg>

      {(Object.keys(layout.pos) as ResourceId[]).map((id) => {
        const r = ALL[id];
        const [x, y] = layout.pos[id];
        return (
          <div
            key={id}
            className={`node node--${id}`}
            style={{
              left: `${(x / layout.w) * 100}%`,
              top: `${(y / layout.h) * 100}%`,
              ['--c' as string]: r.color,
              ['--g' as string]: r.glow,
            }}
          >
            <div className="node__hex">
              <ResourceGlyph id={id} className="node__glyph" />
            </div>
            <div className="node__label">
              <b>{r.name}</b>
              <span>{r.role}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

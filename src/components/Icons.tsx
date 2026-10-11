import type { ReactElement, SVGProps } from 'react';
import type { ResourceId } from '../config/content';

type P = SVGProps<SVGSVGElement>;

const base = (props: P) => ({
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.4,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  focusable: false,
  ...props,
});

/** Astrion compass-star emblem. */
export const AstrionMark = (p: P) => (
  <svg viewBox="0 0 48 48" {...base(p)}>
    <path d="M24 2 L27.2 20.8 L46 24 L27.2 27.2 L24 46 L20.8 27.2 L2 24 L20.8 20.8 Z" fill="currentColor" stroke="none" opacity="0.95" />
    <circle cx="24" cy="24" r="9.5" strokeWidth="1.2" opacity="0.7" />
    <path d="M24 9 L25.4 22.6 L39 24 L25.4 25.4 L24 39 L22.6 25.4 L9 24 L22.6 22.6 Z" fill="#05060f" stroke="none" opacity="0.55" />
  </svg>
);

/** Ringed planet glyph — replaces the "O" in BEYOND, like the key art. */
export const RingedPlanet = (p: P) => (
  <svg viewBox="0 0 100 100" aria-hidden focusable={false} {...p}>
    <defs>
      <radialGradient id="rp-body" cx="36%" cy="30%" r="80%">
        <stop offset="0" stopColor="#ffffff" />
        <stop offset="0.3" stopColor="#e2dcff" />
        <stop offset="0.7" stopColor="#5d4bb0" />
        <stop offset="1" stopColor="#140c33" />
      </radialGradient>
    </defs>
    <g transform="rotate(-17 50 50)" fill="none" stroke="#f4f0ff" strokeLinecap="round">
      <path d="M3 50 A47 12 0 0 1 97 50" strokeWidth="3" opacity="0.75" />
    </g>
    <circle cx="50" cy="50" r="33" fill="url(#rp-body)" />
    <g transform="rotate(-17 50 50)" fill="none" stroke="#ffffff" strokeLinecap="round">
      <path d="M3 50 A47 12 0 0 0 97 50" strokeWidth="3.6" />
    </g>
  </svg>
);

export const ArrowRight = (p: P) => (
  <svg viewBox="0 0 24 24" {...base({ strokeWidth: 2, ...p })}>
    <path d="M4 12 H19" />
    <path d="M13 6 L19 12 L13 18" />
  </svg>
);

/** One crystal silhouette per resource so they read apart at a glance. */
export function ResourceGlyph({ id, ...p }: P & { id: ResourceId }) {
  const shapes: Record<ResourceId, ReactElement> = {
    rego: (
      <>
        <path d="M32 4 L46 22 L32 60 L18 22 Z" fill="currentColor" fillOpacity="0.22" />
        <path d="M18 22 H46 M32 4 L27 22 L32 60 L37 22 Z" />
      </>
    ),
    oliva: (
      <>
        <path d="M32 6 C 46 18, 48 38, 32 58 C 16 38, 18 18, 32 6 Z" fill="currentColor" fillOpacity="0.2" />
        <path d="M32 14 V54 M32 26 L40 20 M32 36 L24 29 M32 45 L39 40" />
      </>
    ),
    kama: (
      <>
        <path d="M32 56 C 10 40, 8 22, 20 14 C 27 10, 31 15, 32 19 C 33 15, 37 10, 44 14 C 56 22, 54 40, 32 56 Z" fill="currentColor" fillOpacity="0.2" />
        <path d="M14 32 H24 L28 24 L33 40 L37 30 H50" />
      </>
    ),
    joro: (
      <>
        <circle cx="32" cy="32" r="10" fill="currentColor" fillOpacity="0.25" />
        <path d="M32 6 V16 M32 48 V58 M6 32 H16 M48 32 H58 M14 14 L21 21 M43 43 L50 50 M50 14 L43 21 M21 43 L14 50" />
        <circle cx="32" cy="32" r="18" strokeDasharray="4 5" />
      </>
    ),
    schreiber: (
      <>
        <path d="M32 4 L40 20 L58 24 L44 36 L48 58 L32 46 L16 58 L20 36 L6 24 L24 20 Z" fill="currentColor" fillOpacity="0.2" />
        <circle cx="32" cy="31" r="6" />
      </>
    ),
    triolite: (
      <>
        <path d="M32 6 L56 50 H8 Z" fill="currentColor" fillOpacity="0.18" />
        <path d="M32 6 L32 50 M20 28 L44 28 M32 50 L20 28 M32 50 L44 28" />
      </>
    ),
    nft: (
      <>
        <path d="M32 4 L56 18 V46 L32 60 L8 46 V18 Z" fill="currentColor" fillOpacity="0.15" />
        <path d="M32 18 L44 25 V39 L32 46 L20 39 V25 Z" />
        <path d="M32 4 V18 M56 18 L44 25 M56 46 L44 39 M32 60 V46 M8 46 L20 39 M8 18 L20 25" opacity="0.6" />
      </>
    ),
  };
  return (
    <svg viewBox="0 0 64 64" {...base({ strokeWidth: 2, ...p })}>
      {shapes[id]}
    </svg>
  );
}

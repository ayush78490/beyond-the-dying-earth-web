/**
 * The journey script: camera keys, chapters, story beats and the colour palette, all
 * keyed by the same journey time t ∈ [0, 1] (= scroll progress through the journey).
 *
 *   0.00–0.08  the hero dissolves into the dying Earth
 *   0.08–0.30  Earth is dying · we took everything · pull away
 *   0.30–0.52  flyby past Earth · deep space · the signal
 *   0.52–0.62  the ringed planet · atmospheric entry
 *   0.62–0.76  the living planet: wilderness · five energies
 *   0.76–0.94  RARI · energy economy · castle · Solguardian
 *   0.94–1.00  through the portal · return to a healing Earth · join
 */
import { canon, imageToWorld } from './layout';

type V3 = [number, number, number];

/** A point of the key art on the layer at distance d (world space). Aim points all use
 *  d = 100: same ray, common distance, so pans between subjects interpolate cleanly. */
const subject = (x: number, y: number, d: number): V3 => imageToWorld(x, y, d).toArray() as V3;
/** A camera position a fraction `k` of the way from the canonical eye to that point. */
const onRay = (x: number, y: number, d: number, k: number): V3 => {
  const p = imageToWorld(x, y, d);
  return canon((p.x - canon(0, 0, 0)[0]) * k, (p.y - canon(0, 0, 0)[1]) * k, (p.z - canon(0, 0, 0)[2]) * k);
};

export interface CameraKey {
  t: number;
  pos: V3;
  look: V3;
  fov?: number;
}

/** Continuous shot from Earth into the alien world (the portal plunge ends it). */
export const PATH_OUT: CameraKey[] = [
  // opens inside the portal's flash, skimming the burning surface, then pulls back
  { t: 0.0, pos: [2.2, 1.6, 11.6], look: [-4, -1, 0], fov: 46 },
  { t: 0.07, pos: [2.6, 1.7, 12.2], look: [-4, -1, 0], fov: 46 },
  { t: 0.135, pos: [7, 1.2, 31], look: [-6, 0, 0], fov: 40 },
  { t: 0.18, pos: [14, 4, 48], look: [-4, 0, -10], fov: 42 },
  { t: 0.27, pos: [22, 9, 72], look: [-6, 0, -200], fov: 46 },
  { t: 0.36, pos: [16, 6, -30], look: [-8, 1, -400], fov: 50 },
  { t: 0.45, pos: [4, 3, -230], look: [-10, 1.5, -720], fov: 48 },
  { t: 0.52, pos: [-6, 2, -430], look: [-12, 1.6, -720], fov: 44 },
  // atmospheric entry: close to the canonical eye, the clouds clear onto the key art
  { t: 0.565, pos: canon(1.5, 2.5, 14), look: canon(0, 0.5, -100), fov: 42 },
  { t: 0.62, pos: canon(0, 0, 0), look: canon(0, 0, -100), fov: 40 },
  // Inside the diorama the camera stays close to the canonical eye and pushes in like a
  // telephoto lens: it glides a short way along the sight line to each subject (depth,
  // parallax) while narrowing the field of view onto it. A 2.5D world never shows a gap
  // from these positions — the layers separate, but nothing behind them is exposed.
  // Subjects near the art's right edge are framed left of centre so the view stays on it.
  { t: 0.68, pos: onRay(1100, 640, 40, 0.16), look: subject(1100, 640, 100), fov: 24 },
  { t: 0.703, pos: canon(0, 0, -1), look: canon(0, -0.5, -100), fov: 38 },
  { t: 0.725, pos: onRay(500, 640, 23.6, 0.14), look: subject(500, 640, 100), fov: 28 },
  { t: 0.75, pos: canon(0.3, 0, -1), look: canon(1.5, -0.3, -100), fov: 38 },
  { t: 0.775, pos: onRay(1250, 500, 40, 0.14), look: subject(1250, 500, 100), fov: 18 },
  { t: 0.82, pos: onRay(1250, 360, 70, 0.1), look: subject(1250, 360, 100), fov: 20 },
  { t: 0.87, pos: onRay(1260, 290, 70, 0.12), look: subject(1260, 290, 100), fov: 18 },
  { t: 0.915, pos: onRay(1250, 270, 70, 0.12), look: subject(1240, 240, 100), fov: 22 },
  { t: 0.952, pos: onRay(1420, 330, 70, 0.9), look: subject(1420, 330, 100), fov: 40 },
];

/** After the portal flash: back home, the Earth heals. */
export const PATH_HOME: CameraKey[] = [
  { t: 0.952, pos: [0, 4, 84], look: [0, 0, 0], fov: 40 },
  { t: 0.98, pos: [0, 7, 52], look: [0, 4, 0], fov: 40 },
  { t: 1.0, pos: [0, 9, 42], look: [0, 6.5, 0], fov: 40 },
];

/** The cut between the two shots, hidden inside the portal flash. */
export const PORTAL_CUT = 0.952;

export interface Chapter {
  id: string;
  index: string;
  label: string;
  /** where the chapter starts (nav + indicator jump here) */
  at: number;
}

export const CHAPTERS: Chapter[] = [
  { id: 'earth', index: '01', label: 'Earth', at: 0.125 },
  { id: 'planet', index: '02', label: 'Planet', at: 0.625 },
  { id: 'rari', index: '03', label: 'RARI', at: 0.78 },
  { id: 'castle', index: '04', label: 'Castle', at: 0.865 },
  { id: 'return', index: '05', label: 'Return', at: 0.985 },
];

/** Nav anchors → journey time. */
export const ANCHORS: Record<string, number> = {
  story: 0.13,
  world: 0.625,
  gameplay: 0.68,
  economy: 0.82,
  nfts: 0.83,
  join: 0.995,
};

export type BeatKind = 'story' | 'title' | 'wilderness' | 'energies' | 'economy' | 'cta';

export interface Beat {
  id: string;
  /** fully visible between in and out; fades over `fade` on each side */
  in: number;
  out: number;
  align: 'left' | 'center' | 'right';
  kind: BeatKind;
  kicker: string;
  title: string;
  body?: string;
  bullets?: string[];
}

export const BEATS: Beat[] = [
  {
    id: 'dying',
    in: 0.12,
    out: 0.175,
    align: 'left',
    kind: 'story',
    kicker: 'Chapter 01 // Origin',
    title: 'Earth is dying.',
    body: 'The forests are ash. The oceans have gone still. The sky above every city is the colour of rust.',
  },
  {
    id: 'took',
    in: 0.19,
    out: 0.26,
    align: 'left',
    kind: 'story',
    kicker: "Nature's Fall Tragedy",
    title: 'We took everything.',
    body: "Centuries of exploitation stripped the planet bare — until its balance collapsed in a single cascading event the survivors named Nature's Fall Tragedy: the NFT.",
  },
  {
    id: 'answered',
    in: 0.31,
    out: 0.38,
    align: 'right',
    kind: 'story',
    kicker: 'Signal // Unknown origin',
    title: 'Then, something answered.',
    body: 'Far beyond our solar system, a living world is broadcasting raw cosmic energy — enough to restart a planet.',
  },
  {
    id: 'dark',
    in: 0.42,
    out: 0.5,
    align: 'left',
    kind: 'story',
    kicker: 'Kepler rift // 4.2 light-years',
    title: 'Across the dark.',
    body: 'The Astrion follow the signal through the rift — past drifting wreckage, into a sky that glows violet.',
  },
  {
    id: 'living',
    in: 0.62,
    out: 0.65,
    align: 'center',
    kind: 'title',
    kicker: 'Chapter 02',
    title: 'The Living Planet.',
    body: 'A world still breathing — wild, luminous and fiercely guarded.',
  },
  {
    id: 'wilderness',
    in: 0.676,
    out: 0.698,
    align: 'left',
    kind: 'wilderness',
    kicker: 'Explore // The wilderness',
    title: 'Every biome is a gauntlet.',
    bullets: ['Alien wilderness', 'Gravity anomalies', 'Energy barriers', 'Floating terrain', 'Hidden resource caches'],
  },
  {
    id: 'energies',
    in: 0.716,
    out: 0.742,
    align: 'right',
    kind: 'energies',
    kicker: 'Five energies',
    title: 'Harvest the planet.',
    body: 'Five energies flow through this world — REGO, OLIVA, KAMA, JORO and SCHREIBER. Learn them, master them, carry them home.',
  },
  {
    id: 'rari',
    in: 0.77,
    out: 0.8,
    align: 'left',
    kind: 'story',
    kicker: 'Chapter 03 // Hostiles',
    title: 'The RARI.',
    body: 'Armoured hunters bred for war. They move in packs, learn your patterns and guard every energy source on the planet.',
  },
  {
    id: 'economy',
    in: 0.815,
    out: 0.845,
    align: 'right',
    kind: 'economy',
    kicker: 'Resource system',
    title: 'Energy is everything.',
    body: 'Convert REGO into KAMA to survive — or drive OLIVA through the full chain and forge Triolite into an NFT artifact that is truly yours.',
  },
  {
    id: 'castle',
    in: 0.86,
    out: 0.888,
    align: 'left',
    kind: 'story',
    kicker: 'Chapter 04 // Stronghold',
    title: 'The Castle.',
    body: 'The RARI citadel rises around a stolen star-core. Every corridor is a gauntlet; every gate a test.',
  },
  {
    id: 'solguardian',
    in: 0.9,
    out: 0.932,
    align: 'center',
    kind: 'title',
    kicker: 'Final boss',
    title: 'The Solguardian.',
    body: 'Ancient. Colossal. Bound to the citadel’s core.',
  },
  {
    id: 'return',
    in: 0.975,
    out: 1.2,
    align: 'center',
    kind: 'cta',
    kicker: 'Chapter 05 // Return',
    title: 'Beyond the Dying Earth',
    body: 'The Earth is dying. But hope is out there.',
  },
];

/** Fade length (in t) for beat transitions. */
export const BEAT_FADE = 0.012;

/** World-anchored HUD callouts: image px on a layer, visible within a t range. */
export interface WorldLabel {
  id: string;
  x: number;
  y: number;
  layer: 'far' | 'mid' | 'fore' | 'chars';
  from: number;
  to: number;
  title: string;
  sub: string;
  color: string;
}

export const WORLD_LABELS: WorldLabel[] = [
  { id: 'rego', x: 140, y: 745, layer: 'fore', from: 0.71, to: 0.755, title: 'REGO', sub: 'Suit energy', color: '#5ad7ff' },
  { id: 'kama', x: 638, y: 676, layer: 'chars', from: 0.71, to: 0.755, title: 'KAMA', sub: 'Life currency', color: '#ff6fcf' },
  { id: 'oliva', x: 760, y: 880, layer: 'fore', from: 0.71, to: 0.755, title: 'OLIVA', sub: 'Skill energy', color: '#7dffb0' },
  { id: 'joro', x: 1515, y: 662, layer: 'fore', from: 0.71, to: 0.755, title: 'JORO', sub: 'Shockwave fuel', color: '#ffb54d' },
  { id: 'schreiber', x: 1420, y: 330, layer: 'far', from: 0.71, to: 0.755, title: 'SCHREIBER', sub: 'Doom energy', color: '#ff4d6d' },
  { id: 'rari-1', x: 1262, y: 470, layer: 'mid', from: 0.765, to: 0.805, title: 'RARI', sub: 'Hunter', color: '#ff4d6d' },
  { id: 'rari-2', x: 1335, y: 500, layer: 'mid', from: 0.765, to: 0.805, title: 'RARI', sub: 'Brute', color: '#ff4d6d' },
  { id: 'rari-3', x: 1455, y: 448, layer: 'mid', from: 0.765, to: 0.805, title: 'RARI', sub: 'Sentinel', color: '#ff4d6d' },
  { id: 'portal', x: 1420, y: 330, layer: 'far', from: 0.82, to: 0.845, title: 'STAR-CORE', sub: 'Energy conversion', color: '#e04cff' },
];

/** Palette keys: the light of the universe along the route. Colours are 0..1 RGB. */
export interface PaletteKey {
  t: number;
  skyTop: V3;
  skyLow: V3;
  nebA: V3;
  nebB: V3;
  nebula: number;
  tint: V3;
  tintAmount: number;
  light: V3;
}

export const PALETTE: PaletteKey[] = [
  { t: 0.0, skyTop: [0.02, 0.012, 0.012], skyLow: [0.05, 0.02, 0.012], nebA: [0.35, 0.1, 0.03], nebB: [0.2, 0.05, 0.04], nebula: 0.25, tint: [1, 0.6, 0.4], tintAmount: 0, light: [1.0, 0.55, 0.3] },
  { t: 0.22, skyTop: [0.02, 0.012, 0.02], skyLow: [0.05, 0.022, 0.03], nebA: [0.4, 0.12, 0.08], nebB: [0.22, 0.06, 0.16], nebula: 0.35, tint: [1, 0.6, 0.5], tintAmount: 0, light: [1.0, 0.55, 0.35] },
  { t: 0.36, skyTop: [0.02, 0.015, 0.05], skyLow: [0.05, 0.025, 0.08], nebA: [0.4, 0.12, 0.3], nebB: [0.18, 0.12, 0.45], nebula: 0.55, tint: [0.8, 0.6, 1], tintAmount: 0, light: [0.85, 0.5, 0.9] },
  { t: 0.5, skyTop: [0.015, 0.02, 0.07], skyLow: [0.06, 0.03, 0.12], nebA: [0.3, 0.12, 0.55], nebB: [0.08, 0.35, 0.55], nebula: 0.7, tint: [0.7, 0.65, 1], tintAmount: 0.15, light: [0.55, 0.6, 1.0] },
  { t: 0.62, skyTop: [0.02, 0.02, 0.08], skyLow: [0.08, 0.04, 0.14], nebA: [0.35, 0.12, 0.6], nebB: [0.1, 0.4, 0.6], nebula: 0.6, tint: [1, 1, 1], tintAmount: 0, light: [0.6, 0.6, 1.0] },
  { t: 0.9, skyTop: [0.03, 0.015, 0.06], skyLow: [0.12, 0.04, 0.12], nebA: [0.5, 0.1, 0.45], nebB: [0.2, 0.1, 0.5], nebula: 0.6, tint: [1.0, 0.75, 0.95], tintAmount: 0.12, light: [0.9, 0.5, 0.9] },
  { t: 0.952, skyTop: [0.01, 0.02, 0.06], skyLow: [0.03, 0.06, 0.12], nebA: [0.08, 0.22, 0.45], nebB: [0.1, 0.4, 0.4], nebula: 0.4, tint: [1, 1, 1], tintAmount: 0, light: [0.7, 0.85, 1.0] },
  { t: 1.0, skyTop: [0.01, 0.025, 0.07], skyLow: [0.03, 0.08, 0.16], nebA: [0.06, 0.25, 0.5], nebB: [0.1, 0.45, 0.35], nebula: 0.35, tint: [1, 1, 1], tintAmount: 0, light: [0.8, 0.9, 1.0] },
];

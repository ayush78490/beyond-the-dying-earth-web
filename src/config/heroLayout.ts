/**
 * Hero composition, in SOURCE-IMAGE PIXELS (1672 x 941, y pointing down).
 *
 * These numbers describe where things are inside the supplied artwork and are
 * mirrored in tools/prepare_hero.py (which bakes the masks + depth map).
 * If the hero artwork is replaced, re-measure these and re-run `npm run assets`.
 */
import { clamp, lerp, smoothstep } from '../lib/math';

export const IMAGE = { w: 1672, h: 941 } as const;

/** Ringed planet, fitted to the visible limb. */
export const PLANET = { cx: 706.7, cy: 453.5, r: 395.7 } as const;

/** Portal ring at the heart of the RARI fortress + its vertical beam. */
export const PORTAL = { cx: 1420, cy: 330, r: 34 } as const;
export const BEAM = { x: 1420, y0: 88, y1: 560 } as const;

/** Floating rocks: cx, cy, rx, ry — each bobs/rotates independently in the shader. */
export const ROCKS: ReadonlyArray<readonly [number, number, number, number]> = [
  [992, 356, 50, 60], [1045, 381, 28, 41], [1233, 346, 57, 56], [1095, 280, 15, 21],
  [1158, 306, 13, 19], [1142, 410, 21, 25], [1348, 250, 19, 27], [1323, 302, 11, 21],
  [1181, 406, 9, 13], [1345, 136, 68, 62], [1515, 111, 39, 41], [1555, 236, 17, 27],
  [1512, 245, 11, 17], [1573, 282, 10, 14], [1092, 432, 11, 15], [1052, 455, 9, 12],
];

/** Where each waterfall hits the ground (mist emitters): x, y, width, depth. */
export const WATERFALL_BASES: ReadonlyArray<readonly [number, number, number, number]> = [
  [80, 452, 90, 0.42], [36, 626, 84, 0.45], [1082, 690, 34, 0.47], [1157, 690, 54, 0.47],
  [1288, 690, 96, 0.47], [1495, 650, 116, 0.47], [863, 796, 60, 0.62], [1081, 776, 84, 0.6],
];

/** Breathing pivots for the two Astrion: xMin, xMax, feetY, phase. */
export const BREATH = {
  male: [220, 480, 905, 0.0],
  female: [470, 780, 860, 1.9],
} as const;

export type LightColor = 'cyan' | 'magenta';

/** Armour / visor lights on the two characters. */
export const CHARACTER_LIGHTS: ReadonlyArray<{ x: number; y: number; r: number; color: LightColor; phase: number }> = [
  { x: 405, y: 434, r: 26, color: 'cyan', phase: 0.0 },     // male visor
  { x: 415, y: 484, r: 34, color: 'cyan', phase: 0.7 },     // male shoulder core
  { x: 327, y: 530, r: 22, color: 'cyan', phase: 1.9 },     // male forearm
  { x: 442, y: 584, r: 14, color: 'cyan', phase: 2.6 },     // male wrist
  { x: 388, y: 853, r: 16, color: 'cyan', phase: 3.4 },     // male boot
  { x: 641, y: 611, r: 26, color: 'magenta', phase: 0.4 },  // female visor
  { x: 638, y: 676, r: 34, color: 'magenta', phase: 1.3 },  // female shoulder core
  { x: 586, y: 574, r: 14, color: 'magenta', phase: 2.2 },  // female head ornament
];

/** Normalised positions (for DOM HUD anchoring). */
export const HUD_ANCHORS = {
  portal: { x: PORTAL.cx, y: PORTAL.cy },
  rari: { x: 1300, y: 500 },
} as const;

/** Depth values used when an overlay has to follow the backdrop parallax. */
export const DEPTH = {
  sky: 0.0,
  planet: 0.12,
  portal: 0.3,
  waterfallsFar: 0.46,
  midground: 0.6,
  characters: 0.7,
  foreground: 0.9,
} as const;

/** Parallax shift (in image px) of something at depth d, for a unit pointer offset. */
export const parallaxWeight = (d: number) => 0.12 + 0.88 * d;

export interface HeroFrame {
  /** visible window centre + size, in image px (may extend above the image on portrait screens) */
  cx: number;
  cy: number;
  w: number;
  h: number;
  /** css px per image px */
  scale: number;
  /** css position of image pixel (0,0) */
  originX: number;
  originY: number;
  layout: 'desktop' | 'portrait';
}

/**
 * Picks which part of the artwork to show for a viewport.
 *  - landscape: "cover" crop, slightly zoomed so parallax never reveals an edge,
 *    sliding towards the characters as the screen narrows.
 *  - portrait: re-composed — the window keeps both Astrion + the planet and the
 *    image is anchored to the bottom; extra sky is synthesised above for the copy.
 */
export function computeHeroFrame(vw: number, vh: number): HeroFrame {
  const { w: W, h: H } = IMAGE;
  const a = vw / Math.max(vh, 1);
  const overscan = 0.965;
  let w: number;
  let h: number;
  let cx: number;
  let cy: number;
  let layout: HeroFrame['layout'] = 'desktop';

  if (a >= 1) {
    if (a >= W / H) {
      w = W * overscan;
      h = w / a;
    } else {
      h = H * overscan;
      w = h * a;
    }
    cx = lerp(560, W / 2, smoothstep(1, W / H, a));
    // ultra-wide: crop mostly from the bottom so the sky/title band survives
    cy = h / 2 + (H - h) * 0.3;
  } else {
    layout = 'portrait';
    w = lerp(780, H * overscan, clamp((a - 0.46) / 0.54, 0, 1));
    h = w / a;
    cx = lerp(600, 560, clamp((a - 0.46) / 0.54, 0, 1));
    cy = h > H * overscan ? H - 12 - h / 2 : H / 2;
  }
  cx = clamp(cx, w / 2 + 12, W - w / 2 - 12);

  const scale = vw / w;
  return {
    cx,
    cy,
    w,
    h,
    scale,
    originX: -(cx - w / 2) * scale,
    originY: -(cy - h / 2) * scale,
    layout,
  };
}

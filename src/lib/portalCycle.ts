import { smoothstep } from './math';

/** Seconds between portal surges. */
export const PORTAL_PERIOD = 7.5;

/**
 * idle (slow breathing) → charge (energy builds) → shockwave expands → idle.
 * Shared by the portal shader, the backdrop lensing and the HUD so they stay in sync.
 */
export function portalPhase(t: number) {
  const c = (t % PORTAL_PERIOD) / PORTAL_PERIOD;
  const charge = smoothstep(0.55, 0.8, c) * (1 - smoothstep(0.8, 0.9, c));
  const wave = c >= 0.8 ? (c - 0.8) / 0.2 : -1;
  return { cycle: c, charge, wave };
}

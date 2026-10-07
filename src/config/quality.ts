export type QualityTier = 'high' | 'medium' | 'low';

export interface QualitySettings {
  tier: QualityTier;
  /** upper bound for the WebGL drawing-buffer pixel ratio */
  maxDpr: number;
  /** 1 = full shader path (cloud warp, fog, procedural stars), 0 = reduced */
  shaderDetail: number;
  dustCount: number;
  portalParticles: number;
  earthParticles: number;
  /** pointer parallax (desktop) vs. slow automatic camera drift (touch) */
  parallax: 'pointer' | 'auto';
  hud: boolean;
}

const TABLE: Record<QualityTier, Omit<QualitySettings, 'tier' | 'parallax'>> = {
  high: { maxDpr: 1.75, shaderDetail: 1, dustCount: 520, portalParticles: 700, earthParticles: 1400, hud: true },
  medium: { maxDpr: 1.5, shaderDetail: 1, dustCount: 260, portalParticles: 360, earthParticles: 800, hud: true },
  low: { maxDpr: 1.5, shaderDetail: 0, dustCount: 110, portalParticles: 140, earthParticles: 380, hud: false },
};

function detectTier(): QualityTier {
  if (typeof window === 'undefined') return 'high';
  const forced = new URLSearchParams(window.location.search).get('quality');
  if (forced === 'high' || forced === 'medium' || forced === 'low') return forced;

  const w = Math.min(window.innerWidth, window.screen?.width ?? window.innerWidth);
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency ?? 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;

  if (w < 768 || memory <= 2 || cores <= 2) return 'low';
  if (w < 1200 || coarse || memory <= 4 || cores <= 4) return 'medium';
  return 'high';
}

let cached: QualitySettings | null = null;

/** Device tier is decided once per page load — changing it mid-session would rebuild GPU resources. */
export function getQuality(): QualitySettings {
  if (cached) return cached;
  const tier = detectTier();
  const touch =
    typeof window !== 'undefined' &&
    (window.matchMedia('(hover: none)').matches || window.matchMedia('(pointer: coarse)').matches);
  cached = { tier, parallax: touch ? 'auto' : 'pointer', ...TABLE[tier] };
  return cached;
}

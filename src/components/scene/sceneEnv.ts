import { createContext, useContext } from 'react';
import * as THREE from 'three';
import { IMAGE, type HeroFrame } from '../../config/heroLayout';
import type { QualitySettings } from '../../config/quality';
import { parallax } from '../../hooks/useParallax';

export interface SceneEnv {
  frame: HeroFrame;
  quality: QualitySettings;
  /** 0 when the user prefers reduced motion: every layer renders a still frame */
  motion: 0 | 1;
}

export const SceneEnvContext = createContext<SceneEnv | null>(null);

export function useSceneEnv(): SceneEnv {
  const env = useContext(SceneEnvContext);
  if (!env) throw new Error('useSceneEnv must be used inside <CosmicScene>');
  return env;
}

/** Max pointer-parallax shift at depth = 1, in source-image px. */
export const MAX_SHIFT = { x: 16, y: 9 } as const;

/** Planet spin: one full apparent turn every 150 s. */
export const PLANET_SPIN = (Math.PI * 2) / 150;

/** A pleasant moment of the loop, shown as the still frame for reduced motion. */
const STILL_TIME = 9.3;

export const sceneTime = (clock: number, motion: number) => (motion ? clock : STILL_TIME);

/** Shared parallax offset in image px (positive = content moves right/down). */
export function parallaxPx(out: THREE.Vector2, motion: number) {
  return out.set(-parallax.x * MAX_SHIFT.x * motion, -parallax.y * MAX_SHIFT.y * motion);
}

/** Source-image px (y down) → scene world units (y up, origin at image centre). */
export const toWorld = (x: number, y: number): [number, number, number] => [x - IMAGE.w / 2, IMAGE.h / 2 - y, 0];

/** Additive overlay material defaults. */
export const ADDITIVE = {
  transparent: true,
  depthTest: false,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
} as const;

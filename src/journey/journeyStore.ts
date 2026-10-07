import * as THREE from 'three';
import { createPalette, samplePalette } from './cameraPath';

/**
 * Journey state shared between the WebGL world and the DOM overlays — a plain mutable
 * object (no React state): written once per frame by the camera rig, read by everyone.
 *
 *   target  scroll progress (from ScrollTrigger)
 *   t       the camera's damped time: it follows the target with inertia, so the
 *           scroll feels heavy and cinematic instead of snapping
 */
type Listener = (t: number) => void;

export const journey = {
  target: 0,
  t: 0,
  /** journey time at which the hero has fully handed over (depends on track height) */
  introEnd: 0.077,
  /** a timed jump is running: the camera tracks the scroll tightly instead of lagging */
  fast: false,
  /** the journey stage is on screen */
  visible: false,
  camera: null as THREE.PerspectiveCamera | null,
  palette: samplePalette(0, createPalette()),
  listeners: new Set<Listener>(),
};

if (import.meta.env.DEV) (window as unknown as { __journey: typeof journey }).__journey = journey;

export function onJourneyFrame(fn: Listener) {
  journey.listeners.add(fn);
  return () => {
    journey.listeners.delete(fn);
  };
}

export function emitJourneyFrame() {
  journey.listeners.forEach((fn) => fn(journey.t));
}

/** Opacity envelope of a [in, out] window with soft edges. */
export function envelope(t: number, tin: number, tout: number, fade: number) {
  const a = THREE.MathUtils.smoothstep(t, tin - fade, tin + fade * 0.5);
  const b = 1 - THREE.MathUtils.smoothstep(t, tout - fade * 0.5, tout + fade);
  return Math.min(a, b);
}

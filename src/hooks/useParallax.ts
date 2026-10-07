import { useEffect } from 'react';
import { damp } from '../lib/math';

/**
 * One shared, smoothed camera offset for every layer (WebGL + DOM HUD).
 *
 * Values are in [-1, 1]. They live in a mutable object rather than React state:
 * layers read them every frame, and nothing re-renders when the pointer moves.
 */
export interface ParallaxState {
  x: number;
  y: number;
}

const target = { x: 0, y: 0 };
const current: ParallaxState = { x: 0, y: 0 };
let mode: 'pointer' | 'auto' | 'off' = 'pointer';
let users = 0;
let raf = 0;
let last = 0;
let start = 0;

function onPointer(e: PointerEvent) {
  if (mode !== 'pointer' || e.pointerType === 'touch') return;
  target.x = (e.clientX / window.innerWidth) * 2 - 1;
  target.y = (e.clientY / window.innerHeight) * 2 - 1;
}

function onLeave() {
  target.x = 0;
  target.y = 0;
}

function tick(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  if (mode === 'auto') {
    // slow cinematic drift for touch devices: a lazy figure-eight, never repeating exactly
    const t = (now - start) / 1000;
    target.x = Math.sin(t * 0.11) * 0.45 + Math.sin(t * 0.047 + 1.3) * 0.2;
    target.y = Math.sin(t * 0.083 + 0.7) * 0.25;
  } else if (mode === 'off') {
    target.x = 0;
    target.y = 0;
  }
  const k = damp(mode === 'auto' ? 1.2 : 3.2, dt);
  current.x += (target.x - current.x) * k;
  current.y += (target.y - current.y) * k;
  raf = requestAnimationFrame(tick);
}

function acquire() {
  if (users++ > 0) return;
  start = last = performance.now();
  window.addEventListener('pointermove', onPointer, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  raf = requestAnimationFrame(tick);
}

function release() {
  if (--users > 0) return;
  cancelAnimationFrame(raf);
  window.removeEventListener('pointermove', onPointer);
  document.documentElement.removeEventListener('pointerleave', onLeave);
}

/** Read-only handle to the shared offset. */
export const parallax: Readonly<ParallaxState> = current;

/**
 * Keeps the shared parallax loop alive while the calling component is mounted.
 * @param kind  'pointer' on desktop, 'auto' (drift) on touch, 'off' for reduced motion
 */
export function useParallax(kind: 'pointer' | 'auto' | 'off'): Readonly<ParallaxState> {
  useEffect(() => {
    mode = kind;
    acquire();
    return release;
  }, [kind]);
  return current;
}

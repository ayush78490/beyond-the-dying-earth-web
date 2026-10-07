import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { prefersReducedMotion } from '../hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

/**
 * Inertial smooth scrolling (Lenis) driven by GSAP's ticker, so ScrollTrigger,
 * the sticky scroll-scrubbed scenes and the WebGL frames all advance in the same frame.
 * Disabled for reduced motion (native scrolling); touch keeps native momentum.
 */
let lenis: Lenis | null = null;

export function initSmoothScroll() {
  if (lenis || typeof window === 'undefined' || prefersReducedMotion()) return lenis;
  lenis = new Lenis({
    lerp: 0.085,
    wheelMultiplier: 0.9,
    smoothWheel: true,
    anchors: { offset: 0 },
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis?.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}

export function setScrollLocked(locked: boolean) {
  if (!lenis) return;
  if (locked) lenis.stop();
  else lenis.start();
}

let autoScrolling = false;
/** true while a programmatic scroll (nav link, jump) is running: scroll-driven snaps stay out of its way */
export function isAutoScrolling() {
  return autoScrolling;
}

/** Smoothly scroll to a y position (falls back to native scrolling). */
export function scrollToY(y: number, onComplete?: () => void) {
  if (lenis) {
    autoScrolling = true;
    lenis.scrollTo(y, {
      duration: 1.6,
      onComplete: () => {
        autoScrolling = false;
        onComplete?.();
      },
    });
  } else {
    window.scrollTo({ top: y, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    if (onComplete) window.setTimeout(onComplete, 900);
  }
}

const easeInOutSine = (x: number) => -(Math.cos(Math.PI * x) - 1) / 2;

/**
 * A short, timed move to y that ignores input while it runs: used to play a whole
 * transition in one go, so it reads as arriving rather than as frame-by-frame scrubbing.
 */
export function jumpToY(y: number, duration: number, onComplete?: () => void) {
  autoScrolling = true;
  const done = () => {
    autoScrolling = false;
    onComplete?.();
  };
  if (lenis) {
    lenis.scrollTo(y, { duration, easing: easeInOutSine, lock: true, force: true, onComplete: done });
  } else {
    window.scrollTo({ top: y, behavior: 'smooth' });
    window.setTimeout(done, duration * 1000);
  }
}

import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

/**
 * Splits a heading into masked words → chars. Each word clips its characters, so
 * letters rise into view from below their own baseline (classic trailer title reveal).
 * Gradient-filled text keeps its gradient: chars paint `var(--grad)` themselves.
 */
export function splitChars(el: HTMLElement) {
  return SplitText.create(el, {
    type: 'words,chars',
    mask: 'words',
    wordsClass: 'split-word',
    charsClass: 'split-char',
    aria: 'auto',
  });
}

/** Splits a paragraph into masked lines (re-splits automatically on resize). */
export function splitLines(el: HTMLElement) {
  return SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'split-line',
    autoSplit: true,
    aria: 'auto',
  });
}

/** The shared title-char entrance. */
export function charsIn(chars: Element[], delay = 0) {
  return gsap.fromTo(
    chars,
    { yPercent: 115, rotate: 7, opacity: 0, filter: 'blur(6px)' },
    {
      yPercent: 0,
      rotate: 0,
      opacity: 1,
      filter: 'blur(0px)',
      duration: 1.2,
      ease: 'expo.out',
      stagger: { each: 0.022, from: 'start' },
      delay,
      clearProps: 'filter',
    },
  );
}

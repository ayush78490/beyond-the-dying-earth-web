import { scrollToY } from '../lib/smoothScroll';

/** Scroll position (px) at which the journey camera reaches time t. */
export function journeyTimeToY(t: number) {
  const el = document.getElementById('journey');
  if (!el) return 0;
  const top = el.getBoundingClientRect().top + window.scrollY;
  return top + t * (el.offsetHeight - window.innerHeight);
}

export function scrollToJourneyTime(t: number, onComplete?: () => void) {
  scrollToY(journeyTimeToY(t), onComplete);
}

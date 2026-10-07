import { useEffect, useState, type RefObject } from 'react';
import { computeHeroFrame, type HeroFrame } from '../config/heroLayout';

/**
 * Tracks which window of the artwork is visible for the hero element's size and
 * exposes it as CSS variables, so DOM overlays (title, HUD) can be anchored to
 * positions inside the painting: `left: calc(var(--img-x) + 1420 * var(--img-s))`.
 */
export function useHeroFrame(ref: RefObject<HTMLElement | null>): HeroFrame {
  const [frame, setFrame] = useState<HeroFrame>(() =>
    computeHeroFrame(
      typeof window === 'undefined' ? 1600 : window.innerWidth,
      typeof window === 'undefined' ? 900 : window.innerHeight,
    ),
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const apply = () => {
      const f = computeHeroFrame(el.clientWidth, el.clientHeight);
      el.style.setProperty('--img-s', String(f.scale));
      el.style.setProperty('--img-x', `${f.originX}px`);
      el.style.setProperty('--img-y', `${f.originY}px`);
      el.dataset.layout = f.layout;
      setFrame((prev) =>
        prev.w === f.w && prev.h === f.h && prev.cx === f.cx && prev.cy === f.cy && prev.scale === f.scale ? prev : f,
      );
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return frame;
}

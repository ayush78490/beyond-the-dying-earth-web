import { useEffect, useState, type RefObject } from 'react';
import { useInView } from './useInView';

/**
 * Mounts heavy content (WebGL scenes) ahead of need and keeps it mounted.
 * Creating a WebGL context + compiling shaders costs a visible hitch, so it happens
 * either during idle time shortly after load or once the section is within a couple
 * of screens — never right as it scrolls into view, and never torn down mid-scroll.
 */
export function useDeferredMount(ref: RefObject<Element | null>, idleDelayMs: number) {
  const near = useInView(ref, '200% 0px');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (near) setMounted(true);
  }, [near]);

  useEffect(() => {
    if (mounted) return;
    let idle = 0;
    const timer = window.setTimeout(() => {
      const ric = window.requestIdleCallback;
      if (ric) idle = ric(() => setMounted(true), { timeout: 2000 });
      else setMounted(true);
    }, idleDelayMs);
    return () => {
      window.clearTimeout(timer);
      if (idle) window.cancelIdleCallback?.(idle);
    };
  }, [mounted, idleDelayMs]);

  return mounted;
}

import { useEffect, useState, type RefObject } from 'react';

/**
 * IntersectionObserver flag. Used to mount WebGL scenes shortly before they are
 * needed and to pause/unmount them once they are well off-screen.
 */
export function useInView(ref: RefObject<Element | null>, rootMargin = '0px', initial = false) {
  const [inView, setInView] = useState(initial);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);

  return inView;
}

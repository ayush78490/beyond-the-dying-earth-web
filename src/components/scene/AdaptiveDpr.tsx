import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';

/**
 * Watches real frame times and trades resolution for frame rate: drops the
 * drawing-buffer ratio when the GPU cannot hold ~50 fps, creeps back up when it can.
 */
export function AdaptiveDpr({ max, min = 0.75 }: { max: number; min?: number }) {
  const setDpr = useThree((s) => s.setDpr);
  const acc = useRef({ time: 0, frames: 0, dpr: max });

  useFrame((_, dt) => {
    const a = acc.current;
    if (dt > 0.25) {
      // tab switch / hitch: start a fresh window
      a.time = 0;
      a.frames = 0;
      return;
    }
    a.time += dt;
    a.frames += 1;
    if (a.time < 2) return;
    const fps = a.frames / a.time;
    a.time = 0;
    a.frames = 0;
    if (fps < 47 && a.dpr > min) {
      a.dpr = Math.max(min, a.dpr * 0.85);
      setDpr(a.dpr);
    } else if (fps > 58 && a.dpr < max) {
      a.dpr = Math.min(max, a.dpr * 1.06);
      setDpr(a.dpr);
    }
  });

  return null;
}

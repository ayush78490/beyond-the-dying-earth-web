import { useRef, type ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import type * as THREE from 'three';
import { parallaxWeight } from '../../config/heroLayout';
import { parallax } from '../../hooks/useParallax';
import { MAX_SHIFT, useSceneEnv } from './sceneEnv';

/**
 * Moves its children exactly like the backdrop pixels at the same depth, so overlay
 * effects stay glued to the painting while the camera drifts.
 */
export function ParallaxLayer({ depth, children }: { depth: number; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const { motion } = useSceneEnv();

  useFrame(() => {
    const g = ref.current;
    if (!g) return;
    const w = parallaxWeight(depth) * motion;
    g.position.set(-parallax.x * MAX_SHIFT.x * w, parallax.y * MAX_SHIFT.y * w, 0);
  });

  return <group ref={ref}>{children}</group>;
}

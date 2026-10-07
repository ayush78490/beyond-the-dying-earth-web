import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mulberry32 } from '../../lib/math';
import { glowPointFrag } from '../../shaders';

/**
 * Seeded point cloud with a custom vertex shader + the shared soft-glow fragment.
 * Geometry carries `aSeed` (vec4 of randoms); everything else happens on the GPU.
 */
export function useSeededPoints(
  count: number,
  vertexShader: string,
  uniforms: Record<string, THREE.IUniform>,
  seed = 1,
  options: Partial<THREE.ShaderMaterialParameters> = {},
) {
  const points = useMemo(() => {
    const rand = mulberry32(seed);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = rand();
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 10);
    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: glowPointFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms,
      ...options,
    });
    return { geo, mat };
    // uniforms are created by the caller once (useMemo) — identity is stable
  }, [count, vertexShader, uniforms, seed, options]);

  useEffect(
    () => () => {
      points.geo.dispose();
      points.mat.dispose();
    },
    [points],
  );

  return points;
}

/** Converts "size at distance 1" into device pixels for perspective point sprites. */
export const pointScale = (dpr: number, heightCss: number) => dpr * (heightCss / 900) * 4.5;

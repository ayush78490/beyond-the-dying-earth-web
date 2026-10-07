import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { WATERFALL_BASES } from '../../config/heroLayout';
import { getNoiseTexture } from '../../lib/noiseTexture';
import { mistFrag, quadVert } from '../../shaders';
import { ParallaxLayer } from './ParallaxLayer';
import { ADDITIVE, sceneTime, toWorld, useSceneEnv } from './sceneEnv';

/**
 * Waterfalls, part 2. The flowing water itself is rendered inside the backdrop pass
 * (shaders/water.glsl re-samples the painted falls along a moving flow field);
 * this layer adds the churning mist where each fall lands.
 */
export function WaterfallShader() {
  const { motion } = useSceneEnv();

  const materials = useMemo(
    () =>
      WATERFALL_BASES.map(
        (_, i) =>
          new THREE.ShaderMaterial({
            ...ADDITIVE,
            vertexShader: quadVert,
            fragmentShader: mistFrag,
            defines: { USE_NOISE_TEX: '' },
            uniforms: {
              uNoise: { value: getNoiseTexture() },
              uTime: { value: 0 },
              uMotion: { value: 1 },
              uSeed: { value: i * 3.17 },
            },
          }),
      ),
    [],
  );

  useEffect(() => {
    materials.forEach((m) => (m.uniforms.uMotion.value = motion));
  }, [materials, motion]);
  useEffect(() => () => materials.forEach((m) => m.dispose()), [materials]);

  useFrame((state) => {
    const t = sceneTime(state.clock.elapsedTime, motion);
    for (const m of materials) m.uniforms.uTime.value = t;
  });

  return (
    <>
      {WATERFALL_BASES.map(([x, y, w, depth], i) => (
        <ParallaxLayer key={i} depth={depth}>
          <mesh
            position={toWorld(x, y - 16)}
            scale={[w * 1.9, 70 + w * 0.25, 1]}
            material={materials[i]}
            renderOrder={3}
            frustumCulled={false}
          >
            <planeGeometry />
          </mesh>
        </ParallaxLayer>
      ))}
    </>
  );
}

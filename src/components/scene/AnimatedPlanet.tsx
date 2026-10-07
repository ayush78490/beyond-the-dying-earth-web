import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { DEPTH, IMAGE, PLANET } from '../../config/heroLayout';
import type { HeroTextures } from '../../lib/heroAssets';
import { getNoiseTexture } from '../../lib/noiseTexture';
import { atmosphereFrag, atmosphereVert } from '../../shaders';
import { ParallaxLayer } from './ParallaxLayer';
import { ADDITIVE, PLANET_SPIN, sceneTime, toWorld, useSceneEnv } from './sceneEnv';

const SIZE = PLANET.r * 2.5;

/**
 * The ringed planet's atmosphere. The surface itself turns inside the backdrop shader;
 * this layer adds the limb glow and faster high-altitude cloud wisps on top.
 */
export function AnimatedPlanet({ textures }: { textures: HeroTextures }) {
  const { motion, quality } = useSceneEnv();

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...ADDITIVE,
        vertexShader: atmosphereVert,
        fragmentShader: atmosphereFrag,
        defines: { USE_NOISE_TEX: '' },
        uniforms: {
          uNoise: { value: getNoiseTexture() },
          uTime: { value: 0 },
          uMotion: { value: 1 },
          uSpin: { value: 0 },
          uSize: { value: SIZE },
          uPlanet: { value: new THREE.Vector3(PLANET.cx, PLANET.cy, PLANET.r) },
          uImage: { value: new THREE.Vector2(IMAGE.w, IMAGE.h) },
          uMapC: { value: textures.mapC },
          uDetail: { value: 1 },
        },
      }),
    [textures],
  );

  useEffect(() => {
    material.uniforms.uMotion.value = motion;
    material.uniforms.uDetail.value = quality.shaderDetail;
  }, [material, motion, quality.shaderDetail]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((state) => {
    const t = sceneTime(state.clock.elapsedTime, motion);
    material.uniforms.uTime.value = t;
    material.uniforms.uSpin.value = t * PLANET_SPIN;
  });

  return (
    <ParallaxLayer depth={DEPTH.planet}>
      <mesh position={toWorld(PLANET.cx, PLANET.cy)} material={material} renderOrder={2} frustumCulled={false}>
        <planeGeometry />
      </mesh>
    </ParallaxLayer>
  );
}

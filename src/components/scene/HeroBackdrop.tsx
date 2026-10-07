import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { BREATH, IMAGE, PLANET, PORTAL, ROCKS } from '../../config/heroLayout';
import type { HeroTextures } from '../../lib/heroAssets';
import { getNoiseTexture } from '../../lib/noiseTexture';
import { portalPhase } from '../../lib/portalCycle';
import { backdropFrag, backdropVert } from '../../shaders';
import { PLANET_SPIN, parallaxPx, sceneTime, toWorld, useSceneEnv } from './sceneEnv';

/**
 * The supplied artwork, alive: one full-frame pass that re-samples the painting
 * through depth parallax + masked motion fields (see shaders/backdrop.frag).
 */
export function HeroBackdrop({ textures }: { textures: HeroTextures }) {
  const { frame, quality, motion } = useSceneEnv();

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: backdropVert,
        fragmentShader: backdropFrag,
        depthTest: false,
        depthWrite: false,
        defines: { USE_NOISE_TEX: '' },
        uniforms: {
          uNoise: { value: getNoiseTexture() },
          uPlate: { value: textures.plate },
          uMapA: { value: textures.mapA },
          uMapB: { value: textures.mapB },
          uMapC: { value: textures.mapC },
          uImage: { value: new THREE.Vector2(IMAGE.w, IMAGE.h) },
          uTime: { value: 0 },
          uMotion: { value: 1 },
          uDetail: { value: 1 },
          uParallax: { value: new THREE.Vector2() },
          uRocks: { value: ROCKS.map(([x, y, rx, ry]) => new THREE.Vector4(x, y, rx, ry)) },
          uBreath: { value: [new THREE.Vector4(...BREATH.male), new THREE.Vector4(...BREATH.female)] },
          uPlanet: { value: new THREE.Vector3(PLANET.cx, PLANET.cy, PLANET.r) },
          uPlanetSpin: { value: 0 },
          uPortal: { value: new THREE.Vector3(PORTAL.cx, PORTAL.cy, PORTAL.r) },
          uPortalCharge: { value: 0 },
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
    const u = material.uniforms;
    const t = sceneTime(state.clock.elapsedTime, motion);
    u.uTime.value = t;
    u.uPlanetSpin.value = t * PLANET_SPIN;
    u.uPortalCharge.value = portalPhase(t).charge;
    parallaxPx(u.uParallax.value, motion);
  });

  return (
    <mesh
      position={toWorld(frame.cx, frame.cy)}
      scale={[frame.w * 1.04, frame.h * 1.04, 1]}
      material={material}
      renderOrder={0}
      frustumCulled={false}
    >
      <planeGeometry />
    </mesh>
  );
}

import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { IMAGE, PORTAL } from '../../config/heroLayout';
import { mulberry32 } from '../../lib/math';
import { dustVert, glowPointFrag } from '../../shaders';
import { ADDITIVE, parallaxPx, sceneTime, useSceneEnv } from './sceneEnv';

interface DustProps {
  count: number;
  /** region the motes live in, image px: x0, y0, w, h (defaults to the visible window) */
  region?: readonly [number, number, number, number];
  /** fraction of motes that fly out of the portal towards the camera */
  flyThrough?: boolean;
  seed?: number;
  depthRange?: readonly [number, number];
  renderOrder?: number;
}

/** GPU-animated cosmic particles (see shaders/dust.vert). */
export function CosmicDust({ count, region, flyThrough = true, seed = 7, depthRange, renderOrder = 8 }: DustProps) {
  const { frame, motion } = useSceneEnv();
  const [dMin, dMax] = depthRange ?? [0.1, 1];
  const regionKey = region?.join(',');
  const dpr = useThree((s) => s.viewport.dpr);

  const { geo, mat } = useMemo(() => {
    const rand = mulberry32(seed);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      seeds[i * 4] = rand();
      seeds[i * 4 + 1] = rand();
      seeds[i * 4 + 2] = dMin + rand() * (dMax - dMin);
      seeds[i * 4 + 3] = flyThrough ? rand() : rand() * 0.8;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    const m = new THREE.ShaderMaterial({
      ...ADDITIVE,
      vertexShader: dustVert,
      fragmentShader: glowPointFrag,
      uniforms: {
        uTime: { value: 0 },
        uMotion: { value: 1 },
        uImage: { value: new THREE.Vector2(IMAGE.w, IMAGE.h) },
        uFrame: { value: new THREE.Vector4() },
        uParallax: { value: new THREE.Vector2() },
        uVanish: { value: new THREE.Vector2(PORTAL.cx, PORTAL.cy) },
        uPxScale: { value: 1 },
      },
    });
    return { geo: g, mat: m };
  }, [count, seed, flyThrough, dMin, dMax]);

  useEffect(() => {
    mat.uniforms.uMotion.value = motion;
  }, [mat, motion]);

  useEffect(() => {
    const f = mat.uniforms.uFrame.value as THREE.Vector4;
    if (regionKey) f.set(...(regionKey.split(',').map(Number) as [number, number, number, number]));
    else f.set(frame.cx - frame.w / 2, Math.max(frame.cy - frame.h / 2, -400), frame.w, frame.h);
  }, [mat, frame, regionKey]);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useFrame((state) => {
    mat.uniforms.uTime.value = sceneTime(state.clock.elapsedTime, motion);
    mat.uniforms.uPxScale.value = frame.scale * dpr;
    parallaxPx(mat.uniforms.uParallax.value, motion);
  });

  return <points geometry={geo} material={mat} renderOrder={renderOrder} frustumCulled={false} />;
}

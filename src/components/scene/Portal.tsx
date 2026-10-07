import { useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BEAM, DEPTH, PORTAL } from '../../config/heroLayout';
import { mulberry32 } from '../../lib/math';
import { portalPhase } from '../../lib/portalCycle';
import { beamFrag, glowPointFrag, portalFrag, portalParticlesVert, quadVert } from '../../shaders';
import { ParallaxLayer } from './ParallaxLayer';
import { ADDITIVE, sceneTime, toWorld, useSceneEnv } from './sceneEnv';

/** Half-size of the portal effect quad, in image px. */
const HALF = 210;

/**
 * The citadel portal — the scene's heartbeat. Breathes while idle, surges every few
 * seconds and releases a shockwave; motes spiral into it continuously.
 */
export function Portal() {
  const { quality, motion, frame } = useSceneEnv();
  const dpr = useThree((s) => s.viewport.dpr);

  const ringMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...ADDITIVE,
        vertexShader: quadVert,
        fragmentShader: portalFrag,
        uniforms: {
          uTime: { value: 0 },
          uMotion: { value: 1 },
          uCharge: { value: 0 },
          uWave: { value: -1 },
          uRing: { value: PORTAL.r / HALF },
          uOpacity: { value: 1 },
        },
      }),
    [],
  );

  const beamMat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        ...ADDITIVE,
        vertexShader: quadVert,
        fragmentShader: beamFrag,
        uniforms: { uTime: { value: 0 }, uMotion: { value: 1 }, uCharge: { value: 0 }, uOpacity: { value: 1 } },
      }),
    [],
  );

  const count = quality.portalParticles;
  const particles = useMemo(() => {
    const rand = mulberry32(1420);
    const geo = new THREE.BufferGeometry();
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < seeds.length; i++) seeds[i] = rand();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    const mat = new THREE.ShaderMaterial({
      ...ADDITIVE,
      vertexShader: portalParticlesVert,
      fragmentShader: glowPointFrag,
      uniforms: { uTime: { value: 0 }, uMotion: { value: 1 }, uCharge: { value: 0 }, uPxScale: { value: 1 } },
    });
    return { geo, mat };
  }, [count]);

  useEffect(() => {
    for (const m of [ringMat, beamMat, particles.mat]) m.uniforms.uMotion.value = motion;
  }, [ringMat, beamMat, particles, motion]);

  useEffect(
    () => () => {
      ringMat.dispose();
      beamMat.dispose();
    },
    [ringMat, beamMat],
  );
  useEffect(
    () => () => {
      particles.geo.dispose();
      particles.mat.dispose();
    },
    [particles],
  );

  useFrame((state) => {
    const t = sceneTime(state.clock.elapsedTime, motion);
    const { charge, wave } = portalPhase(t);
    ringMat.uniforms.uTime.value = t;
    ringMat.uniforms.uCharge.value = charge;
    ringMat.uniforms.uWave.value = motion ? wave : -1;
    beamMat.uniforms.uTime.value = t;
    beamMat.uniforms.uCharge.value = charge;
    particles.mat.uniforms.uTime.value = t;
    particles.mat.uniforms.uCharge.value = charge;
    particles.mat.uniforms.uPxScale.value = frame.scale * dpr;
  });

  const beamH = BEAM.y1 - BEAM.y0;
  return (
    <ParallaxLayer depth={DEPTH.portal}>
      <mesh
        position={toWorld(BEAM.x, BEAM.y0 + beamH / 2)}
        scale={[46, beamH, 1]}
        material={beamMat}
        renderOrder={4}
        frustumCulled={false}
      >
        <planeGeometry />
      </mesh>
      <group position={toWorld(PORTAL.cx, PORTAL.cy)}>
        <mesh scale={[HALF * 2, HALF * 2, 1]} material={ringMat} renderOrder={5} frustumCulled={false}>
          <planeGeometry />
        </mesh>
        <points geometry={particles.geo} material={particles.mat} renderOrder={6} frustumCulled={false} />
      </group>
    </ParallaxLayer>
  );
}

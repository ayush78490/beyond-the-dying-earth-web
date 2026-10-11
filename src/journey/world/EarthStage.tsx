import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getQuality } from '../../config/quality';
import { smoothstep } from '../../lib/math';
import { ashVert, crystalFrag, earthVert, energyVert, glowPointFrag, orbitVert } from '../../shaders';
import { EarthGlobe } from '../../components/EarthGlobe';
import { pointScale, useSeededPoints } from '../../components/scene/usePoints';
import { PORTAL_CUT } from '../chapters';
import { journey } from '../journeyStore';
import { EARTH_RADIUS } from '../layout';

const ORBIT = { radius: 1.5, tilt: 0.38, speed: 0.42 };
const TRAIL = 40;
const NO_OPTIONS = {};

/**
 * Earth: the burning world the journey leaves (ash drifting off into space), and the
 * same world the journey returns to — healing as energy pours in, a REGO crystal in orbit.
 * Built at unit radius and scaled up, so the shaders from the old sections are reused as-is.
 */
export function EarthStage({ motion }: { motion: number }) {
  const quality = getQuality();
  const group = useRef<THREE.Group>(null);
  const health = useRef(0.02);
  const fade = useRef(1);
  const shell = useRef(1.14);
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const ashUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uMotion: { value: 1 }, uPx: { value: 1 }, uFade: { value: 1 } }),
    [],
  );
  const ash = useSeededPoints(Math.round(quality.earthParticles * 0.5), ashVert, ashUniforms, 11, NO_OPTIONS);

  const energyUniforms = useMemo(
    () => ({ uTime: { value: 0 }, uMotion: { value: 1 }, uPx: { value: 1 }, uIntensity: { value: 0 }, uHealth: { value: 0 } }),
    [],
  );
  const streams = useSeededPoints(quality.earthParticles, energyVert, energyUniforms, 23, NO_OPTIONS);

  const crystal = useRef<THREE.Mesh>(null);
  const crystalMat = useMemo(
    () => new THREE.ShaderMaterial({ vertexShader: earthVert, fragmentShader: crystalFrag, uniforms: { uTime: { value: 0 } } }),
    [],
  );
  const trail = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((TRAIL + 1) * 3), 3));
    geo.setAttribute('aIdx', new THREE.BufferAttribute(new Float32Array(TRAIL + 1).map((_, i) => i), 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 3);
    const mat = new THREE.ShaderMaterial({
      vertexShader: orbitVert,
      fragmentShader: glowPointFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uMotion: { value: 1 },
        uPx: { value: 1 },
        uIntensity: { value: 0 },
        uOrbit: { value: new THREE.Vector3(ORBIT.radius, ORBIT.tilt, ORBIT.speed) },
      },
    });
    return { geo, mat };
  }, []);
  useEffect(
    () => () => {
      crystalMat.dispose();
      trail.geo.dispose();
      trail.mat.dispose();
    },
    [crystalMat, trail],
  );

  useFrame((state) => {
    const t = journey.t;
    const time = motion ? state.clock.elapsedTime : 3;
    const returning = t >= PORTAL_CUT;
    const g = group.current;
    if (g) {
      g.visible = t < 0.44 || returning;
      // coming into orbit, roll the poles out to the side: both the horizon and the ground
      // under the closing shot are temperate latitudes rather than polar ice
      g.rotation.z = returning ? 1.25 * smoothstep(0.962, 1.0, t) : 0;
    }

    // the Earth itself: dying → healing only after the portal brings the energy home
    health.current = returning ? smoothstep(PORTAL_CUT + 0.004, 0.995, t) : 0.02;
    fade.current = 1;
    // the atmosphere thins to a bright rim as the camera settles into low orbit
    const cam = journey.camera;
    const alt = cam ? cam.position.length() / EARTH_RADIUS : 9;
    shell.current = 1.035 + 0.105 * smoothstep(1.45, 3.2, alt);

    // point sizes are "per unit at distance 1": compensate for the 10x group scale
    const px = pointScale(dpr, size.height) * EARTH_RADIUS;
    const au = ashUniforms;
    au.uTime.value = time;
    au.uMotion.value = motion;
    au.uPx.value = px;
    au.uFade.value = returning ? 0 : 1 - smoothstep(0.2, 0.42, t) * 0.85;

    // in orbit the inflowing energy is all around the camera: thin it so the sky stays calm
    const orbit = 1 - smoothstep(1.6, 2.6, alt);
    const energy = (returning ? smoothstep(PORTAL_CUT, 0.975, t) : 0) * (1 - 0.5 * orbit);
    const eu = energyUniforms;
    eu.uTime.value = time;
    eu.uMotion.value = motion;
    eu.uPx.value = px;
    eu.uIntensity.value = energy;
    eu.uHealth.value = health.current;

    // in low orbit the crystal's orbit would cross the lens: draw it in, below the camera
    const orbitR = ORBIT.radius - 0.27 * orbit;
    const tu = trail.mat.uniforms;
    tu.uOrbit.value.x = orbitR;
    tu.uTime.value = time;
    tu.uMotion.value = motion;
    tu.uPx.value = px;
    tu.uIntensity.value = energy;
    crystalMat.uniforms.uTime.value = time;
    if (crystal.current) {
      crystal.current.visible = energy > 0.01;
      const a = time * ORBIT.speed;
      const x = Math.cos(a) * orbitR;
      const z = Math.sin(a) * orbitR;
      crystal.current.position.set(x, -z * Math.sin(ORBIT.tilt), z * Math.cos(ORBIT.tilt));
      crystal.current.rotation.set(0, time * 1.6, 0.3);
      // it passes close to the lens in orbit: keep it a glint, not a slab
      crystal.current.scale.set(0.07, 0.12, 0.07).multiplyScalar(1 - 0.6 * orbit);
    }
  });

  return (
    <group ref={group} scale={EARTH_RADIUS}>
      <EarthGlobe health={health} fade={fade} shell={shell} motion={motion} spin={0.03} />
      <points geometry={ash.geo} material={ash.mat} frustumCulled={false} />
      <points geometry={streams.geo} material={streams.mat} frustumCulled={false} />
      <mesh ref={crystal} material={crystalMat} scale={[0.07, 0.12, 0.07]}>
        <octahedronGeometry args={[1, 0]} />
      </mesh>
      <points geometry={trail.geo} material={trail.mat} frustumCulled={false} />
    </group>
  );
}

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getQuality } from '../../config/quality';
import { mulberry32, smoothstep } from '../../lib/math';
import { getNoiseTexture } from '../../lib/noiseTexture';
import { glowPointFrag, nebulaFrag, quadVert, skyFrag, skyVert, starsVert } from '../../shaders';
import { PORTAL_CUT } from '../chapters';
import { journey } from '../journeyStore';

const NOISE = { USE_NOISE_TEX: '' };

/** Deep-space backdrop that follows the camera; its colours are the journey palette. */
function SkyDome({ motion }: { motion: number }) {
  const mesh = useRef<THREE.Mesh>(null);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        defines: NOISE,
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          uNoise: { value: getNoiseTexture() },
          uSkyTop: { value: new THREE.Color() },
          uSkyLow: { value: new THREE.Color() },
          uNebA: { value: new THREE.Color() },
          uNebB: { value: new THREE.Color() },
          uNebula: { value: 0 },
          uTime: { value: 0 },
        },
      }),
    [],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  useFrame((state) => {
    const p = journey.palette;
    const u = mat.uniforms;
    u.uSkyTop.value.copy(p.skyTop);
    u.uSkyLow.value.copy(p.skyLow);
    u.uNebA.value.copy(p.nebA);
    u.uNebB.value.copy(p.nebB);
    u.uNebula.value = p.nebula * 0.45;
    u.uTime.value = motion ? state.clock.elapsedTime : 0;
    if (mesh.current && journey.camera) mesh.current.position.copy(journey.camera.position);
  });
  return (
    <mesh ref={mesh} material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[1500, 32, 16]} />
    </mesh>
  );
}

/** Stars along the whole route (they give way to the painted sky inside the alien world). */
function Starfield({ motion }: { motion: number }) {
  const quality = getQuality();
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);
  const count = quality.tier === 'high' ? 4200 : quality.tier === 'medium' ? 2600 : 1400;

  const { geo, mat } = useMemo(() => {
    const rand = mulberry32(99);
    const pos = new Float32Array(count * 3);
    const seeds = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      const z = 180 - rand() * 1100;
      const r = 70 + Math.pow(rand(), 0.6) * 650;
      const a = rand() * Math.PI * 2;
      pos.set([Math.cos(a) * r, Math.sin(a) * r * 0.75, z], i * 3);
      seeds.set([rand(), rand(), rand(), rand()], i * 4);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));
    const m = new THREE.ShaderMaterial({
      vertexShader: starsVert,
      fragmentShader: glowPointFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uMotion: { value: 1 }, uPx: { value: 1 }, uFade: { value: 0 } },
    });
    return { geo: g, mat: m };
  }, [count]);
  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useFrame((state) => {
    const t = journey.t;
    const u = mat.uniforms;
    u.uTime.value = state.clock.elapsedTime;
    u.uMotion.value = motion;
    u.uPx.value = dpr * (size.height / 900);
    // fade in as we leave Earth, out as the painted sky takes over, back for the return
    u.uFade.value = t < PORTAL_CUT ? smoothstep(0.06, 0.3, t) * (1 - smoothstep(0.55, 0.59, t)) : 0.8;
  });

  return <points geometry={geo} material={mat} renderOrder={-5} frustumCulled={false} />;
}

const NEBULAE: { pos: [number, number, number]; size: number; seed: number }[] = [
  { pos: [-160, 70, -90], size: 420, seed: 0.1 },
  { pos: [190, -60, -170], size: 520, seed: 1.7 },
  { pos: [-60, -110, -300], size: 480, seed: 3.3 },
  { pos: [150, 90, -360], size: 560, seed: 5.1 },
  { pos: [-200, 20, -480], size: 620, seed: 7.9 },
  { pos: [60, -40, -560], size: 500, seed: 9.4 },
];

/** Nebula banks the camera glides through; tinted from rust to violet/cyan by the palette. */
function Nebulae({ motion }: { motion: number }) {
  const group = useRef<THREE.Group>(null);
  const mats = useMemo(
    () =>
      NEBULAE.map(
        (n) =>
          new THREE.ShaderMaterial({
            vertexShader: quadVert,
            fragmentShader: nebulaFrag,
            defines: NOISE,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            uniforms: {
              uNoise: { value: getNoiseTexture() },
              uNebA: { value: new THREE.Color() },
              uNebB: { value: new THREE.Color() },
              uOpacity: { value: 0 },
              uTime: { value: 0 },
              uSeed: { value: n.seed },
            },
          }),
      ),
    [],
  );
  useEffect(() => () => mats.forEach((m) => m.dispose()), [mats]);

  useFrame((state) => {
    const t = journey.t;
    const p = journey.palette;
    const vis = t < PORTAL_CUT ? smoothstep(0.1, 0.32, t) * (1 - smoothstep(0.56, 0.6, t)) : 0;
    mats.forEach((m) => {
      m.uniforms.uNebA.value.copy(p.nebA);
      m.uniforms.uNebB.value.copy(p.nebB);
      m.uniforms.uOpacity.value = vis * p.nebula;
      m.uniforms.uTime.value = motion ? state.clock.elapsedTime : 0;
    });
    // billboards: always face the camera
    if (group.current && journey.camera) {
      group.current.children.forEach((c) => c.quaternion.copy(journey.camera!.quaternion));
      group.current.visible = vis > 0.001;
    }
  });

  return (
    <group ref={group}>
      {NEBULAE.map((n, i) => (
        <mesh key={i} position={n.pos} scale={[n.size, n.size * 0.6, 1]} material={mats[i]} renderOrder={-4}>
          <planeGeometry />
        </mesh>
      ))}
    </group>
  );
}

/** Drifting wreckage and asteroids between the worlds. */
function Debris({ motion }: { motion: number }) {
  const quality = getQuality();
  const count = quality.tier === 'high' ? 150 : quality.tier === 'medium' ? 90 : 50;
  const mesh = useRef<THREE.InstancedMesh>(null);
  const data = useMemo(() => {
    const rand = mulberry32(7);
    return Array.from({ length: count }, () => {
      const z = -30 - rand() * 520;
      // keep a corridor clear around the camera route (x drifts from ~16 to ~-6)
      const cx = 16 - ((-z - 30) / 400) * 22;
      const a = rand() * Math.PI * 2;
      const r = 9 + Math.pow(rand(), 1.4) * 70;
      return {
        p: new THREE.Vector3(cx + Math.cos(a) * r, 3 + Math.sin(a) * r * 0.7, z),
        s: 0.25 + Math.pow(rand(), 3) * 3.2,
        axis: new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize(),
        spin: (rand() - 0.5) * 0.6,
        phase: rand() * 10,
      };
    });
  }, [count]);

  const tmp = useMemo(() => ({ m: new THREE.Matrix4(), q: new THREE.Quaternion(), s: new THREE.Vector3() }), []);
  const light = useRef<THREE.DirectionalLight>(null);
  const ambient = useRef<THREE.AmbientLight>(null);

  useFrame((state) => {
    const t = journey.t;
    const vis = t < PORTAL_CUT && t > 0.12 && t < 0.62;
    if (mesh.current) {
      mesh.current.visible = vis;
      if (vis) {
        const time = motion ? state.clock.elapsedTime : 0;
        data.forEach((d, i) => {
          tmp.q.setFromAxisAngle(d.axis, d.phase + time * d.spin);
          tmp.s.setScalar(d.s);
          tmp.m.compose(d.p, tmp.q, tmp.s);
          mesh.current!.setMatrixAt(i, tmp.m);
        });
        mesh.current.instanceMatrix.needsUpdate = true;
      }
    }
    if (light.current) light.current.color.copy(journey.palette.light);
    if (ambient.current) ambient.current.color.copy(journey.palette.nebA);
  });

  return (
    <>
      <directionalLight ref={light} position={[-0.6, 0.5, -1]} intensity={3.2} />
      <ambientLight ref={ambient} intensity={1.4} />
      <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshStandardMaterial color="#7a6a96" emissive="#1c1430" roughness={0.9} metalness={0.05} flatShading />
      </instancedMesh>
    </>
  );
}

const PLANETS: { pos: [number, number, number]; r: number; color: string; emissive: string }[] = [
  { pos: [-170, 70, -330], r: 16, color: '#6b4fa8', emissive: '#1a0f33' },
  { pos: [210, -60, -500], r: 26, color: '#2f6f86', emissive: '#08202a' },
  { pos: [95, 75, -190], r: 6, color: '#9a6c88', emissive: '#1f0d18' },
];

/** Small worlds passing in the distance. */
function DistantPlanets() {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const t = journey.t;
    if (group.current) group.current.visible = t > 0.15 && t < 0.6;
  });
  return (
    <group ref={group}>
      {PLANETS.map((p, i) => (
        <mesh key={i} position={p.pos}>
          <sphereGeometry args={[p.r, 48, 24]} />
          <meshStandardMaterial color={p.color} emissive={p.emissive} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

export function SpaceEnvironment({ motion }: { motion: number }) {
  return (
    <>
      <SkyDome motion={motion} />
      <Starfield motion={motion} />
      <Nebulae motion={motion} />
      <DistantPlanets />
      <Debris motion={motion} />
    </>
  );
}

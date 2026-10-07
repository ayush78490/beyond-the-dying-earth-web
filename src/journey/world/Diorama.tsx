import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { BEAM, BREATH, IMAGE, PLANET, PORTAL, ROCKS } from '../../config/heroLayout';
import type { HeroTextures } from '../../lib/heroAssets';
import { mulberry32, smoothstep } from '../../lib/math';
import { getNoiseTexture } from '../../lib/noiseTexture';
import { portalPhase } from '../../lib/portalCycle';
import {
  beamFrag,
  cloudFrag,
  dioramaFrag,
  glowPointFrag,
  portalFrag,
  portalParticlesVert,
  quadVert,
} from '../../shaders';
import { PORTAL_CUT } from '../chapters';
import { envelope, journey } from '../journeyStore';
import { CANON, LAYER_DISTANCE, LAYER_RECTS, cardPlacement, imageToWorld, unitsPerPx, type LayerName } from '../layout';

const BASE = `${import.meta.env.BASE_URL}assets/journey/`;

/** Per-layer shader features (compile-time) and draw order (far → near). */
const LAYERS: { name: LayerName; order: number; band: [number, number]; defines: Record<string, string> }[] = [
  { name: 'sky', order: 1, band: [-1, 0.07], defines: { CLOUDS: '' } },
  { name: 'planet', order: 2, band: [0.0, 1.0], defines: { PLANET: '' } },
  { name: 'far', order: 4, band: [0.2, 0.4], defines: { ROCKS: '', WATER: '', GLOW: '', PORTAL_LENS: '' } },
  { name: 'mid', order: 6, band: [0.4, 0.62], defines: { WATER: '', GLOW: '' } },
  { name: 'fore', order: 7, band: [0.62, 9.0], defines: { WATER: '', GLOW: '' } },
  { name: 'chars', order: 8, band: [-1, 1], defines: { SWAY: '', GLOW: '' } },
];

/** The alien world appears behind the entry clouds — never before. */
const worldOpacity = (t: number) => (t >= PORTAL_CUT ? 0 : smoothstep(0.548, 0.588, t));

function configure(tex: THREE.Texture) {
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = false;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

/** Distance-based fade so a card never fills the lens with giant pixels. */
function nearFade(cardZ: number, camZ: number) {
  return smoothstep(1.5, 6, camZ - cardZ);
}

// dev-only: ?hide=sky,planet,far,mid,fore,chars to isolate layers
const HIDDEN = new Set(
  import.meta.env.DEV ? (new URLSearchParams(window.location.search).get('hide') ?? '').split(',') : [],
);

function DioramaCards({ textures, motion }: { textures: HeroTextures; motion: number }) {
  const urls = LAYERS.map((l) => `${BASE}layer-${l.name}.webp`);
  const maps = useLoader(THREE.TextureLoader, urls);

  const cards = useMemo(
    () =>
      LAYERS.map((layer, i) => {
        const rect = LAYER_RECTS[layer.name];
        const place = cardPlacement(rect, LAYER_DISTANCE[layer.name]);
        const mat = new THREE.ShaderMaterial({
          vertexShader: quadVert,
          fragmentShader: dioramaFrag,
          defines: { USE_NOISE_TEX: '', ...layer.defines },
          transparent: true,
          premultipliedAlpha: true,
          depthWrite: false,
          uniforms: {
            uNoise: { value: getNoiseTexture() },
            uPlate: { value: configure(maps[i]) },
            uMapA: { value: textures.mapA },
            uMapB: { value: textures.mapB },
            uMapC: { value: textures.mapC },
            uImage: { value: new THREE.Vector2(IMAGE.w, IMAGE.h) },
            uRect: { value: new THREE.Vector4(rect.x, rect.y, rect.w, rect.h) },
            uTime: { value: 0 },
            uMotion: { value: 1 },
            uOpacity: { value: 0 },
            uTint: { value: new THREE.Color(1, 1, 1) },
            uTintAmount: { value: 0 },
            uShade: { value: 0 },
            uRocks: { value: ROCKS.map(([x, y, rx, ry]) => new THREE.Vector4(x, y, rx, ry)) },
            uBreath: { value: [new THREE.Vector4(...BREATH.male), new THREE.Vector4(...BREATH.female)] },
            uPlanet: { value: new THREE.Vector3(PLANET.cx, PLANET.cy, PLANET.r) },
            uPlanetSpin: { value: 0 },
            uPortal: { value: new THREE.Vector3(PORTAL.cx, PORTAL.cy, PORTAL.r) },
            uPortalCharge: { value: 0 },
            // the sky is the backdrop of everything: its fill below the horizon is distant
            // sunset haze (from the painting's own horizon colours), never tinted as a gap
            uBand: { value: new THREE.Vector2(layer.name === 'sky' ? 0 : layer.band[0], layer.name === 'sky' ? 99 : layer.band[1]) },
            uHaze: { value: new THREE.Color(0.42, 0.3, 0.6) },
          },
        });
        return { ...layer, place, mat };
      }),
    [maps, textures],
  );
  useEffect(() => () => cards.forEach((c) => c.mat.dispose()), [cards]);

  useFrame((state) => {
    const t = journey.t;
    const cam = journey.camera;
    if (!cam) return;
    const time = motion ? state.clock.elapsedTime : 9.3;
    const world = worldOpacity(t);
    const { charge } = portalPhase(time);
    for (const c of cards) {
      const u = c.mat.uniforms;
      u.uTime.value = time;
      u.uMotion.value = motion;
      u.uPlanetSpin.value = time * ((Math.PI * 2) / 150);
      u.uPortalCharge.value = charge;
      u.uTint.value.copy(journey.palette.tint);
      u.uTintAmount.value = journey.palette.tintAmount;
      const near = nearFade(c.place.position.z, cam.position.z);
      if (c.name === 'planet') {
        // the giant ringed planet: visible from deep space, lit as a globe until we arrive
        u.uOpacity.value = t >= PORTAL_CUT ? 0 : smoothstep(0.08, 0.22, t) * near;
        // keep some night-side shade after arrival (as the hero's scrim does)
        u.uShade.value = 1 - 0.6 * smoothstep(0.55, 0.61, t);
      } else {
        u.uOpacity.value = world * near;
      }
    }
  });

  return (
    <>
      {cards.filter((c) => !HIDDEN.has(c.name)).map((c) => (
        <mesh
          key={c.name}
          position={c.place.position}
          scale={[c.place.width, c.place.height, 1]}
          material={c.mat}
          renderOrder={c.order}
          frustumCulled={false}
        >
          <planeGeometry />
        </mesh>
      ))}
    </>
  );
}

/** The final boss, rising from behind the citadel as the camera looks up. */
function Solguardian() {
  const tex = useLoader(THREE.TextureLoader, `${BASE}solguardian.webp`);
  const mesh = useRef<THREE.Mesh>(null);
  const d = LAYER_DISTANCE.solguardian;
  const widthPx = 760;
  const heightPx = (widthPx * 900) / 1600;
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: quadVert,
        fragmentShader: /* glsl */ `
          uniform sampler2D uTex; uniform float uOpacity; uniform float uTime;
          varying vec2 vUv;
          void main() {
            vec4 c = texture2D(uTex, vec2(vUv.x, 1.0 - vUv.y));
            float hot = smoothstep(0.55, 0.95, max(c.r, max(c.g, c.b)));
            float pulse = 0.75 + 0.25 * sin(uTime * 1.3) + 0.1 * sin(uTime * 7.0);
            vec3 col = c.rgb * (1.0 + hot * pulse * 0.6);
            float a = c.a * uOpacity;
            gl_FragColor = vec4(col * a, a);
          }`,
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
        uniforms: { uTex: { value: configure(tex) }, uOpacity: { value: 0 }, uTime: { value: 0 } },
      }),
    [tex],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  const low = useMemo(() => imageToWorld(1270, 560, d), [d]);
  const high = useMemo(() => imageToWorld(1270, 210, d), [d]);

  useFrame((state) => {
    const t = journey.t;
    const rise = smoothstep(0.84, 0.915, t);
    // looms while the camera looks up at it, gone as the camera dives into the portal
    mat.uniforms.uOpacity.value = worldOpacity(t) * (0.55 + rise * 0.45) * (1 - smoothstep(0.925, 0.945, t));
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mesh.current?.position.lerpVectors(low, high, rise);
  });

  const u = unitsPerPx(d);
  return (
    <mesh ref={mesh} scale={[widthPx * u, heightPx * u, 1]} material={mat} renderOrder={3} frustumCulled={false}>
      <planeGeometry />
    </mesh>
  );
}

/** A bank of violet cloud the camera punches through on atmospheric entry. */
function EntryClouds({ motion }: { motion: number }) {
  const banks = useMemo(() => {
    const rand = mulberry32(5);
    return Array.from({ length: 6 }, (_, i) => ({
      pos: new THREE.Vector3(CANON.x + (rand() - 0.5) * 20, CANON.y + 1.5 + (rand() - 0.5) * 8, CANON.z + 34 - i * 5),
      size: 70 + rand() * 50,
      mat: new THREE.ShaderMaterial({
        vertexShader: quadVert,
        fragmentShader: cloudFrag,
        defines: { USE_NOISE_TEX: '' },
        transparent: true,
        premultipliedAlpha: true,
        depthWrite: false,
        uniforms: {
          uNoise: { value: getNoiseTexture() },
          uOpacity: { value: 0 },
          uTime: { value: 0 },
          uSeed: { value: i * 2.37 },
          uColorA: { value: new THREE.Color(0.42, 0.28, 0.78) },
          uColorB: { value: new THREE.Color(1.0, 0.78, 0.95) },
        },
      }),
    }));
  }, []);
  useEffect(() => () => banks.forEach((b) => b.mat.dispose()), [banks]);
  const group = useRef<THREE.Group>(null);

  useFrame((state) => {
    const t = journey.t;
    const cam = journey.camera;
    if (!cam || !group.current) return;
    const window = envelope(t, 0.545, 0.59, 0.025);
    group.current.visible = window > 0.001;
    banks.forEach((b, i) => {
      const mesh = group.current!.children[i];
      mesh.quaternion.copy(cam.quaternion);
      b.mat.uniforms.uOpacity.value = window * smoothstep(2, 14, cam.position.z - b.pos.z) * 0.95;
      b.mat.uniforms.uTime.value = motion ? state.clock.elapsedTime : 0;
    });
  });

  return (
    <group ref={group}>
      {banks.map((b, i) => (
        <mesh key={i} position={b.pos} scale={[b.size, b.size * 0.6, 1]} material={b.mat} renderOrder={9}>
          <planeGeometry />
        </mesh>
      ))}
    </group>
  );
}

/** The portal: a beacon on the horizon from deep space, the full energy core up close. */
function WorldPortal({ motion }: { motion: number }) {
  const d = LAYER_DISTANCE.far;
  const u = unitsPerPx(d);
  const center = useMemo(() => imageToWorld(PORTAL.cx, PORTAL.cy, d - 0.5), [d]);
  const beamPos = useMemo(() => imageToWorld(BEAM.x, (BEAM.y0 + BEAM.y1) / 2, d - 0.4), [d]);
  const HALF = 210;
  const size = useThree((s) => s.size);
  const dpr = useThree((s) => s.viewport.dpr);

  const ring = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: quadVert,
        fragmentShader: portalFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uMotion: { value: 1 },
          uCharge: { value: 0 },
          uWave: { value: -1 },
          uRing: { value: PORTAL.r / HALF },
          uOpacity: { value: 0 },
        },
      }),
    [],
  );
  const beam = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: quadVert,
        fragmentShader: beamFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uMotion: { value: 1 }, uCharge: { value: 0 }, uOpacity: { value: 0 } },
      }),
    [],
  );
  const parts = useMemo(() => {
    const n = 420;
    const rand = mulberry32(1420);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(new Float32Array(n * 4).map(() => rand()), 4));
    const mat = new THREE.ShaderMaterial({
      vertexShader: portalParticlesVert,
      fragmentShader: glowPointFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uTime: { value: 0 }, uMotion: { value: 1 }, uCharge: { value: 0 }, uPxScale: { value: 1 } },
    });
    return { geo, mat };
  }, []);
  // a single bright point: the "tiny glowing structure on the horizon"
  const beacon = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
    const mat = new THREE.ShaderMaterial({
      vertexShader: /* glsl */ `
        uniform float uSize; uniform float uAlpha; varying float vAlpha; varying vec3 vColor;
        void main() { gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize; vAlpha = uAlpha; vColor = vec3(1.0, 0.45, 0.95); }`,
      fragmentShader: glowPointFrag,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { uSize: { value: 18 }, uAlpha: { value: 0 } },
    });
    return { geo, mat };
  }, []);
  useEffect(
    () => () => {
      ring.dispose();
      beam.dispose();
      parts.geo.dispose();
      parts.mat.dispose();
      beacon.geo.dispose();
      beacon.mat.dispose();
    },
    [ring, beam, parts, beacon],
  );

  useFrame((state) => {
    const t = journey.t;
    const cam = journey.camera;
    if (!cam) return;
    const time = motion ? state.clock.elapsedTime : 9.3;
    const { charge, wave } = portalPhase(time);
    // the plunge: energy swells as the camera dives into the core
    const plunge = smoothstep(0.915, PORTAL_CUT, t);
    const c = Math.min(1, charge + plunge);
    const world = worldOpacity(t);
    ring.uniforms.uTime.value = beam.uniforms.uTime.value = parts.mat.uniforms.uTime.value = time;
    ring.uniforms.uMotion.value = beam.uniforms.uMotion.value = parts.mat.uniforms.uMotion.value = motion;
    ring.uniforms.uCharge.value = beam.uniforms.uCharge.value = parts.mat.uniforms.uCharge.value = c;
    ring.uniforms.uWave.value = motion ? wave : -1;
    ring.uniforms.uOpacity.value = world * (1 + plunge * 2);
    beam.uniforms.uOpacity.value = world;
    const dist = Math.max(cam.position.distanceTo(center), 1);
    const pxPerUnit = (size.height * dpr) / (2 * Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * dist);
    parts.mat.uniforms.uPxScale.value = pxPerUnit * u;
    // beacon: bright while the world itself is still too far to see
    beacon.mat.uniforms.uAlpha.value = t >= PORTAL_CUT ? 0 : smoothstep(0.24, 0.36, t) * (1 - smoothstep(0.55, 0.6, t));
    beacon.mat.uniforms.uSize.value = (14 + 8 * Math.sin(time * 1.4)) * dpr;
  });

  return (
    <>
      <mesh position={beamPos} scale={[46 * u, (BEAM.y1 - BEAM.y0) * u, 1]} material={beam} renderOrder={5}>
        <planeGeometry />
      </mesh>
      <group position={center}>
        <mesh scale={[HALF * 2 * u, HALF * 2 * u, 1]} material={ring} renderOrder={5}>
          <planeGeometry />
        </mesh>
        <points scale={u} geometry={parts.geo} material={parts.mat} renderOrder={5} frustumCulled={false} />
        <points geometry={beacon.geo} material={beacon.mat} renderOrder={5} frustumCulled={false} />
      </group>
    </>
  );
}

export function Diorama({ textures, motion }: { textures: HeroTextures; motion: number }) {
  return (
    <>
      <DioramaCards textures={textures} motion={motion} />
      <Solguardian />
      <WorldPortal motion={motion} />
      <EntryClouds motion={motion} />
    </>
  );
}

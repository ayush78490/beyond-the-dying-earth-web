import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CHARACTER_ART, type CharacterArt } from '../../config/characters';
import { BREATH, CHARACTER_LIGHTS, DEPTH } from '../../config/heroLayout';
import { glowPointFrag, lightsVert } from '../../shaders';
import { CosmicDust } from './CosmicDust';
import { ParallaxLayer } from './ParallaxLayer';
import { ADDITIVE, sceneTime, toWorld, useSceneEnv } from './sceneEnv';

const COLORS = {
  cyan: new THREE.Color(0.35, 0.85, 1.0),
  magenta: new THREE.Color(1.0, 0.3, 0.95),
};

/**
 * The two Astrion. Their bodies breathe and their capes/hair move inside the
 * backdrop pass (they are part of the painting); this layer adds what lives on top:
 * pulsing armour lights, drifting motes and — if separate PNG cut-outs are
 * configured in config/characters.ts — the cut-out sprites themselves.
 */
export function Character() {
  const { motion, frame, quality } = useSceneEnv();
  const dpr = useThree((s) => s.viewport.dpr);

  const lights = useMemo(() => {
    const n = CHARACTER_LIGHTS.length;
    const pos = new Float32Array(n * 3);
    const color = new Float32Array(n * 3);
    const light = new Float32Array(n * 2);
    CHARACTER_LIGHTS.forEach((l, i) => {
      pos.set(toWorld(l.x, l.y), i * 3);
      const c = COLORS[l.color];
      color.set([c.r, c.g, c.b], i * 3);
      light.set([l.r, l.phase], i * 2);
    });
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(color, 3));
    geo.setAttribute('aLight', new THREE.BufferAttribute(light, 2));
    const mat = new THREE.ShaderMaterial({
      ...ADDITIVE,
      vertexShader: lightsVert,
      fragmentShader: glowPointFrag,
      uniforms: { uTime: { value: 0 }, uMotion: { value: 1 }, uPxScale: { value: 1 } },
    });
    return { geo, mat };
  }, []);

  useEffect(() => {
    lights.mat.uniforms.uMotion.value = motion;
  }, [lights, motion]);
  useEffect(
    () => () => {
      lights.geo.dispose();
      lights.mat.dispose();
    },
    [lights],
  );

  useFrame((state) => {
    lights.mat.uniforms.uTime.value = sceneTime(state.clock.elapsedTime, motion);
    lights.mat.uniforms.uPxScale.value = frame.scale * dpr;
  });

  return (
    <>
      <ParallaxLayer depth={DEPTH.characters}>
        <Suspense fallback={null}>
          {CHARACTER_ART.map((art) => (
            <CharacterSprite key={art.src} art={art} />
          ))}
        </Suspense>
        <points geometry={lights.geo} material={lights.mat} renderOrder={7} frustumCulled={false} />
      </ParallaxLayer>
      {/* motes drifting around the pair */}
      <CosmicDust
        count={Math.round(quality.dustCount * 0.18)}
        region={[180, 380, 620, 520]}
        flyThrough={false}
        depthRange={[0.6, 0.85]}
        seed={31}
        renderOrder={9}
      />
    </>
  );
}

/** Optional transparent PNG cut-out of a character, breathing around its feet. */
function CharacterSprite({ art }: { art: CharacterArt }) {
  const { motion } = useSceneEnv();
  const texture = useLoader(THREE.TextureLoader, art.src);
  const pivot = BREATH[art.who];
  const feetY = pivot[2];

  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = sceneTime(state.clock.elapsedTime, motion);
    g.scale.y = 1 + Math.sin(t * 1.4 + pivot[3]) * 0.0042 * motion;
  });

  const [fx, fy] = toWorld(art.x + art.w / 2, feetY);
  const [, cy] = toWorld(0, art.y + art.h / 2);
  return (
    <group position={[fx, fy, 0]} ref={ref}>
      <mesh position={[0, cy - fy, 0]} scale={[art.w, art.h, 1]} renderOrder={6}>
        <planeGeometry />
        <meshBasicMaterial map={texture} transparent depthTest={false} depthWrite={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

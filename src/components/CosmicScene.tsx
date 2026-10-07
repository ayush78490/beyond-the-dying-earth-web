import { useLayoutEffect, useMemo } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import type * as THREE from 'three';
import { IMAGE, type HeroFrame } from '../config/heroLayout';
import { getQuality } from '../config/quality';
import { useParallax } from '../hooks/useParallax';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { HeroTextures } from '../lib/heroAssets';
import { clamp } from '../lib/math';
import { AdaptiveDpr } from './scene/AdaptiveDpr';
import { AnimatedPlanet } from './scene/AnimatedPlanet';
import { Character } from './scene/Character';
import { CosmicDust } from './scene/CosmicDust';
import { HeroBackdrop } from './scene/HeroBackdrop';
import { Portal } from './scene/Portal';
import { SceneEnvContext, type SceneEnv } from './scene/sceneEnv';
import { WaterfallShader } from './scene/WaterfallShader';

interface Props {
  textures: HeroTextures;
  frame: HeroFrame;
  /** false while the hero is scrolled out of view: rendering stops entirely */
  active: boolean;
}

/** Orthographic camera framing the visible window of the artwork (world unit = image px). */
function FrameCamera({ frame }: { frame: HeroFrame }) {
  const camera = useThree((s) => s.camera) as THREE.OrthographicCamera;
  const size = useThree((s) => s.size);
  const invalidate = useThree((s) => s.invalidate);

  useLayoutEffect(() => {
    camera.left = frame.cx - frame.w / 2 - IMAGE.w / 2;
    camera.right = frame.cx + frame.w / 2 - IMAGE.w / 2;
    camera.top = IMAGE.h / 2 - (frame.cy - frame.h / 2);
    camera.bottom = IMAGE.h / 2 - (frame.cy + frame.h / 2);
    camera.zoom = 1;
    camera.position.set(0, 0, 100);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, frame, size, invalidate]);

  return null;
}

export default function CosmicScene({ textures, frame, active }: Props) {
  const quality = getQuality();
  const reduced = useReducedMotion();
  const motion: 0 | 1 = reduced ? 0 : 1;
  useParallax(reduced ? 'off' : quality.parallax);

  // Rendering far above the artwork's own resolution buys nothing but fill-rate.
  const dpr = useMemo(() => {
    const device = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
    return clamp(Math.min(device, quality.maxDpr, 1.4 / frame.scale), 0.75, quality.maxDpr);
  }, [quality.maxDpr, frame.scale]);

  const env = useMemo<SceneEnv>(() => ({ frame, quality, motion }), [frame, quality, motion]);

  // dev-only layer switches for profiling, e.g. ?off=portal,dust
  const off = useMemo(
    () => new Set(import.meta.env.DEV ? (new URLSearchParams(window.location.search).get('off') ?? '').split(',') : []),
    [],
  );

  return (
    <Canvas
      className="hero__canvas"
      orthographic
      flat
      linear
      dpr={dpr}
      frameloop={!active ? 'never' : reduced ? 'demand' : 'always'}
      gl={{ antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 100], near: 0.1, far: 1000, manual: true }}
      onCreated={({ gl }) => gl.setClearColor('#04050d')}
      aria-hidden
    >
      <SceneEnvContext.Provider value={env}>
        <FrameCamera frame={frame} />
        {!off.has('backdrop') && <HeroBackdrop textures={textures} />}
        {!off.has('planet') && <AnimatedPlanet textures={textures} />}
        {!off.has('mist') && <WaterfallShader />}
        {!off.has('portal') && <Portal />}
        {!off.has('character') && <Character />}
        {!off.has('dust') && <CosmicDust count={quality.dustCount} />}
        {!reduced && !off.has('adaptive') && <AdaptiveDpr max={dpr} />}
      </SceneEnvContext.Provider>
    </Canvas>
  );
}

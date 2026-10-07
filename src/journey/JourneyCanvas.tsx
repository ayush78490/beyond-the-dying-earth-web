import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { getQuality } from '../config/quality';
import type { HeroTextures } from '../lib/heroAssets';
import { AdaptiveDpr } from '../components/scene/AdaptiveDpr';
import { CameraRig } from './world/CameraRig';
import { Diorama } from './world/Diorama';
import { EarthStage } from './world/EarthStage';
import { SpaceEnvironment } from './world/SpaceEnvironment';

interface Props {
  textures: HeroTextures;
  active: boolean;
  motion: number;
}

/** The single WebGL world the whole story travels through. */
export default function JourneyCanvas({ textures, active, motion }: Props) {
  const quality = getQuality();
  const maxDpr = Math.min(quality.maxDpr, 1.5);
  return (
    <Canvas
      className="journey__canvas"
      flat
      linear
      dpr={[1, maxDpr]}
      frameloop={active ? 'always' : 'demand'}
      camera={{ fov: 40, near: 0.2, far: 4000, position: [6, 1, 30] }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance', stencil: false }}
      onCreated={({ gl }) => gl.setClearColor('#06040a')}
      aria-hidden
    >
      <CameraRig motion={motion} />
      <SpaceEnvironment motion={motion} />
      <EarthStage motion={motion} />
      <Suspense fallback={null}>
        <Diorama textures={textures} motion={motion} />
      </Suspense>
      {motion > 0 && <AdaptiveDpr max={maxDpr} />}
    </Canvas>
  );
}

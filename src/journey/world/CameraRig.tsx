import { useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { parallax } from '../../hooks/useParallax';
import { sampleCamera, samplePalette } from '../cameraPath';
import { emitJourneyFrame, journey } from '../journeyStore';

/**
 * Scroll is the destination, not the position: the camera's time eases towards the
 * scroll target every frame (heavy, cinematic). The mouse adds a small offset in the
 * camera's own plane on top of the scripted move.
 */
export function CameraRig({ motion }: { motion: number }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const tmp = useMemo(
    () => ({
      pos: new THREE.Vector3(),
      look: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((_, dt) => {
    const k = motion ? 1 - Math.exp(-Math.min(dt, 0.1) * (journey.fast ? 16 : 2.4)) : 1;
    journey.t += (journey.target - journey.t) * k;
    if (Math.abs(journey.target - journey.t) < 1e-5) journey.t = journey.target;

    let fov = sampleCamera(journey.t, tmp.pos, tmp.look);
    // portrait screens: keep a similar horizontal view of the world (the keys are
    // authored for 16:9), widening the vertical fov within reason
    const aspect = camera.aspect;
    if (aspect < 1.3) {
      const hHalf = Math.tan(THREE.MathUtils.degToRad(fov / 2)) * 1.6 * 0.6;
      const v = THREE.MathUtils.radToDeg(2 * Math.atan(hHalf / aspect));
      // ...except for the closing orbit shot: the Earth fills any width there, so keep the
      // lens tight and the horizon low
      const widen = 1 - 0.65 * THREE.MathUtils.smoothstep(journey.t, 0.975, 0.995);
      fov = THREE.MathUtils.lerp(fov, Math.min(Math.max(fov, v), 78), widen);
    }
    camera.position.copy(tmp.pos);
    camera.lookAt(tmp.look);

    // mouse: small offset in screen space (position more than aim → parallax)
    tmp.right.setFromMatrixColumn(camera.matrix, 0);
    tmp.up.setFromMatrixColumn(camera.matrix, 1);
    const mx = parallax.x * motion;
    const my = parallax.y * motion;
    camera.position.addScaledVector(tmp.right, mx * 0.6).addScaledVector(tmp.up, -my * 0.4);
    tmp.look.addScaledVector(tmp.right, mx * 0.15).addScaledVector(tmp.up, -my * 0.1);
    camera.lookAt(tmp.look);

    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
    samplePalette(journey.t, journey.palette);
    journey.camera = camera;
    emitJourneyFrame();
  }, -1);

  return null;
}

import { useEffect, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getNoiseTexture } from '../lib/noiseTexture';
import { earthAtmoFrag, earthBakeFrag, earthFrag, earthVert, quadVert } from '../shaders';

interface EarthGlobeProps {
  /** 0 = dying, 1 = restored. Read every frame, so scroll can drive it without re-renders. */
  health: RefObject<number>;
  /** overall brightness multiplier (fades the globe in/out) */
  fade?: RefObject<number>;
  motion: number;
  segments?: number;
  spin?: number;
}

const LIGHT = new THREE.Vector3(1.0, 0.45, 0.7).normalize();
const DYING = new THREE.Color(0.95, 0.45, 0.2);
const LIVING = new THREE.Color(0.35, 0.65, 1.0);

/** Renders the static terrain noise once into an equirectangular RGBA map. */
function useBakedFields(): THREE.Texture {
  const gl = useThree((s) => s.gl);
  const target = useMemo(() => {
    const rt = new THREE.WebGLRenderTarget(1024, 512, {
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
      generateMipmaps: false,
      depthBuffer: false,
    });
    rt.texture.wrapS = THREE.RepeatWrapping;
    return rt;
  }, []);

  // bake before the first frame is drawn
  useLayoutEffect(() => {
    const scene = new THREE.Scene();
    const mat = new THREE.ShaderMaterial({ vertexShader: quadVert, fragmentShader: earthBakeFrag });
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat);
    scene.add(quad);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const prev = gl.getRenderTarget();
    gl.setRenderTarget(target);
    gl.render(scene, cam);
    gl.setRenderTarget(prev);
    quad.geometry.dispose();
    mat.dispose();
  }, [gl, target]);

  useEffect(() => () => target.dispose(), [target]);
  return target.texture;
}

/** Procedural Earth + atmosphere shell, driven by a health ref. */
export function EarthGlobe({ health, fade, motion, segments = 96, spin = 0.04 }: EarthGlobeProps) {
  const globe = useRef<THREE.Mesh>(null);
  const fields = useBakedFields();

  const surface = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: earthVert,
        fragmentShader: earthFrag,
        defines: { USE_NOISE_TEX: '' },
        uniforms: {
          uNoise: { value: getNoiseTexture() },
          uFields: { value: fields },
          uTime: { value: 0 },
          uMotion: { value: 1 },
          uHealth: { value: 0 },
          uFade: { value: 1 },
          uLightDir: { value: LIGHT },
        },
      }),
    [fields],
  );

  const shell = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: earthVert,
        fragmentShader: earthAtmoFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uColor: { value: new THREE.Color() },
          uLightDir: { value: LIGHT },
          uIntensity: { value: 1 },
        },
      }),
    [],
  );

  useEffect(
    () => () => {
      surface.dispose();
      shell.dispose();
    },
    [surface, shell],
  );

  useFrame((state, dt) => {
    const h = health.current ?? 0;
    const f = fade?.current ?? 1;
    surface.uniforms.uTime.value = motion ? state.clock.elapsedTime : 4;
    surface.uniforms.uMotion.value = motion;
    surface.uniforms.uHealth.value = h;
    surface.uniforms.uFade.value = f;
    (shell.uniforms.uColor.value as THREE.Color).copy(DYING).lerp(LIVING, h);
    shell.uniforms.uIntensity.value = (0.55 + h * 0.6) * f;
    if (globe.current) globe.current.rotation.y += dt * spin * motion;
  });

  return (
    <group>
      <mesh ref={globe} material={surface} rotation={[0.25, 0.6, 0.1]}>
        <sphereGeometry args={[1, segments, segments / 2]} />
      </mesh>
      <mesh material={shell} scale={1.14}>
        <sphereGeometry args={[1, 64, 32]} />
      </mesh>
    </group>
  );
}

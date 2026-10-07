import * as THREE from 'three';

const BASE = import.meta.env.BASE_URL;

export const HERO_ASSETS = {
  plate: `${BASE}assets/hero-plate.webp`,
  mapA: `${BASE}assets/hero-maps-a.png`,
  mapB: `${BASE}assets/hero-maps-b.png`,
  mapC: `${BASE}assets/hero-maps-c.png`,
} as const;

export interface HeroTextures {
  plate: THREE.Texture;
  mapA: THREE.Texture;
  mapB: THREE.Texture;
  mapC: THREE.Texture;
}

let pending: Promise<HeroTextures> | null = null;
const listeners = new Set<(p: number) => void>();
let progress = 0;

function configure(tex: THREE.Texture, mipmaps: boolean) {
  // Values are used exactly as painted: no colour-space conversion anywhere in the hero.
  tex.colorSpace = THREE.NoColorSpace;
  tex.flipY = false;
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = mipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  tex.generateMipmaps = mipmaps;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Loads the hero textures once (the loader screen and the scene share the promise).
 * Progress is reported in 0..1.
 */
export function loadHeroTextures(onProgress?: (p: number) => void): Promise<HeroTextures> {
  if (onProgress) {
    listeners.add(onProgress);
    onProgress(progress);
  }
  if (pending) return pending;

  const loader = new THREE.TextureLoader();
  const entries = Object.entries(HERO_ASSETS) as [keyof HeroTextures, string][];
  let done = 0;
  pending = Promise.all(
    entries.map(
      ([key, url]) =>
        new Promise<[keyof HeroTextures, THREE.Texture]>((resolve, reject) => {
          loader.load(
            url,
            (tex) => {
              done += 1;
              progress = done / entries.length;
              listeners.forEach((l) => l(progress));
              resolve([key, configure(tex, key === 'plate')]);
            },
            undefined,
            reject,
          );
        }),
    ),
  ).then((pairs) => Object.fromEntries(pairs) as unknown as HeroTextures);
  return pending;
}

export function offHeroProgress(listener: (p: number) => void) {
  listeners.delete(listener);
}

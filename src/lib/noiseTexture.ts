import * as THREE from 'three';
import { mulberry32 } from './math';

/**
 * A 256² tileable value-noise texture with one octave per channel
 * (R: 4 cells, G: 8, B: 16, A: 32 per tile). One texture fetch then gives a full
 * 4-octave fbm: dot(sample, weights). Far cheaper than hashing per pixel, which
 * matters on integrated GPUs where the hero shader is fill-rate bound.
 */
let cached: THREE.DataTexture | null = null;

function octave(size: number, cells: number, rand: () => number, out: Float32Array) {
  const lattice = new Float32Array(cells * cells);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rand();
  const s = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) {
    const fy = (y / size) * cells;
    const y0 = Math.floor(fy);
    const ty = s(fy - y0);
    const y1 = (y0 + 1) % cells;
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * cells;
      const x0 = Math.floor(fx);
      const tx = s(fx - x0);
      const x1 = (x0 + 1) % cells;
      const a = lattice[y0 * cells + x0];
      const b = lattice[y0 * cells + x1];
      const c = lattice[y1 * cells + x0];
      const d = lattice[y1 * cells + x1];
      out[y * size + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty;
    }
  }
}

export function getNoiseTexture(): THREE.DataTexture {
  if (cached) return cached;
  const size = 256;
  const rand = mulberry32(2026);
  const data = new Uint8Array(size * size * 4);
  const layer = new Float32Array(size * size);
  [4, 8, 16, 32].forEach((cells, ch) => {
    octave(size, cells, rand, layer);
    for (let i = 0; i < layer.length; i++) data[i * 4 + ch] = Math.round(layer[i] * 255);
  });
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.needsUpdate = true;
  cached = tex;
  return tex;
}

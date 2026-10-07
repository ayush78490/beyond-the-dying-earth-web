/**
 * World layout of the journey. Units are arbitrary "world units"; the route runs
 * from Earth (origin) down −Z to the alien world.
 *
 * The alien world is a 2.5D diorama rebuilt from the key art: each depth layer is a
 * card placed at its own distance in front of the CANONICAL CAMERA, scaled so that
 * from that exact viewpoint the cards line up into the painting. Anywhere else, the
 * layers separate with true parallax.
 */
import * as THREE from 'three';
import layers from '../../public/assets/journey/layers.json';
import { IMAGE } from '../config/heroLayout';

export type LayerName = 'sky' | 'planet' | 'far' | 'mid' | 'fore' | 'chars';

export interface LayerRect {
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
}

export const LAYER_RECTS = layers as unknown as Record<LayerName, LayerRect>;

/** Where the camera reproduces the key art exactly. */
export const CANON = new THREE.Vector3(0, 0, -600);
export const CANON_FOV = 40;

/** Distance of each layer in front of the canonical camera. */
export const LAYER_DISTANCE: Record<LayerName | 'solguardian', number> = {
  sky: 160,
  planet: 120,
  solguardian: 95,
  far: 70,
  mid: 40,
  fore: 24,
  chars: 23.6,
};

const tanHalf = Math.tan(THREE.MathUtils.degToRad(CANON_FOV / 2));

/** World units per source-image pixel for a card at distance d. */
export const unitsPerPx = (d: number) => (2 * d * tanHalf) / IMAGE.h;

/** A point of the key art (image px) on a given layer, in world space. */
export function imageToWorld(x: number, y: number, d: number, out = new THREE.Vector3()) {
  const u = unitsPerPx(d);
  return out.set(CANON.x + (x - IMAGE.w / 2) * u, CANON.y - (y - IMAGE.h / 2) * u, CANON.z - d);
}

/** Card placement for a cropped layer. */
export function cardPlacement(rect: { x: number; y: number; w: number; h: number }, d: number) {
  const u = unitsPerPx(d);
  const center = imageToWorld(rect.x + rect.w / 2, rect.y + rect.h / 2, d);
  return { position: center, width: rect.w * u, height: rect.h * u };
}

/** Earth sits at the origin; radius in world units. */
export const EARTH_RADIUS = 10;

/** Canonical-relative helper used by the camera keys. */
export const canon = (x: number, y: number, z: number): [number, number, number] => [
  CANON.x + x,
  CANON.y + y,
  CANON.z + z,
];

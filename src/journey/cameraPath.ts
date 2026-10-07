import * as THREE from 'three';
import { clamp } from '../lib/math';
import { PALETTE, PATH_HOME, PATH_OUT, PORTAL_CUT, type CameraKey } from './chapters';

/**
 * Spline through camera keys, parameterised by journey time (not arc length):
 * a key's `t` is exactly when the camera passes it. Between keys, Catmull-Rom
 * (centripetal) keeps the motion smooth through every key.
 */
class KeyedSpline {
  private pos: THREE.CatmullRomCurve3;
  private look: THREE.CatmullRomCurve3;
  private times: number[];
  private fovs: number[];

  constructor(keys: CameraKey[]) {
    this.pos = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.pos)), false, 'centripetal');
    this.look = new THREE.CatmullRomCurve3(keys.map((k) => new THREE.Vector3(...k.look)), false, 'centripetal');
    this.times = keys.map((k) => k.t);
    let last = 40;
    this.fovs = keys.map((k) => (last = k.fov ?? last));
  }

  /** Map journey time → curve parameter u (uniform per segment), plus eased fov. */
  private locate(t: number) {
    const ts = this.times;
    const n = ts.length - 1;
    const tc = clamp(t, ts[0], ts[n]);
    let i = 0;
    while (i < n - 1 && tc > ts[i + 1]) i++;
    const local = (tc - ts[i]) / Math.max(ts[i + 1] - ts[i], 1e-6);
    // smootherstep inside each segment: the camera eases through every key
    const e = local * local * local * (local * (local * 6 - 15) + 10);
    return { u: (i + e) / n, i, e };
  }

  sample(t: number, pos: THREE.Vector3, look: THREE.Vector3) {
    const { u, i, e } = this.locate(t);
    // CatmullRomCurve3.getPoint expects u in [0,1] spread evenly across points
    this.pos.getPoint(u, pos);
    this.look.getPoint(u, look);
    return THREE.MathUtils.lerp(this.fovs[i], this.fovs[Math.min(i + 1, this.fovs.length - 1)], e);
  }
}

const OUT = new KeyedSpline(PATH_OUT);
const HOME = new KeyedSpline(PATH_HOME);

/** Camera pose for journey time t. Returns the field of view. */
export function sampleCamera(t: number, pos: THREE.Vector3, look: THREE.Vector3): number {
  return t < PORTAL_CUT ? OUT.sample(t, pos, look) : HOME.sample(t, pos, look);
}

// ---- palette -------------------------------------------------------------------

export interface Palette {
  skyTop: THREE.Color;
  skyLow: THREE.Color;
  nebA: THREE.Color;
  nebB: THREE.Color;
  nebula: number;
  tint: THREE.Color;
  tintAmount: number;
  light: THREE.Color;
}

export const createPalette = (): Palette => ({
  skyTop: new THREE.Color(),
  skyLow: new THREE.Color(),
  nebA: new THREE.Color(),
  nebB: new THREE.Color(),
  nebula: 0,
  tint: new THREE.Color(),
  tintAmount: 0,
  light: new THREE.Color(),
});

const ca = new THREE.Color();
const cb = new THREE.Color();

/** The universe's light at time t — interpolated, never switched. */
export function samplePalette(t: number, out: Palette): Palette {
  let i = 0;
  while (i < PALETTE.length - 2 && t > PALETTE[i + 1].t) i++;
  const a = PALETTE[i];
  const b = PALETTE[i + 1];
  const k = clamp((t - a.t) / (b.t - a.t), 0, 1);
  const s = k * k * (3 - 2 * k);
  const mix = (target: THREE.Color, x: [number, number, number], y: [number, number, number]) =>
    target.copy(ca.setRGB(...x)).lerp(cb.setRGB(...y), s);
  mix(out.skyTop, a.skyTop, b.skyTop);
  mix(out.skyLow, a.skyLow, b.skyLow);
  mix(out.nebA, a.nebA, b.nebA);
  mix(out.nebB, a.nebB, b.nebB);
  mix(out.tint, a.tint, b.tint);
  mix(out.light, a.light, b.light);
  out.nebula = THREE.MathUtils.lerp(a.nebula, b.nebula, s);
  out.tintAmount = THREE.MathUtils.lerp(a.tintAmount, b.tintAmount, s);
  return out;
}

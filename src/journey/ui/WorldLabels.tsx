import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { WORLD_LABELS } from '../chapters';
import { envelope, journey, onJourneyFrame } from '../journeyStore';
import { LAYER_DISTANCE, imageToWorld } from '../layout';

/**
 * HUD callouts pinned to things in the world (crystals, RARI, the star-core).
 * Each frame their 3D anchor is projected through the journey camera, so they slide,
 * grow and leave the screen exactly with the object they describe.
 */
export function WorldLabels() {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const anchors = useMemo(
    () => WORLD_LABELS.map((l) => imageToWorld(l.x, l.y, LAYER_DISTANCE[l.layer] - 0.3)),
    [],
  );

  useEffect(() => {
    const v = new THREE.Vector3();
    return onJourneyFrame((t) => {
      const cam = journey.camera;
      const w = window.innerWidth;
      const h = window.innerHeight;
      WORLD_LABELS.forEach((l, i) => {
        const el = refs.current[i];
        if (!el) return;
        const a = cam ? envelope(t, l.from, l.to, 0.008) : 0;
        if (a <= 0.001 || !cam) {
          if (el.style.visibility !== 'hidden') el.style.visibility = 'hidden';
          return;
        }
        v.copy(anchors[i]).project(cam);
        if (v.z > 1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2) {
          el.style.visibility = 'hidden';
          return;
        }
        el.style.visibility = 'visible';
        el.style.opacity = a.toFixed(3);
        el.style.transform = `translate3d(${((v.x * 0.5 + 0.5) * w).toFixed(1)}px, ${((-v.y * 0.5 + 0.5) * h).toFixed(1)}px, 0)`;
      });
    });
  }, [anchors]);

  return (
    <div className="world-labels" aria-hidden>
      {WORLD_LABELS.map((l, i) => (
        <div
          key={l.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="world-label"
          style={{ ['--c' as string]: l.color, visibility: 'hidden' }}
        >
          <span className="world-label__dot" />
          <span className="world-label__line" />
          <span className="world-label__text">
            <b>{l.title}</b>
            <small>{l.sub}</small>
          </span>
        </div>
      ))}
    </div>
  );
}

import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useDeferredMount } from '../hooks/useDeferredMount';
import { useInView } from '../hooks/useInView';
import { useReducedMotion } from '../hooks/useReducedMotion';
import type { HeroTextures } from '../lib/heroAssets';
import '../lib/smoothScroll';
import { ANCHORS } from './chapters';
import { journey } from './journeyStore';
import { ChapterIndicator } from './ui/ChapterIndicator';
import { StoryOverlay } from './ui/StoryOverlay';
import { WorldLabels } from './ui/WorldLabels';
import './Journey.css';

const JourneyCanvas = lazy(() => import('./JourneyCanvas'));

/**
 * Everything after the hero: ONE continuous camera shot through one world.
 * The section is just a long scroll track; a sticky stage holds the WebGL world and the
 * overlays, and scroll progress becomes the camera's destination (journeyStore).
 * It starts underneath the hero (negative margin), so the hero dissolves straight into it.
 */
export function Journey({ textures }: { textures: HeroTextures | null }) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const mounted = useDeferredMount(ref, 500);
  const inView = useInView(ref, '0px');
  // the stage sits under the hero: no point rendering until the hero starts to leave
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const st = ScrollTrigger.create({
      trigger: el,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: (self) => {
        journey.target = self.progress;
        const l = self.progress > 0.002;
        setLive((v) => (v === l ? v : l));
      },
      onRefresh: (self) => {
        // the hero's portal push spans exactly one viewport of scroll
        journey.introEnd = window.innerHeight / Math.max(self.end - self.start, 1);
      },
      onToggle: (self) => {
        journey.visible = self.isActive;
      },
    });
    journey.target = st.progress;
    journey.visible = st.isActive;
    return () => st.kill();
  }, []);

  return (
    <section id="journey" ref={ref} className="journey" aria-label="The journey: from the dying Earth to the living planet and back">
      {Object.entries(ANCHORS).map(([id, t]) => (
        <span key={id} id={id} className="journey__anchor" style={{ ['--at' as string]: t }} aria-hidden />
      ))}
      <div className="journey__stage">
        {mounted && textures && (
          <Suspense fallback={null}>
            <JourneyCanvas textures={textures} active={inView && live} motion={reduced ? 0 : 1} />
          </Suspense>
        )}
        <div className="journey__vignette" aria-hidden />
        <WorldLabels />
        <StoryOverlay />
      </div>
      <ChapterIndicator />
    </section>
  );
}

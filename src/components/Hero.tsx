import { lazy, Suspense, useEffect, useMemo, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { HERO } from '../config/content';
import { computeHeroFrame, PORTAL } from '../config/heroLayout';
import { getQuality } from '../config/quality';
import { useHeroFrame } from '../hooks/useHeroFrame';
import { useInView } from '../hooks/useInView';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { journey } from '../journey/journeyStore';
import { journeyTimeToY } from '../journey/scrollTo';
import { HERO_ASSETS, type HeroTextures } from '../lib/heroAssets';
import { isAutoScrolling, jumpToY } from '../lib/smoothScroll';
import { charsIn, splitChars } from '../lib/textFx';
import { HeroHud } from './HeroHud';
import { RingedPlanet } from './Icons';
import { WaitlistButton } from './WaitlistButton';
import './Hero.css';

gsap.registerPlugin(ScrollTrigger);

const CosmicScene = lazy(() => import('./CosmicScene'));

function supportsWebGL() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

interface Props {
  textures: HeroTextures | null;
  /** true once the loader has finished: plays the entrance */
  revealed: boolean;
}

export function Hero({ textures, revealed }: Props) {
  const ref = useRef<HTMLElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const frame = useHeroFrame(ref);
  const active = useInView(ref, '0px', true);
  const reduced = useReducedMotion();
  const quality = getQuality();
  const webgl = useMemo(supportsWebGL, []);

  useEffect(() => {
    const root = ref.current;
    if (!revealed || reduced || !root) return;
    const ctx = gsap.context(() => {
      // ---- entrance: title letters rise out of their words, the rest follows
      const lines = gsap.utils.toArray<HTMLElement>('.hero__title-line');
      const chars = lines.flatMap((l) => splitChars(l).chars);
      gsap.set('.hero__title', { autoAlpha: 1 });
      charsIn(chars, 0.05);
      gsap.from('.hero__o', { scale: 0.4, rotate: -40, opacity: 0, duration: 1.6, ease: 'expo.out', delay: 0.25 });
      gsap.from('[data-hero-in]', {
        opacity: 0,
        y: 26,
        duration: 1.2,
        ease: 'power3.out',
        stagger: 0.08,
        delay: 0.45,
      });

      // ---- exit, scrubbed to the scroll. The hero is held in place while the camera
      //      pushes into the portal — the link between the worlds. Its light swells to
      //      fill the screen, and the journey opens inside that same flash (see
      //      StoryOverlay), pulling back from the dying Earth. The ending mirrors it.
      // (portrait crops can leave the portal off-screen: push towards the nearest
      //  on-screen point in its direction, so the move never slides sideways)
      const portalPx = () => {
        const f = computeHeroFrame(root.clientWidth, root.clientHeight);
        const w = root.clientWidth;
        const h = root.clientHeight;
        const x = Math.min(Math.max(f.originX + PORTAL.cx * f.scale, w * 0.12), w * 0.88);
        const y = Math.min(Math.max(f.originY + PORTAL.cy * f.scale, h * 0.15), h * 0.85);
        return { x, y, ox: f.originX, oy: f.originY };
      };
      gsap.set('.hero__stage', { transformOrigin: () => `${portalPx().x}px ${portalPx().y}px` });
      // the plate is positioned at the frame origin: same screen point, plate-relative
      gsap.set('.hero__plate', {
        transformOrigin: () => `${portalPx().x - portalPx().ox}px ${portalPx().y - portalPx().oy}px`,
      });
      gsap.set(['.hero__rift', '.hero__streaks'], { left: () => portalPx().x, top: () => portalPx().y });
      gsap.set(root, { '--rift-x': () => `${portalPx().x}px`, '--rift-y': () => `${portalPx().y}px` });

      const exit = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: {
          trigger: root,
          start: 'top top',
          end: '+=100%',
          scrub: true,
          pin: true,
          pinSpacing: false,
          invalidateOnRefresh: true,
        },
      });
      exit
        // the copy and HUD clear first, so the push reads as one camera move
        .to('.hero__cue', { opacity: 0, duration: 0.06 }, 0)
        .to('.hud', { opacity: 0, duration: 0.18 }, 0)
        .to(
          ['.hero__title-line--1', '.hero__title-line--2', '.hero__body'],
          { y: -60, opacity: 0, filter: 'blur(6px)', stagger: 0.04, duration: 0.22 },
          0,
        )
        .to('.hero__scrim', { opacity: 0, duration: 0.25 }, 0)
        // the push: slow at first, accelerating into the core
        .to(['.hero__stage', '.hero__plate'], { scale: 4.5, duration: 0.85, ease: 'power2.in' }, 0)
        // streaks rushing out of the core: we are travelling into the rift
        .fromTo('.hero__streaks', { opacity: 0, scale: 0.4 }, { opacity: 1, scale: 1.6, duration: 0.6, ease: 'power1.in' }, 0.2)
        .to('.hero__streaks', { opacity: 0, duration: 0.15 }, 0.8)
        // the portal's light swells until it is the whole frame
        .fromTo('.hero__rift', { scale: 0.15, opacity: 0 }, { scale: 3.5, opacity: 0.9, duration: 0.55, ease: 'power1.in' }, 0.1)
        .to('.hero__rift', { scale: 16, opacity: 1, duration: 0.3, ease: 'power2.in' }, 0.65)
        .to('.hero__vignette', { opacity: 1, duration: 0.6 }, 0.15)
        // hand-off: the journey's own flash is already full here
        .to(root, { autoAlpha: 0, duration: 0.06 }, 0.94);

      // ---- the hand-off is a jump, not a scrub: the first nudge down plays the whole
      //      push in one quick timed move and lands on the cleared Earth shot; nudging up
      //      from anywhere inside it returns to the hero the same way. No in-between rest.
      const landY = () => journeyTimeToY(journey.introEnd + 0.035);
      const jump = (y: number) => {
        journey.fast = true;
        jumpToY(y, 0.75, () => {
          journey.fast = false;
        });
      };
      ScrollTrigger.create({
        start: 0,
        end: landY,
        onUpdate: (self) => {
          if (isAutoScrolling()) return;
          const y = self.scroll();
          const land = landY();
          if (y <= 1 || y >= land - 1) return;
          jump(self.direction > 0 ? land : 0);
        },
      });
    }, root);
    return () => ctx.revert();
  }, [revealed, reduced]);

  return (
    <section id="top" ref={ref} className="hero" aria-labelledby="hero-title">
      {/* static painting: first paint, no-WebGL fallback and loading backdrop */}
      <img className="hero__plate" src={HERO_ASSETS.plate} alt="" aria-hidden decoding="async" fetchPriority="high" />

      {webgl && textures && (
        <Suspense fallback={null}>
          <div className="hero__stage">
            <CosmicScene textures={textures} frame={frame} active={active} />
          </div>
        </Suspense>
      )}

      <div className="hero__scrim" aria-hidden />
      <div className="hero__vignette" aria-hidden />
      <div className="hero__streaks" aria-hidden />
      <div className="hero__rift" aria-hidden />
      {quality.hud && <HeroHud active={active && revealed} scale={frame.scale} motion={reduced ? 0 : 1} />}

      <div ref={copyRef} className="hero__copy">
        <h1 id="hero-title" className="hero__title" aria-label="Beyond the Dying Earth">
          <span className="hero__title-line hero__title-line--1" aria-hidden>
            BEY
            <span className="hero__o">
              <span className="hero__o-star" />
              <RingedPlanet className="hero__o-planet" />
            </span>
            ND
          </span>
          <span className="hero__title-line hero__title-line--2" aria-hidden>
            <span className="hero__the">The</span>
            <span className="gradient-text">Dying Earth</span>
          </span>
        </h1>

        <div className="hero__body">
          <p className="hero__tagline" data-hero-in>
            {HERO.tagline}
          </p>
          <p className="hero__desc" data-hero-in>
            {HERO.description.map((line) => (
              <span key={line}>{line} </span>
            ))}
          </p>
          <div className="hero__form" data-hero-in>
            <WaitlistButton source="hero" />
          </div>
        </div>
      </div>

      <a className="hero__cue" href="#story">
        <span>Scroll to descend</span>
        <i aria-hidden />
      </a>
    </section>
  );
}

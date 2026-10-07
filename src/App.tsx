import { useCallback, useEffect, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Footer } from './components/Footer';
import { Hero } from './components/Hero';
import { Loader } from './components/Loader';
import { Navigation } from './components/Navigation';
import { WaitlistDialog } from './components/WaitlistDialog';
import { Journey } from './journey/Journey';
import { loadHeroTextures, offHeroProgress, type HeroTextures } from './lib/heroAssets';
import { initSmoothScroll, setScrollLocked } from './lib/smoothScroll';

export default function App() {
  const [textures, setTextures] = useState<HeroTextures | null>(null);
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    let alive = true;
    const onProgress = (p: number) => alive && setProgress(p * 0.92);
    document.body.classList.add('is-loading');
    initSmoothScroll();
    setScrollLocked(true);

    Promise.all([
      loadHeroTextures(onProgress),
      // warm the WebGL chunk in parallel with the textures
      import('./components/CosmicScene'),
      document.fonts?.ready ?? Promise.resolve(),
    ])
      .then(([tex]) => alive && setTextures(tex))
      .catch((err) => console.warn('[hero] falling back to the static artwork', err))
      .finally(() => alive && setReady(true));

    return () => {
      alive = false;
      offHeroProgress(onProgress);
    };
  }, []);

  const onLoaderDone = useCallback(() => {
    setRevealed(true);
    document.body.classList.remove('is-loading');
    setScrollLocked(false);
    requestAnimationFrame(() => ScrollTrigger.refresh());
  }, []);

  return (
    <>
      <a className="skip-link" href="#story">
        Skip to content
      </a>
      {!revealed && <Loader progress={progress} ready={ready} onDone={onLoaderDone} />}
      <Navigation />
      <main>
        <Hero textures={textures} revealed={revealed} />
        <Journey textures={textures} />
      </main>
      <Footer />
      <WaitlistDialog ready={revealed} />
    </>
  );
}

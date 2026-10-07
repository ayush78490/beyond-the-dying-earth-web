# Beyond the Dying Earth — landing page

Cinematic, animated landing page for **Beyond the Dying Earth** (Astrion).
React + TypeScript + Vite, Three.js via @react-three/fiber, GSAP ScrollTrigger.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check + production build into dist/
npm run assets     # re-bake hero assets from art/hero-source.png (Python 3 + opencv-python + numpy)
```

## How the hero works

The supplied key art (`art/hero-source.png`) is the source of truth. It is **not** redrawn:
`tools/prepare_hero.py` prepares it once, and a shader brings it to life.

| File (public/assets) | Contents |
| --- | --- |
| `hero-plate.webp` | The key art with its baked-in typography/UI removed (real HTML text sits on top) |
| `hero-maps-a.png` | R depth · G waterfalls · B lake |
| `hero-maps-b.png` | R clouds · G capes/hair · B emissive lights |
| `hero-maps-c.png` | R planet surface · G rings · B characters (GrabCut silhouettes) |

`src/shaders/backdrop.frag` re-samples the painting each frame through masked motion fields:
depth parallax, flowing waterfalls + lake ripples (`water.glsl`), the planet turning in sphere
space (`planet.glsl`, one apparent revolution per 150 s), bobbing/rotating floating rocks,
drifting clouds, cape/hair sway, breathing, star twinkle, valley fog and rim light.
Overlays add the portal (rings, arcs, inflow particles, periodic surge + shockwave), atmosphere,
waterfall mist, armour lights and cosmic dust.

All hero coordinates live in `src/config/heroLayout.ts` and mirror `tools/prepare_hero.py`.
**If the key art changes, re-measure both and run `npm run assets`.**

### Character cut-outs
The painted Astrion are already animated. To layer separate transparent PNG/WebP cut-outs on
top, list them in `src/config/characters.ts`.

## The journey (everything after the hero)

One continuous camera shot through one WebGL world (`src/journey/`), not a stack of sections:

- **Scroll = camera.** `Journey.tsx` is a ~1400vh scroll track (1000vh on phones) with a sticky
  stage. ScrollTrigger progress becomes the camera's *target*; `CameraRig` eases towards it
  (heavy, cinematic) along Catmull-Rom splines keyed in `chapters.ts`, plus a small mouse offset.
- **One world.** Earth (procedural globe, ash, healing energy) sits at the origin; stars, nebula
  banks, debris and small planets fill the route; the alien world waits at the end of it.
- **The alien world is the key art, in 3D.** `tools/prepare_journey.py` cuts the painting into
  depth layers (sky, planet, castle/portal, cliffs/waterfalls, foreground, Astrion) with hidden
  areas filled and frames extended. Each layer is a card placed at its own depth so that from the
  canonical viewpoint they recompose the painting exactly; anywhere else they separate with real
  parallax. `shaders/diorama.frag` reuses the hero's masks, so waterfalls, capes, clouds, crystals
  and the turning planet keep animating at any distance.
- **Continuity.** The ringed planet is visible from deep space; the portal is a beacon on the
  horizon long before you reach it; the Solguardian rises from behind the castle; the colour of
  the universe (`PALETTE`) shifts from rust to violet/cyan to the healed Earth's blues gradually.
- **Story** text, world-anchored HUD callouts, the chapter rail and the portal flash are DOM
  overlays driven by the same journey time. Edit beats, chapters, labels and camera keys in
  `src/journey/chapters.ts`.

```bash
python tools/prepare_journey.py   # re-cut the diorama layers + paint the Solguardian
```

## Waitlist (X + Robinhood Chain wallet → Supabase)
"Join the waitlist" opens a two-stage card: **Continue with X**, then **Connect your wallet**.
X sign-in is Supabase Auth's X / Twitter (OAuth 2.0) provider (a page redirect). The wallet is
moved onto Robinhood Chain (added to the wallet if needed) and signs a message linking it to the
X account; the row is written straight to `public.waitlist` with the anon key.

Security lives in the database (`supabase/migrations`): RLS lets a signed-in user read/write only
their own row, and a trigger copies `x_id` / `x_username` / `x_name` / `x_avatar` from
`auth.users`, so the browser only supplies the wallet, its signature and the source.

Setup:
1. Run both files in `supabase/migrations` in the SQL editor (in order).
2. X developer portal → app → *User authentication settings*: OAuth 2.0, **Web App**, callback
   `https://<project-ref>.supabase.co/auth/v1/callback`, and enable *Request email from users*.
3. Supabase → Authentication → Sign In / Providers → **X / Twitter (OAuth 2.0)**: enable, paste the
   X Client ID + Client Secret.
4. Supabase → Authentication → URL Configuration: Site URL = your site; add
   `http://localhost:5174/**` (and your production URL) to Redirect URLs.
5. `.env`: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (see `.env.example`).

Without the Supabase values the dev server simulates the X sign-in and keeps signups in
`localStorage`. Read signups in the dashboard: Table editor → `waitlist`.

## Performance
- Quality tier per device (`src/config/quality.ts`; force with `?quality=low|medium|high`):
  DPR caps, particle counts, shader detail. Adaptive DPR drops resolution if FPS falls below ~47.
- Canvas resolution is also capped to what the 1672 px artwork can resolve.
- Noise comes from a precomputed tileable texture, and the Earth's terrain is baked once
  to a render target, which keeps the hero at 60 fps on integrated GPUs.
- WebGL scenes are lazy-loaded, mounted only near the viewport, and paused when off-screen.
- `prefers-reduced-motion`: still frames, no parallax, no reveal animations.
- Dev only: `?off=portal,dust,mist,character,planet,backdrop,adaptive` disables layers for profiling.

## Structure
```
src/
  components/      Hero, Navigation, Loader, WaitlistForm, HeroHud, DyingEarthSection,
                   ResourceSystem, GameplaySection, EconomySection, FinalCTA, Footer,
                   CosmicScene, EarthGlobe, DyingEarthScene, RestorationScene
  components/scene HeroBackdrop, AnimatedPlanet, WaterfallShader, Portal, Character,
                   CosmicDust, ParallaxLayer, AdaptiveDpr
  hooks/           useParallax, useReducedMotion, useScrollProgress, useInView, useHeroFrame, useReveal
  shaders/         GLSL (backdrop, water, planet, portal, atmosphere, earth, particles…)
  config/          heroLayout, quality, content (all page copy), characters
tools/prepare_hero.py
```

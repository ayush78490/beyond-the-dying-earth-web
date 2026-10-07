// The living painting.
// Samples the supplied artwork through a stack of small, masked displacement fields
// (depth parallax, water, cloth, rocks, clouds, breathing) and layers light on top.
// Masks/depth are baked by tools/prepare_hero.py:
//   A: r depth  g waterfall  b lake
//   B: r cloud  g cloth/hair b emissive
//   C: r planet surface      g ring      b characters

uniform sampler2D uPlate;
uniform sampler2D uMapA;
uniform sampler2D uMapB;
uniform sampler2D uMapC;
uniform vec2 uImage;
uniform float uTime;
uniform float uMotion;        // 0 = reduced motion (static), 1 = alive
uniform float uDetail;        // 0 = mobile path, 1 = full
uniform vec2 uParallax;       // pointer offset in image px for depth = 1
uniform vec4 uRocks[16];      // cx, cy, rx, ry
uniform vec4 uBreath[2];      // xMin, xMax, feetY, phase
uniform vec3 uPlanet;         // cx, cy, r
uniform float uPlanetSpin;    // accumulated longitude (rad)
uniform vec3 uPortal;         // cx, cy, r
uniform float uPortalCharge;  // 0..1 during the portal's energy surge

varying vec2 vPx;
varying vec2 vScreen;

vec2 plateUV(vec2 p) { return p / uImage; }

//#pragma water
//#pragma planet

float depthAt(vec2 p) {
  return texture(uMapA, clamp(p / uImage, 0.0, 1.0)).r;
}

void main() {
  float t = uTime;
  vec2 px = vPx;

  // ---- depth parallax (two fixed-point steps keep silhouettes stable)
  float d = depthAt(px);
  vec2 shift = uParallax * (0.12 + 0.88 * d);
  d = depthAt(px - shift);
  shift = uParallax * (0.12 + 0.88 * d);
  vec2 p = px - shift;

  vec2 pc = vec2(clamp(p.x, 0.5, uImage.x - 0.5), clamp(p.y, 0.5, uImage.y - 0.5));
  vec2 uv = pc / uImage;
  vec4 A = texture(uMapA, uv);
  vec4 B = texture(uMapB, uv);
  vec4 C = texture(uMapC, uv);

  // ---- motion fields: `off` moves the painted content (we sample at p - off)
  vec2 off = vec2(0.0);

  // floating rocks: independent bob + tiny rotation, the sky around them follows softly
  if (p.x > 920.0 && p.y < 500.0) for (int i = 0; i < 16; i++) {
    vec4 r = uRocks[i];
    vec2 rel = p - r.xy;
    float e = length(rel / r.zw);
    float w = 1.0 - smoothstep(0.9, 1.7, e);
    if (w <= 0.0) continue;
    float fi = float(i);
    float size = 1.2 + r.w * 0.045;
    vec2 bob = vec2(sin(t * 0.29 + fi * 1.7) * 0.35, sin(t * 0.41 + fi * 2.39)) * size;
    float ang = sin(t * 0.16 + fi * 0.9) * 0.018;
    vec2 rot = vec2(rel.x * cos(ang) - rel.y * sin(ang), rel.x * sin(ang) + rel.y * cos(ang)) - rel;
    off += w * (bob + rot);
  }

  // clouds: slow domain warp (no translation, so the masked area never slides away)
  if (uDetail > 0.5 && B.r > 0.01) {
    vec2 q = p / 900.0;
    float n1 = tfbm2(q, t * 0.35);
    float n2 = tfbm2(q + vec2(0.43, 0.61), t * 0.35 + 17.0);
    off += (vec2(n1, n2) - 0.5) * 16.0 * B.r;
  }

  // capes + hair: travelling wave towards the free end, with gusts
  if (B.g > 0.005) {
    float gust = 0.75 + 0.25 * sin(t * 0.21) + 0.15 * sin(t * 0.67 + 1.0);
    float ph = t * 1.35 + p.x * 0.02 + sin(t * 0.53) * 1.1;
    off += B.g * gust * vec2(sin(ph) * 4.0, cos(ph * 0.85 + 0.6) * 3.2);
  }

  // breathing: a tiny vertical scale around each character's feet
  for (int k = 0; k < 2; k++) {
    vec4 b = uBreath[k];
    float inX = smoothstep(b.x - 30.0, b.x + 10.0, p.x) * (1.0 - smoothstep(b.y - 10.0, b.y + 30.0, p.x));
    float lift = max(b.z - p.y, 0.0);
    float breath = sin(t * 1.4 + b.w);
    off.y -= C.b * inX * lift * 0.0042 * breath;
    off.x += C.b * inX * lift * 0.0011 * sin(t * 0.47 + b.w);
  }

  // portal: faint gravitational lensing around the ring
  vec2 dp = p - uPortal.xy;
  float pr = length(dp);
  float lens = 1.0 - smoothstep(0.0, uPortal.z * 2.4, pr);
  if (lens > 0.0) {
    float ang = lens * lens * (0.16 * sin(t * 0.8) + 0.22 * uPortalCharge);
    off += vec2(dp.x * cos(ang) - dp.y * sin(ang), dp.x * sin(ang) + dp.y * cos(ang)) - dp;
    off += dp * lens * 0.05 * (sin(t * 1.1) + uPortalCharge * 1.5);
  }

  // waterfalls + lake
  float hl = 0.0, foam = 0.0, sparkle = 0.0;
  if (A.g > 0.01) off += waterfallFlow(p, A.g, t, hl, foam);
  if (A.b > 0.01) off += lakeFlow(p, A.b, t, sparkle);

  off *= uMotion;

  // ---- sample the painting
  vec2 ps = p - off;
  vec2 uvs = vec2(clamp(ps.x, 0.5, uImage.x - 0.5), clamp(ps.y, 0.5, uImage.y - 0.5)) / uImage;
  vec3 col = texture(uPlate, uvs).rgb;

  // planet surface turns (detail moves, painted light stays)
  if (C.r > 0.01) col = rotatePlanet(ps, col, C.r * uMotion);

  // ---- light layers
  // water: streak highlights, darker troughs, subtle shimmer
  col = mix(col, col * 0.86, A.g * (1.0 - hl) * 0.35);
  col += vec3(0.78, 0.9, 1.0) * hl * 0.42 * uMotion;
  col += vec3(0.85, 0.9, 1.0) * A.g * foam * 0.08;
  col += vec3(1.0, 0.82, 1.0) * sparkle * 0.85 * uMotion;
  col *= 1.0 + A.b * 0.05 * sin(ps.y * 0.9 - t * 2.0) * uMotion;

  // planet rings: slow orbiting glints
  if (C.g > 0.01) {
    float glint = pow(0.5 + 0.5 * sin(ps.x * 0.045 - t * 0.55 + sin(ps.y * 0.1) * 1.5), 6.0);
    col += C.g * vec3(0.6, 0.75, 1.0) * 0.16 * glint * uMotion;
  }

  // emissive lights: breathing glow with a little electrical flicker
  if (B.b > 0.01) {
    float phase = vnoise(ps * 0.02) * 6.2831;
    float pulse = 0.5 + 0.5 * sin(t * 1.6 + phase);
    float flick = vnoise(vec2(t * 7.0, phase * 3.0));
    col += col * B.b * (pulse * 0.4 + flick * 0.18 - 0.1) * uMotion;
  }

  // character rim light from the sunset behind the valley
  if (C.b > 0.01) {
    float rimSrc = texture(uMapC, clamp((ps + vec2(5.0, 1.0)) / uImage, 0.0, 1.0)).b;
    float rim = clamp(C.b - rimSrc, 0.0, 1.0);
    col += rim * vec3(1.0, 0.45, 0.75) * (0.22 + 0.06 * sin(t * 0.9));
  }

  // sky: twinkle the painted stars + sprinkle faint procedural ones
  float skyMask = (1.0 - smoothstep(0.015, 0.06, d)) * (1.0 - smoothstep(0.1, 0.3, luma(col)));
  if (skyMask > 0.01) {
    vec3 soft = textureLod(uPlate, uvs, 2.0).rgb;
    float starness = max(0.0, luma(col) - luma(soft) - 0.05);
    float tw = sin(t * 2.2 + hash12(floor(ps / 3.0)) * 40.0);
    col += col * starness * skyMask * tw * 1.4 * uMotion;
    if (uDetail > 0.5) {
      vec2 cell = floor(p / 9.0);
      float h = hash12(cell);
      if (h > 0.965) {
        vec2 f = fract(p / 9.0) - 0.5;
        vec2 o = (vec2(hash12(cell + 3.1), hash12(cell + 7.7)) - 0.5) * 0.6;
        float twk = 0.55 + 0.45 * sin(t * (0.8 + h * 3.0) + h * 50.0);
        col += vec3(0.75, 0.82, 1.0) * smoothstep(0.13, 0.0, length(f - o)) * twk * skyMask * 0.55;
      }
    }
  }

  // low valley fog drifting between the cliffs
  if (uDetail > 0.5) {
    float band = smoothstep(560.0, 690.0, p.y) * (1.0 - smoothstep(800.0, 930.0, p.y));
    if (band > 0.0) {
      float fog = tfbm2(p / vec2(1000.0, 400.0), t * 0.5);
      col += vec3(0.5, 0.33, 0.85) * band * smoothstep(0.45, 0.85, fog) * 0.13 * (1.0 - C.b);
    }
  }

  // ---- portrait layouts: synthesise deep sky above the painting
  if (p.y < 0.0) {
    vec3 top = textureLod(uPlate, vec2(uv.x, 0.004), 3.0).rgb;
    float k = clamp(-p.y / 520.0, 0.0, 1.0);
    vec3 deep = mix(vec3(0.03, 0.035, 0.09), vec3(0.008, 0.01, 0.035), k);
    col = mix(top, deep, smoothstep(0.0, 1.0, k));
    vec2 cell = floor(p / 7.0);
    float h = hash12(cell);
    if (h > 0.955) {
      vec2 f = fract(p / 7.0) - 0.5;
      float twk = 0.5 + 0.5 * sin(t * (0.7 + h * 2.0) * uMotion + h * 40.0);
      col += vec3(0.8, 0.85, 1.0) * smoothstep(0.14, 0.0, length(f)) * twk * 0.8;
    }
    // faint nebula so the extension is not a flat fill
    float neb = tfbm(p / 1000.0 + vec2(t * 0.002, 0.0));
    col += vec3(0.25, 0.1, 0.4) * smoothstep(0.45, 0.8, neb) * 0.25 * (1.0 - k * 0.5);
  }

  // ---- grade: soft vignette + film grain
  vec2 sv = vScreen - 0.5;
  col *= 1.0 - dot(sv, sv) * 0.42;
  col += (hash12(gl_FragCoord.xy + fract(t * 7.0) * 113.0) - 0.5) * 0.02;

  gl_FragColor = vec4(col, 1.0);
}

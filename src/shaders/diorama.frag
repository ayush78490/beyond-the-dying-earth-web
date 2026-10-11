// One depth layer of the key-art diorama, living.
// The card covers a crop of the source image (uRect, image px). All motion fields
// come from the same hero maps (full image space), so a waterfall flows, a cape sways
// and the planet turns exactly as in the hero — just at whatever distance the
// journey camera happens to be. Feature switches are compile-time defines per layer.

uniform sampler2D uPlate;     // this layer's RGBA texture (cropped to uRect)
uniform sampler2D uMapA;      // r depth  g waterfall  b lake
uniform sampler2D uMapB;      // r cloud  g sway       b emissive
uniform sampler2D uMapC;      // r planet g ring       b characters
uniform vec2 uImage;
uniform vec4 uRect;           // x, y, w, h (image px) covered by the card
uniform vec4 uTexRect;        // x, y, w, h (image px) covered by uPlate
uniform float uTime;
uniform float uMotion;
uniform float uOpacity;
uniform vec3 uTint;           // ambient light of the current environment
uniform float uTintAmount;
uniform float uShade;         // 0..1 terminator shading (planet seen from space)
uniform vec4 uRocks[16];
uniform vec4 uBreath[2];
uniform vec3 uPlanet;
uniform float uPlanetSpin;
uniform vec3 uPortal;
uniform float uPortalCharge;
uniform vec2 uBand;           // depth band this layer owns (x: lo, y: hi); x < 0 => use character mask
uniform vec3 uHaze;           // colour of revealed (filled) areas

varying vec2 vUv;

vec2 plateUV(vec2 p) { return (p - uTexRect.xy) / uTexRect.zw; }

//#pragma water
//#pragma planet

void main() {
  float t = uTime;
  vec2 p = uRect.xy + vec2(vUv.x, 1.0 - vUv.y) * uRect.zw;   // source-image px
  vec2 uvImg = clamp(p / uImage, 0.0, 1.0);
  // the extended margins (mirrored past the frame) carry no motion masks
  float inside = step(0.0, p.x) * step(p.x, uImage.x) * step(0.0, p.y) * step(p.y, uImage.y);
  vec4 A = texture(uMapA, uvImg) * inside;
  vec4 B = texture(uMapB, uvImg) * inside;
  vec4 C = texture(uMapC, uvImg) * inside;
  // does this pixel belong to this layer, or is it fill behind a nearer layer?
  float own = uBand.x < 0.0
    ? C.b
    : smoothstep(uBand.x - 0.02, uBand.x + 0.01, A.r) * (1.0 - smoothstep(uBand.y - 0.01, uBand.y + 0.02, A.r));
  own *= inside;
  A.gb *= own;
  B *= own;
  vec2 off = vec2(0.0);

#ifdef ROCKS
  if (p.x > 920.0 && p.y < 500.0) for (int i = 0; i < 16; i++) {
    vec4 r = uRocks[i];
    vec2 rel = p - r.xy;
    float w = 1.0 - smoothstep(0.9, 1.7, length(rel / r.zw));
    if (w <= 0.0) continue;
    float fi = float(i);
    float size = 1.2 + r.w * 0.045;
    vec2 bob = vec2(sin(t * 0.29 + fi * 1.7) * 0.35, sin(t * 0.41 + fi * 2.39)) * size;
    float ang = sin(t * 0.16 + fi * 0.9) * 0.018;
    vec2 rot = vec2(rel.x * cos(ang) - rel.y * sin(ang), rel.x * sin(ang) + rel.y * cos(ang)) - rel;
    off += w * (bob + rot);
  }
#endif

#ifdef CLOUDS
  if (B.r > 0.01) {
    vec2 q = p / 900.0;
    off += (vec2(tfbm2(q, t * 0.35), tfbm2(q + vec2(0.43, 0.61), t * 0.35 + 17.0)) - 0.5) * 16.0 * B.r;
  }
#endif

#ifdef SWAY
  if (B.g > 0.005) {
    float gust = 0.75 + 0.25 * sin(t * 0.21) + 0.15 * sin(t * 0.67 + 1.0);
    float ph = t * 1.35 + p.x * 0.02 + sin(t * 0.53) * 1.1;
    off += B.g * gust * vec2(sin(ph) * 4.0, cos(ph * 0.85 + 0.6) * 3.2);
  }
  for (int k = 0; k < 2; k++) {
    vec4 b = uBreath[k];
    float inX = smoothstep(b.x - 30.0, b.x + 10.0, p.x) * (1.0 - smoothstep(b.y - 10.0, b.y + 30.0, p.x));
    float lift = max(b.z - p.y, 0.0);
    off.y -= C.b * inX * lift * 0.0042 * sin(t * 1.4 + b.w);
  }
#endif

#ifdef PORTAL_LENS
  vec2 dp = p - uPortal.xy;
  float lens = 1.0 - smoothstep(0.0, uPortal.z * 2.4, length(dp));
  if (lens > 0.0) {
    float ang = lens * lens * (0.16 * sin(t * 0.8) + 0.22 * uPortalCharge);
    off += vec2(dp.x * cos(ang) - dp.y * sin(ang), dp.x * sin(ang) + dp.y * cos(ang)) - dp;
  }
#endif

  float hl = 0.0, foam = 0.0, sparkle = 0.0;
#ifdef WATER
  if (A.g > 0.01) off += waterfallFlow(p, A.g, t, hl, foam);
  if (A.b > 0.01) off += lakeFlow(p, A.b, t, sparkle);
#endif

  off *= uMotion;
  vec2 ps = p - off;
  vec4 texel = texture(uPlate, clamp(plateUV(ps), 0.0, 1.0));

  // Portrait screens see far past the painting's top and bottom edges, where the plates
  // only hold stretched edge pixels. Replace them, as the hero does: deep sky above...
  float synth = 0.0;
#ifdef SKY_EXT
  if (p.y < 0.0) {
    vec3 top = textureLod(uPlate, clamp(plateUV(vec2(ps.x, 6.0)), 0.0, 1.0), 7.0).rgb;
    float k = clamp(-p.y / 320.0, 0.0, 1.0);
    vec3 deep = mix(vec3(0.03, 0.035, 0.09), vec3(0.008, 0.01, 0.035), k);
    vec3 sky = mix(top, deep, smoothstep(0.0, 1.0, k));
    vec2 cell = floor(p / 7.0);
    float h = hash12(cell);
    if (h > 0.955) {
      vec2 f = fract(p / 7.0) - 0.5;
      float twk = 0.5 + 0.5 * sin(t * (0.7 + h * 2.0) * uMotion + h * 40.0);
      sky += vec3(0.8, 0.85, 1.0) * smoothstep(0.14, 0.0, length(f)) * twk * 0.8;
    }
    float neb = tfbm(p / 1000.0 + vec2(t * 0.002, 0.0));
    sky += vec3(0.25, 0.1, 0.4) * smoothstep(0.45, 0.8, neb) * 0.25 * (1.0 - k * 0.5);
    synth = smoothstep(0.0, 90.0, -p.y);
    texel = mix(texel, vec4(sky, 1.0), synth);
  }
#endif
  // ...and the foreground's rock running on into shadow below
#ifdef GROUND_EXT
  if (p.y > uImage.y) {
    vec3 edge = textureLod(uPlate, clamp(plateUV(vec2(ps.x, uImage.y - 8.0)), 0.0, 1.0), 6.0).rgb;
    float k = clamp((p.y - uImage.y) / 280.0, 0.0, 1.0);
    vec3 ground = mix(edge * 0.8, vec3(0.018, 0.012, 0.035), smoothstep(0.0, 1.0, k));
    synth = smoothstep(0.0, 40.0, p.y - uImage.y);
    texel = mix(texel, vec4(ground, 1.0), synth);
  }
#endif
  float alpha = texel.a * uOpacity;
  if (alpha < 0.004) discard;
  vec3 col = texel.rgb;

#ifdef PLANET
  if (C.r > 0.01) col = rotatePlanet(ps, col, C.r * uMotion);
  if (C.g > 0.01) {
    float glint = pow(0.5 + 0.5 * sin(ps.x * 0.045 - t * 0.55 + sin(ps.y * 0.1) * 1.5), 6.0);
    col += C.g * vec3(0.6, 0.75, 1.0) * 0.16 * glint * uMotion;
  }
  // seen from space: lit from the upper right, night side falls into darkness
  vec2 rel = (p - uPlanet.xy) / uPlanet.z;
  float rr = dot(rel, rel);
  if (rr < 1.0) {
    vec3 N = vec3(rel.x, -rel.y, sqrt(1.0 - rr));
    float ndl = dot(N, normalize(vec3(0.62, 0.5, 0.6)));
    col *= mix(1.0, smoothstep(-0.25, 0.55, ndl) * 1.1 + 0.03, uShade);
    col += vec3(0.35, 0.55, 1.0) * pow(1.0 - N.z, 3.0) * 0.5 * uShade;
  }
#endif

#ifdef WATER
  col = mix(col, col * 0.86, A.g * (1.0 - hl) * 0.35);
  col += vec3(0.78, 0.9, 1.0) * hl * 0.42 * uMotion;
  col += vec3(0.85, 0.9, 1.0) * A.g * foam * 0.08;
  col += vec3(1.0, 0.82, 1.0) * sparkle * 0.85 * uMotion;
#endif

#ifdef GLOW
  if (B.b > 0.01) {
    float phase = vnoise(ps * 0.02) * 6.2831;
    float pulse = 0.5 + 0.5 * sin(t * 1.6 + phase);
    float flick = vnoise(vec2(t * 7.0, phase * 3.0));
    col += col * B.b * (pulse * 0.4 + flick * 0.18 - 0.1) * uMotion;
  }
#endif

#ifdef PLANET
  // the same night-side dusk the hero lays over the retouched title area
  // (limited to the retouched title area, so the lit side of the globe keeps its light)
  vec2 sq = (p - vec2(470.0, 250.0)) / vec2(430.0, 210.0);
  col *= 1.0 - 0.42 * (1.0 - smoothstep(0.3, 1.0, length(sq)));
#else
  // revealed fill (only seen when parallax opens a gap) reads as depth haze, not flat grey
  col = mix(col, uHaze, (1.0 - own) * 0.3 * (1.0 - synth));
#endif

  // the environment's light (violet haze in the rift, cool dawn on the way out)
  col = mix(col, col * uTint * 1.6, uTintAmount);

  gl_FragColor = vec4(col * alpha, alpha);   // premultiplied
}

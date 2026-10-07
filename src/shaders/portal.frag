// The fortress portal: a breathing energy core with counter-rotating rings,
// inflowing streaks, crackling arcs and a periodic surge that releases a shockwave.
// Drawn additively over the painted portal, so "black" means "no change".

uniform float uTime;
uniform float uMotion;
uniform float uCharge;   // 0..1 surge build-up
uniform float uWave;     // 0..1 shockwave radius progress, < 0 when idle
uniform float uRing;     // painted ring radius in quad units (-1..1 space)
uniform float uOpacity;

varying vec2 vUv;

float angDist(float a, float b) {
  float d = mod(a - b + 3.14159265, 6.2831853) - 3.14159265;
  return abs(d);
}

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  float r = length(p);
  float a = atan(p.y, p.x);
  float t = uTime * uMotion;
  float R0 = uRing;

  float breathe = 0.5 + 0.5 * sin(t * 1.15);
  float I = 0.7 + 0.25 * breathe + uCharge * 0.9;

  // core + bloom
  float core = exp(-r * r * 260.0) * 0.85 + exp(-r * 9.0) * 0.22;
  float halo = exp(-r * 3.2) * 0.15;

  // ring 1: the painted ring, re-lit with a slow travelling highlight
  float ring1 = exp(-pow((r - R0) / 0.018, 2.0)) * (0.55 + 0.45 * sin(a * 2.0 + t * 1.2));
  // ring 2: dashed, rotating the other way
  float dash2 = smoothstep(0.35, 0.65, 0.5 + 0.5 * sin(a * 9.0 - t * 0.85));
  float ring2 = exp(-pow((r - R0 * 1.42) / 0.01, 2.0)) * dash2;
  // ring 3: fine ticks, very slow
  float tick = step(0.55, fract(a / 6.2831853 * 36.0 + t * 0.05));
  float ring3 = exp(-pow((r - R0 * 1.9) / 0.007, 2.0)) * tick * 0.7;
  // ring 4: broken arc segments
  float seg = step(0.62, fract(a / 6.2831853 * 3.0 - t * 0.12));
  float ring4 = exp(-pow((r - R0 * 2.45) / 0.006, 2.0)) * seg * 0.45;

  // energy streaks flowing into the centre
  float s = vnoise(vec2(a * 5.0, r * 9.0 + t * 2.6));
  float streak = smoothstep(0.62, 0.95, s) * smoothstep(0.85, 0.25, r) * smoothstep(R0 * 0.6, R0 * 1.3, r);

  // electrical arcs: brief, jittery, re-seeded several times a second
  float arcs = 0.0;
  for (int k = 0; k < 3; k++) {
    float fk = float(k);
    float slot = floor(t * 5.0 + fk * 0.37);
    float on = step(0.55 - uCharge * 0.4, hash12(vec2(slot, fk * 13.0)));
    float base = hash12(vec2(slot, fk + 4.0)) * 6.2831853;
    float jitter = (vnoise(vec2(r * 22.0, slot + fk * 7.0)) - 0.5) * 0.7;
    float da = angDist(a, base + jitter);
    float reach = R0 * (1.6 + hash12(vec2(fk, slot)) * 1.4);
    arcs += on * exp(-da * r * 140.0) * step(R0 * 1.02, r) * (1.0 - smoothstep(reach * 0.7, reach, r));
  }

  // surge shockwave
  float wave = 0.0;
  if (uWave >= 0.0) {
    float wr = R0 + uWave * 0.82;
    wave = exp(-pow((r - wr) / (0.02 + uWave * 0.03), 2.0)) * (1.0 - uWave) * 1.4;
  }

  vec3 magenta = vec3(1.0, 0.28, 0.92);
  vec3 violet = vec3(0.62, 0.42, 1.0);
  vec3 hot = vec3(1.0, 0.88, 1.0);

  vec3 col = magenta * (ring1 * 1.1 + streak * 0.55 + halo) * I
           + violet * (ring2 * 0.8 + ring3 * 0.6 + ring4 * 0.6) * I
           + hot * core * I
           + hot * arcs * 0.85
           + mix(magenta, hot, 0.3) * wave;

  float fade = 1.0 - smoothstep(0.82, 1.0, r);
  gl_FragColor = vec4(col * fade * uOpacity, 1.0);
}

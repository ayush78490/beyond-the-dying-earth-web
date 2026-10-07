// A drifting nebula bank (billboard). Additive; colours from the journey palette.
uniform vec3 uNebA;
uniform vec3 uNebB;
uniform float uOpacity;
uniform float uTime;
uniform float uSeed;
varying vec2 vUv;

void main() {
  vec2 q = vUv - 0.5;
  float fall = 1.0 - smoothstep(0.1, 0.46, length(q));
  vec2 p = vUv * 1.6 + uSeed;
  float n = tfbm2(p, uTime * 0.06);
  float wisps = tfbm(p * 2.3 - vec2(uTime * 0.004, 0.0));
  float dens = smoothstep(0.38, 0.85, n * 0.7 + wisps * 0.4) * fall;
  vec3 col = mix(uNebA, uNebB, smoothstep(0.3, 0.8, wisps)) * dens;
  gl_FragColor = vec4(col * uOpacity, 1.0);
}

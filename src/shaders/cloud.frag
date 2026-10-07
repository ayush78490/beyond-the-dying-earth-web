// Atmospheric entry: a bank of violet cloud the camera flies through.
uniform float uOpacity;
uniform float uTime;
uniform float uSeed;
uniform vec3 uColorA;
uniform vec3 uColorB;
varying vec2 vUv;

void main() {
  vec2 q = vUv - 0.5;
  float fall = 1.0 - smoothstep(0.12, 0.46, length(q));
  vec2 p = vUv * vec2(2.2, 1.4) + uSeed;
  float n = tfbm2(p, uTime * 0.08);
  float detail = tfbm(p * 3.1 + vec2(uTime * 0.01, 0.0));
  float dens = smoothstep(0.36, 0.72, n * 0.75 + detail * 0.35) * fall;
  vec3 col = mix(uColorA, uColorB, smoothstep(0.4, 0.9, detail));
  float a = dens * uOpacity;
  gl_FragColor = vec4(col * a, a);   // premultiplied
}

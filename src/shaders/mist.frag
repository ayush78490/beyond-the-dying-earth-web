// Spray / mist rising where a waterfall lands.
uniform float uTime;
uniform float uMotion;
uniform float uSeed;
varying vec2 vUv;

void main() {
  vec2 q = vUv;
  float t = uTime * uMotion;
  float shape = smoothstep(0.0, 0.3, q.x) * (1.0 - smoothstep(0.7, 1.0, q.x))
              * smoothstep(0.0, 0.25, q.y) * (1.0 - smoothstep(0.45, 1.0, q.y));
  float n1 = tfbm(vec2(q.x * 0.75 + uSeed, q.y * 0.55 - t * 0.08));
  float n2 = tfbm(vec2(q.x * 1.4 - t * 0.02 + uSeed * 2.0, q.y * 0.75 - t * 0.14));
  float a = shape * smoothstep(0.38, 0.82, n1 * 0.6 + n2 * 0.5);
  gl_FragColor = vec4(vec3(0.82, 0.8, 1.0) * a * 0.38, 1.0);
}

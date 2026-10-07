// Energy flowing up the citadel's light column.
uniform float uTime;
uniform float uMotion;
uniform float uCharge;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  float x = (vUv.x - 0.5) * 2.0;
  float y = vUv.y;
  float t = uTime * uMotion;
  float core = exp(-x * x * 90.0);
  float glow = exp(-x * x * 7.0) * 0.3;
  float flow = vnoise(vec2(x * 4.0, y * 22.0 - t * 4.0));
  float packets = smoothstep(0.7, 1.0, vnoise(vec2(1.0, y * 6.0 - t * 1.6)));
  float flick = 0.88 + 0.12 * sin(t * 21.0 + y * 37.0);
  float ends = smoothstep(0.0, 0.1, y) * (1.0 - smoothstep(0.82, 1.0, y));
  float energy = (core * (0.45 + 0.55 * flow) + glow + core * packets * 0.8) * ends * flick;
  vec3 col = mix(vec3(1.0, 0.3, 0.9), vec3(1.0, 0.85, 1.0), core * 0.6) * energy;
  gl_FragColor = vec4(col * (0.32 + 0.55 * uCharge) * uOpacity, 1.0);
}

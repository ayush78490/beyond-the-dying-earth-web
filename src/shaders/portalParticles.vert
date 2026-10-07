// Motes spiralling into the portal. Fully GPU-driven: every particle is a pure
// function of time + its seed, so there is no per-frame CPU work.
uniform float uTime;
uniform float uMotion;
uniform float uCharge;
uniform float uPxScale;   // device px per image px
attribute vec4 aSeed;
varying float vAlpha;
varying vec3 vColor;

void main() {
  float t = uTime * uMotion;
  float speed = 0.05 + aSeed.y * 0.11;
  float life = fract(t * speed * (1.0 + uCharge * 1.4) + aSeed.x);
  float r0 = 46.0 + aSeed.z * 200.0;
  float r = mix(r0, 5.0, pow(life, 1.7));
  float ang = aSeed.w * 6.2831853 + life * (2.0 + aSeed.y * 2.4);
  vec2 pos = vec2(cos(ang) * r, sin(ang) * r * 0.9);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 0.0, 1.0);
  gl_PointSize = (1.4 + 2.6 * aSeed.y * (1.0 - life) + uCharge * 1.2) * uPxScale;
  vAlpha = smoothstep(0.0, 0.18, life) * (1.0 - smoothstep(0.82, 1.0, life)) * (0.55 + 0.45 * uCharge);
  vColor = mix(vec3(1.0, 0.32, 0.95), vec3(0.85, 0.78, 1.0), aSeed.z);
}

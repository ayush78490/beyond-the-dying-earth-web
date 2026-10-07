// Ash and embers rising past the dying Earth.
uniform float uTime;
uniform float uMotion;
uniform float uPx;        // device px for a size-1 point at distance 1
uniform float uFade;
attribute vec4 aSeed;
varying float vAlpha;
varying vec3 vColor;

void main() {
  float t = uTime * uMotion;
  vec3 p = (aSeed.xyz - 0.5) * vec3(7.0, 5.0, 3.0);
  p.y = mod(p.y + 2.5 + t * (0.05 + aSeed.w * 0.12), 5.0) - 2.5;
  p.x += sin(t * 0.2 + aSeed.w * 20.0) * 0.25;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float ember = step(0.86, aSeed.w);
  gl_PointSize = (1.2 + aSeed.w * 2.2 + ember * 1.5) * uPx / -mv.z;
  float edge = 1.0 - smoothstep(1.8, 2.5, abs(p.y));
  vAlpha = edge * (0.25 + ember * 0.6) * (0.6 + 0.4 * sin(t * 2.0 + aSeed.x * 50.0)) * uFade;
  vColor = mix(vec3(0.55, 0.5, 0.48), vec3(1.0, 0.45, 0.12), ember);
}

// Restoration energy spiralling down into Earth's atmosphere.
uniform float uTime;
uniform float uMotion;
uniform float uPx;
uniform float uIntensity;
uniform float uHealth;
attribute vec4 aSeed;
varying float vAlpha;
varying vec3 vColor;

void main() {
  float t = uTime * uMotion;
  float life = fract(t * (0.07 + aSeed.y * 0.08) + aSeed.x);
  // stable random axis per particle
  vec3 axis = normalize(vec3(aSeed.z - 0.5, 0.6 + aSeed.w, aSeed.x - 0.5));
  vec3 u = normalize(cross(axis, vec3(0.0, 0.0, 1.0) + 0.001));
  vec3 v = cross(axis, u);
  float r = mix(2.5, 1.03, pow(life, 1.25));
  float a = aSeed.w * 6.2831853 + life * (3.0 + aSeed.y * 3.0);
  vec3 p = (cos(a) * u + sin(a) * v) * r + axis * (1.0 - life) * 0.35;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = (2.2 + aSeed.y * 3.2) * uPx / -mv.z;
  vAlpha = smoothstep(0.0, 0.2, life) * (1.0 - smoothstep(0.86, 1.0, life)) * uIntensity;
  vColor = mix(vec3(0.35, 0.85, 1.0), vec3(0.45, 1.0, 0.6), uHealth * aSeed.z);
}

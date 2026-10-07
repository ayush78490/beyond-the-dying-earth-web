// Journey starfield: real 3D points along the route, twinkling, fading in as we leave Earth.
uniform float uTime;
uniform float uMotion;
uniform float uPx;
uniform float uFade;
attribute vec4 aSeed;
varying float vAlpha;
varying vec3 vColor;

void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  float t = uTime * uMotion;
  float tw = 0.65 + 0.35 * sin(t * (0.6 + aSeed.y * 2.0) + aSeed.x * 40.0);
  gl_PointSize = clamp((0.8 + aSeed.z * 2.2) * uPx / -mv.z * 40.0, 1.0, 5.0);
  vAlpha = tw * uFade * (0.35 + aSeed.w * 0.65);
  vColor = mix(vec3(0.75, 0.82, 1.0), vec3(1.0, 0.8, 0.95), aSeed.y);
}

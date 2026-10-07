// Armour / visor lights on the Astrion: slow power pulse + a faint electrical flicker.
uniform float uTime;
uniform float uMotion;
uniform float uPxScale;
attribute vec3 aColor;
attribute vec2 aLight;    // x: radius (image px), y: phase
varying float vAlpha;
varying vec3 vColor;

float h11(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  float t = uTime * uMotion;
  float pulse = 0.62 + 0.38 * sin(t * 1.25 + aLight.y * 2.0);
  float slot = floor(t * 9.0 + aLight.y * 5.0);
  float flicker = mix(1.0, 0.55 + 0.45 * h11(slot + aLight.y * 17.0), step(0.93, h11(slot * 1.7 + aLight.y)));
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aLight.x * 2.0 * uPxScale * (0.9 + 0.15 * pulse);
  vAlpha = pulse * flicker * 0.7;
  vColor = aColor;
}

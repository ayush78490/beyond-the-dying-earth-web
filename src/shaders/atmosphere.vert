// Quad centred on the planet; reports which source-image pixel each fragment covers
// (before parallax — the whole quad already moves with the planet layer).
uniform vec3 uPlanet;
uniform float uSize;
varying vec2 vPx;

void main() {
  vPx = uPlanet.xy + vec2(position.x, -position.y) * uSize;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position * uSize, 1.0);
}

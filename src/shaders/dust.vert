// Cosmic dust across the whole frame.
//  - most motes drift lazily with the wind and wrap inside the visible window
//  - ~18% "fly-through" motes stream out of the portal towards the camera,
//    growing and fading as they pass — the scene's sense of depth.
uniform float uTime;
uniform float uMotion;
uniform vec2 uImage;
uniform vec4 uFrame;      // visible window: x0, y0, w, h (image px)
uniform vec2 uParallax;
uniform vec2 uVanish;     // portal, image px
uniform float uPxScale;
attribute vec4 aSeed;     // x,y: base position (0..1 of window), z: depth, w: kind/size
varying float vAlpha;
varying vec3 vColor;

void main() {
  float t = uTime * uMotion;
  float depth = aSeed.z;
  vec2 base = uFrame.xy + aSeed.xy * uFrame.zw;
  vec2 p;
  float size;
  float alpha;

  if (aSeed.w > 0.82) {
    float life = fract(t * (0.025 + aSeed.x * 0.03) + aSeed.y * 7.13);
    vec2 dir = base - uVanish;
    p = uVanish + dir * (0.08 + life * 1.5);
    size = 1.0 + life * life * 7.0;
    alpha = sin(life * 3.14159) * 0.7;
    depth = mix(0.3, 1.0, life);
  } else {
    vec2 wind = vec2(5.0 + aSeed.x * 9.0, -2.5 - aSeed.y * 6.0) * (0.4 + depth);
    p = base + wind * t + vec2(sin(t * 0.3 + aSeed.w * 30.0), cos(t * 0.23 + aSeed.x * 20.0)) * 7.0;
    p = uFrame.xy + mod(p - uFrame.xy, uFrame.zw);
    size = 0.8 + aSeed.w * 2.6 * (0.5 + depth);
    float tw = 0.6 + 0.4 * sin(t * (0.6 + aSeed.y) + aSeed.x * 40.0);
    alpha = (0.25 + 0.6 * depth) * tw;
  }

  p += uParallax * (0.12 + 0.88 * depth);
  vec2 world = vec2(p.x - uImage.x * 0.5, uImage.y * 0.5 - p.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 0.0, 1.0);
  gl_PointSize = size * uPxScale;
  vAlpha = alpha;

  float hue = fract(aSeed.w * 13.7);
  vColor = hue < 0.45 ? vec3(1.0, 0.42, 0.95) : (hue < 0.8 ? vec3(0.55, 0.85, 1.0) : vec3(1.0, 0.85, 0.75));
}

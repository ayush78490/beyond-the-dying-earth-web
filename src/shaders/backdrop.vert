// Full-frame plane in "image space": world units are source-image pixels.
uniform vec2 uImage;
varying vec2 vPx;      // source-image pixel under this fragment (y down)
varying vec2 vScreen;  // 0..1 screen position (vignette)

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vPx = vec2(world.x + uImage.x * 0.5, uImage.y * 0.5 - world.y);
  gl_Position = projectionMatrix * viewMatrix * world;
  vScreen = gl_Position.xy / gl_Position.w * 0.5 + 0.5;
}

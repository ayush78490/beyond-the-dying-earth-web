// Sky dome that follows the camera: reports the view direction.
varying vec3 vDir;

void main() {
  vDir = normalize(position);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * viewMatrix * wp;
}

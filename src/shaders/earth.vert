varying vec3 vObjN;     // object-space normal: surface features rotate with the globe
varying vec3 vWorldN;
varying vec3 vViewDir;

void main() {
  vObjN = normalize(position);
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vWorldN = normalize(mat3(modelMatrix) * normal);
  vViewDir = normalize(cameraPosition - wp.xyz);
  gl_Position = projectionMatrix * viewMatrix * wp;
}

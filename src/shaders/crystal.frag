// REGO crystal: faceted cyan energy with a bright fresnel edge.
uniform float uTime;
varying vec3 vObjN;
varying vec3 vWorldN;
varying vec3 vViewDir;

void main() {
  vec3 N = normalize(vWorldN);
  float facing = max(dot(N, vViewDir), 0.0);
  float fr = pow(1.0 - facing, 2.0);
  float pulse = 0.8 + 0.2 * sin(uTime * 3.0);
  vec3 col = mix(vec3(0.05, 0.35, 0.8), vec3(0.6, 0.95, 1.0), facing * 0.6) * (0.6 + 0.4 * pulse) + vec3(0.8, 1.0, 1.0) * fr * 1.2;
  gl_FragColor = vec4(col, 1.0);
}

// Soft additive sprite shared by every point-based layer.
varying float vAlpha;
varying vec3 vColor;

void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = exp(-d * d * 4.0) * (1.0 - smoothstep(0.85, 1.0, d));
  gl_FragColor = vec4(vColor * a * vAlpha, 1.0);
}

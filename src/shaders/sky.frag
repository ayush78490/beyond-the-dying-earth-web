// Deep-space backdrop. Colours are the journey palette, so the whole universe shifts
// from Earth's rust to the rift's violet/cyan gradually, never with a cut.
uniform vec3 uSkyTop;
uniform vec3 uSkyLow;
uniform vec3 uNebA;
uniform vec3 uNebB;
uniform float uNebula;
uniform float uTime;
varying vec3 vDir;

void main() {
  vec3 d = normalize(vDir);
  vec3 col = mix(uSkyLow, uSkyTop, smoothstep(-0.6, 0.7, d.y));
  // two drifting noise banks (projected on two planes => no seam)
  float n1 = tfbm2(d.xy * 0.9 + d.z * 0.35, uTime * 0.05);
  float n2 = tfbm2(d.zy * 1.3 + vec2(0.37, 0.11), uTime * 0.04 + 9.0);
  float neb = smoothstep(0.48, 0.82, n1) * 0.7 + smoothstep(0.55, 0.86, n2) * 0.5;
  col += mix(uNebA, uNebB, n2) * neb * uNebula;
  gl_FragColor = vec4(col, 1.0);
}

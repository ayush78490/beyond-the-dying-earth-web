// Atmospheric halo shell (rendered additively on a slightly larger sphere).
uniform vec3 uColor;
uniform vec3 uLightDir;
uniform float uIntensity;

varying vec3 vObjN;
varying vec3 vWorldN;
varying vec3 vViewDir;

void main() {
  vec3 N = normalize(vWorldN);
  float f = 1.0 - max(dot(N, vViewDir), 0.0);
  // peak just outside the planet's limb, fading to nothing at the shell edge
  // the planet's limb sits at f ~ 0.52 for a 1.14x shell
  float glow = smoothstep(0.08, 0.5, f) * pow(1.0 - smoothstep(0.5, 1.0, f), 1.3);
  float lit = 0.35 + 0.65 * smoothstep(-0.4, 0.6, dot(N, normalize(uLightDir)));
  gl_FragColor = vec4(uColor * glow * lit * uIntensity, 1.0);
}

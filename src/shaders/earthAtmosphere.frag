// Atmospheric halo shell (rendered additively on a slightly larger sphere).
uniform vec3 uColor;
uniform vec3 uLightDir;
uniform float uIntensity;
uniform float uScale;          // shell radius in planet radii

varying vec3 vObjN;
varying vec3 vWorldN;
varying vec3 vViewDir;

void main() {
  vec3 N = normalize(vWorldN);
  float c = max(dot(N, vViewDir), 0.0);
  // how close the view ray through this fragment passes to the planet's centre (in planet
  // radii): 1 at the limb, uScale at the shell edge. Unlike a plain fresnel term this holds
  // from any distance, so the halo stays a thin band when the camera comes into orbit.
  float b = uScale * sqrt(1.0 - c * c);
  float thick = uScale - 1.0;
  // inner falloff over the disc: broad from afar, tight in low orbit (else it hazes the surface)
  float inner = mix(1.2, 4.0, clamp((uScale - 1.035) / 0.105, 0.0, 1.0));
  float glow = smoothstep(1.0 - thick * inner, 0.99, b) * pow(1.0 - smoothstep(0.99, uScale, b), 1.3);
  float lit = 0.35 + 0.65 * smoothstep(-0.4, 0.6, dot(N, normalize(uLightDir)));
  gl_FragColor = vec4(uColor * glow * lit * uIntensity, 1.0);
}

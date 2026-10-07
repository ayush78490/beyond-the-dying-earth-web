// One-off bake of Earth's static noise fields into an equirectangular map, so the
// globe shader does a single texture fetch instead of several 3D fbm evaluations.
//   r: terrain height   g: grit   b: regrowth seed map   a: fault-line field
varying vec2 vUv;

void main() {
  float lon = (vUv.x - 0.5) * 6.2831853;
  float lat = (vUv.y - 0.5) * 3.1415927;
  vec3 n = vec3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon));
  float h = fbm3(n * 1.7 + 3.1) * 0.65 + fbm3(n * 4.3) * 0.35;
  float grit = fbm3(n * 9.0);
  float seedMap = fbm3(n * 2.6 + 11.0);
  float fault = fbm3(n * 6.0 + 2.0);
  gl_FragColor = vec4(h, grit, seedMap, fault);
}

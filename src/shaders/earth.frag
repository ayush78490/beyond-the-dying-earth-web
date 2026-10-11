// Procedural Earth with a single "health" control.
//   health 0: scorched rust continents, burning fault lines, still grey seas, smog
//   health 1: green continents, blue oceans with sun glint, ice caps, white clouds
// Healing does not cross-fade globally: each region recovers at its own threshold,
// so vegetation visibly spreads across the globe as health rises.

uniform float uTime;
uniform float uMotion;
uniform float uHealth;
uniform float uFade;
uniform vec3 uLightDir;
uniform float uRim;          // limb brightening: 1 from afar, lower in low orbit
uniform sampler2D uFields;   // baked: height, grit, regrowth seeds, fault lines

varying vec3 vObjN;
varying vec3 vWorldN;
varying vec3 vViewDir;

vec2 equirect(vec3 n) {
  return vec2(atan(n.z, n.x) / 6.2831853 + 0.5, asin(clamp(n.y, -1.0, 1.0)) / 3.1415927 + 0.5);
}

void main() {
  float t = uTime * uMotion;
  vec3 n = normalize(vObjN);
  vec2 uv = equirect(n);
  vec4 F = texture(uFields, uv);
  float h = F.r;
  float land = smoothstep(0.5, 0.525, h);
  float coast = smoothstep(0.46, 0.5, h) * (1.0 - land);
  float lat = abs(n.y);
  float grit = F.g;

  float seedMap = F.b;
  float heal = smoothstep(seedMap - 0.07, seedMap + 0.07, uHealth * 1.3 - 0.12);

  vec3 deadLand = mix(vec3(0.26, 0.13, 0.07), vec3(0.34, 0.28, 0.22), grit);
  vec3 deadSea = mix(vec3(0.045, 0.045, 0.055), vec3(0.1, 0.085, 0.07), coast);
  vec3 lushLand = mix(vec3(0.06, 0.27, 0.09), vec3(0.3, 0.42, 0.13), smoothstep(0.55, 0.75, h));
  lushLand = mix(lushLand, vec3(0.55, 0.45, 0.27), smoothstep(0.66, 0.74, grit) * (1.0 - smoothstep(0.35, 0.6, lat)));
  vec3 lushSea = mix(vec3(0.01, 0.06, 0.2), vec3(0.04, 0.3, 0.45), coast);

  vec3 albedo = mix(mix(deadSea, deadLand, land), mix(lushSea, lushLand, land), heal);
  float ice = smoothstep(0.8, 0.9, lat + (grit - 0.5) * 0.12) * heal;
  albedo = mix(albedo, vec3(0.9, 0.95, 1.0), ice);

  // burning fault lines on dead land
  float crack = 1.0 - smoothstep(0.0, 0.022, abs(F.a - 0.5));
  float burn = crack * land * (1.0 - heal) * (0.55 + 0.45 * sin(t * 1.3 + grit * 12.0));

  // clouds drift around the globe independently of the surface
  // (explicit LOD: the longitude seam would otherwise pick a tiny mip and draw a line)
  const vec4 W = vec4(0.5, 0.27, 0.15, 0.08);
  vec2 cp = vec2(uv.x * 2.0 - t * 0.003, uv.y * 1.6);
  float c = 0.5 * (dot(textureLod(uNoise, cp + vec2(t * 0.0016, 0.0), 0.0), W)
                 + dot(textureLod(uNoise, cp * vec2(1.0, 1.37) + vec2(0.31, 0.77) - vec2(t * 0.001, t * 0.0013), 0.0), W));
  float cloudsW = smoothstep(0.53, 0.72, c) * heal * 0.85;
  float smog = smoothstep(0.36, 0.7, c) * (1.0 - heal) * 0.72;

  vec3 N = normalize(vWorldN);
  vec3 L = normalize(uLightDir);
  float ndl = dot(N, L);
  float diff = smoothstep(-0.18, 0.65, ndl);

  vec3 col = albedo * (0.035 + diff * 1.05);
  vec3 H = normalize(L + vViewDir);
  col += vec3(0.6, 0.75, 1.0) * pow(max(dot(N, H), 0.0), 40.0) * (1.0 - land) * heal * diff * 0.6;
  col = mix(col, vec3(0.96) * (0.07 + diff) * (0.55 + 0.45 * uRim), cloudsW);
  col = mix(col, vec3(0.3, 0.21, 0.15) * (0.08 + diff * 0.6), smog);
  col += vec3(1.0, 0.36, 0.08) * burn * (1.0 - smog * 0.5) * (0.45 + (1.0 - diff) * 0.9);

  float fr = pow(1.0 - max(dot(N, vViewDir), 0.0), 3.0);
  vec3 atmo = mix(vec3(0.8, 0.4, 0.2), vec3(0.35, 0.62, 1.0), uHealth);
  col += atmo * fr * (0.2 + diff * 0.7) * uRim;

  gl_FragColor = vec4(col * uFade, 1.0);
}

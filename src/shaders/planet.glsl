// Turns the painted planet.
// The painting's lighting (low-pass) stays fixed while its surface detail (high-pass)
// is re-projected through sphere coordinates and advanced in longitude. Longitudes
// are ping-ponged into the band the painting shows without heavy foreshortening, so
// the globe can spin forever with no seam. At spin = 0 this is the identity.

vec3 rotatePlanet(vec2 p, vec3 base, float mask) {
  vec2 rel = (p - uPlanet.xy) / uPlanet.z;
  if (dot(rel, rel) >= 0.995) return base;
  float lat = asin(clamp(rel.y, -0.999, 0.999));
  float cl = cos(lat);
  float lon = asin(clamp(rel.x / max(cl, 1e-3), -1.0, 1.0));
  float u = (lon - uPlanetSpin - 0.2) / 0.8;
  float tri = 1.0 - abs(mod(u + 1.0, 4.0) - 2.0);
  float lonS = 0.2 + 0.8 * tri;
  vec2 uvS = plateUV(uPlanet.xy + uPlanet.z * vec2(sin(lonS) * cl, rel.y));
  vec3 detail = texture(uPlate, uvS).rgb - textureLod(uPlate, uvS, 4.5).rgb;
  vec3 light = textureLod(uPlate, plateUV(p), 4.5).rgb;
  return mix(base, light + detail, mask);
}

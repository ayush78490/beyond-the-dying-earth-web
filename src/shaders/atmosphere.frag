// Planet atmosphere: limb halo + high-altitude cloud wisps that turn slightly faster
// than the surface (parallax between layers is what sells the rotation).

uniform float uTime;
uniform float uMotion;
uniform float uSpin;
uniform vec3 uPlanet;      // cx, cy, r (image px)
uniform vec2 uImage;
uniform sampler2D uMapC;   // r = rotatable planet surface
uniform float uDetail;

varying vec2 vPx;

void main() {
  vec2 rel = (vPx - uPlanet.xy) / uPlanet.z;
  float r = length(rel);
  vec2 L2 = normalize(vec2(0.75, -0.65));
  float lit = 0.45 + 0.55 * max(dot(normalize(rel + 1e-5), L2), 0.0);
  float breathe = 0.88 + 0.12 * sin(uTime * 0.31 * uMotion);

  // outer halo hugging the limb
  float halo = r > 1.0 ? exp(-(r - 1.0) * 16.0) : smoothstep(0.93, 1.0, r) * 0.8;
  vec3 col = vec3(0.32, 0.52, 1.0) * halo * lit * 0.5 * breathe;

  if (r < 1.0 && uDetail > 0.5) {
    float lat = asin(clamp(rel.y, -0.999, 0.999));
    float cl = cos(lat);
    float lon = asin(clamp(rel.x / max(cl, 1e-3), -1.0, 1.0)) - uSpin * 1.35;
    float n = tfbm2(vec2(lon * 0.24, lat * 0.5), uTime * 0.25 * uMotion);
    float wisps = smoothstep(0.5, 0.72, n);
    vec3 N = vec3(rel, sqrt(max(1.0 - r * r, 0.0)));
    float ndl = clamp(dot(N, normalize(vec3(0.62, -0.55, 0.56))), 0.0, 1.0);
    float m = texture(uMapC, clamp(vPx / uImage, 0.0, 1.0)).r;
    col += vec3(0.72, 0.84, 1.0) * wisps * m * (0.03 + 0.2 * ndl);
  }

  gl_FragColor = vec4(col, 1.0);
}

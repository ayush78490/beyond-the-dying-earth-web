// REGO crystal glow + comet trail along its orbit around Earth.
uniform float uTime;
uniform float uMotion;
uniform float uPx;
uniform float uIntensity;
uniform vec3 uOrbit;      // radius, tilt (rad), speed (rad/s)
attribute float aIdx;     // 0 = crystal glow, 1..N = trail samples
varying float vAlpha;
varying vec3 vColor;

vec3 orbitPos(float a) {
  vec3 p = vec3(cos(a), 0.0, sin(a)) * uOrbit.x;
  float c = cos(uOrbit.y), s = sin(uOrbit.y);
  return vec3(p.x, p.y * c - p.z * s, p.y * s + p.z * c);
}

void main() {
  float a = (uTime * uMotion) * uOrbit.z - aIdx * 0.045;
  vec4 mv = modelViewMatrix * vec4(orbitPos(a), 1.0);
  gl_Position = projectionMatrix * mv;
  float head = step(aIdx, 0.5);
  gl_PointSize = mix(5.0 * (1.0 - aIdx / 40.0), 34.0, head) * uPx / -mv.z;
  vAlpha = mix(pow(1.0 - aIdx / 40.0, 2.0) * 0.55, 0.9, head) * uIntensity;
  vColor = vec3(0.45, 0.85, 1.0);
}

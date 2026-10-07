// Water motion for the painted waterfalls + lake.
// The painting itself is re-sampled along a flowing distortion field, so the water
// keeps its illustrated look but visibly runs; procedural streaks add the highlights.

// Returns a sampling offset (image px) and the amount of specular streak.
vec2 waterfallFlow(vec2 p, float mask, float t, out float highlight, out float foam) {
  // every few pixels across the fall gets its own speed -> no single sliding sheet
  float lane = vnoise(vec2(p.x * 0.07, 1.7));
  float speed = 55.0 + 75.0 * lane;
  float y = p.y - t * speed;
  float streak = tfbm(vec2(p.x / 36.0, y / 220.0));
  float fine = vnoise(vec2(p.x * 0.35, (p.y - t * speed * 1.4) * 0.06));
  highlight = mask * smoothstep(0.56, 0.9, streak * 0.62 + fine * 0.48);
  // churn gets stronger towards the bottom of each fall
  foam = mask * vnoise(vec2(p.x * 0.2 + t * 0.6, p.y * 0.08 - t * 2.4));
  return mask * vec2((fine - 0.5) * 2.0, (streak - 0.5) * 10.0);
}

// Gentle horizontal ripples + glints on the lake.
vec2 lakeFlow(vec2 p, float mask, float t, out float sparkle) {
  float swell = vnoise(p * 0.02 + vec2(t * 0.08, 0.0));
  float w = sin(p.y * 0.55 + t * 1.25 + swell * 5.0);
  float drift = vnoise(vec2(p.x * 0.018 - t * 0.12, p.y * 0.11));
  float glint = vnoise(vec2(p.x * 0.07 + t * 0.35, p.y * 0.45 - t * 0.05));
  sparkle = mask * pow(glint, 7.0);
  return mask * vec2(w * 1.5 + (drift - 0.5) * 3.0, (drift - 0.5) * 1.4);
}

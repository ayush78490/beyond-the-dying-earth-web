"""
Cuts the hero key art into a 2.5D diorama for the cinematic journey, and paints
the art that the key art does not contain.

Outputs (public/assets/journey/):
  layer-<name>.webp   RGBA depth layers (sky, planet, far, mid, fore, chars), each
                      cropped to its content. Areas hidden behind nearer layers are
                      filled (push-pull) so camera parallax never reveals holes.
  solguardian.webp    the final boss, painted procedurally in the key-art palette
  layers.json         crop rects (source-image px) + export scale per layer

Depends on tools/prepare_hero.py (text removal + depth/mask maps).
Re-run with:  python tools/prepare_journey.py
"""
from __future__ import annotations

import json
import os
import sys

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import prepare_hero as hero  # noqa: E402

OUT = os.path.join(hero.ROOT, "public", "assets", "journey")
W, H = hero.W, hero.H


def smooth(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    t = np.clip((x - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def filled(img: np.ndarray, known: np.ndarray) -> np.ndarray:
    """Colour everywhere: known pixels kept, the rest push-pull filled from them."""
    known = known.astype(bool)
    if known.all():
        return img
    f = hero.push_pull(img, known)
    out = np.where(known[..., None], img.astype(np.float32), f)
    return np.clip(out, 0, 255).astype(np.uint8)


def extend(rgba: np.ndarray, left: int, right: int, top: int, bottom: int, keep_alpha: bool = False) -> np.ndarray:
    """Continue a layer past the painting's frame: mirrored content that grows blurrier
    and fades out, so an off-axis camera meets soft continuation instead of an edge."""
    if not (left or right or top or bottom):
        return rgba
    # stretch the edge pixels outwards (mirroring creates symmetric "ink-blot" seams),
    # then smear the stretched streaks into haze across the stretch direction
    big = cv2.copyMakeBorder(rgba, top, bottom, left, right, cv2.BORDER_REPLICATE).astype(np.float32)
    h, w = big.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    # distance (0..1) into the padding, per side
    dl = np.clip((left - xx) / max(left, 1), 0, 1) if left else 0 * xx
    dr = np.clip((xx - (w - right - 1)) / max(right, 1), 0, 1) if right else 0 * xx
    dt = np.clip((top - yy) / max(top, 1), 0, 1) if top else 0 * xx
    db = np.clip((yy - (h - bottom - 1)) / max(bottom, 1), 0, 1) if bottom else 0 * xx
    d = np.maximum.reduce([dl, dr, dt, db])
    out = big.copy()
    dh = np.maximum(dl, dr)
    if dh.any():
        haze_h = cv2.GaussianBlur(big, (0, 0), sigmaX=8, sigmaY=70)
        kh = np.clip(dh * 4.0, 0, 1)[..., None]
        out = out * (1 - kh) + haze_h * kh
    # stretched rows above/below turn into streaks: smear them sideways into haze
    dv = np.maximum(dt, db)
    if dv.any():
        haze = cv2.GaussianBlur(big, (0, 0), sigmaX=70, sigmaY=6)
        kv = np.clip(dv * 2.5, 0, 1)[..., None]
        out = out * (1 - kv) + haze * kv
    if not keep_alpha:
        out[..., 3] *= 1 - smooth(d, 0.25, 1.0)
    return np.clip(out, 0, 255).astype(np.uint8)


def export(name: str, bgr: np.ndarray, alpha: np.ndarray, scale: float = 1.0, pad: int = 6,
           ext: tuple[float, float, float, float] = (0, 0, 0, 0), opaque: bool = False) -> dict:
    """ext = (left, right, top, bottom) extension as a fraction of the image size."""
    a8 = np.clip(alpha * 255 + 0.5, 0, 255).astype(np.uint8)
    ys, xs = np.where(a8 > 2)
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, W)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, H)
    rgba = np.dstack([bgr, a8])[y0:y1, x0:x1]
    # only extend across sides that actually touch the painting's frame
    el = int(ext[0] * W) if x0 == 0 else 0
    er = int(ext[1] * W) if x1 == W else 0
    et = int(ext[2] * H) if y0 == 0 else 0
    eb = int(ext[3] * H) if y1 == H else 0
    rgba = extend(rgba, el, er, et, eb, keep_alpha=opaque)
    x0, x1, y0, y1 = x0 - el, x1 + er, y0 - et, y1 + eb
    if scale != 1.0:
        rgba = cv2.resize(rgba, None, fx=scale, fy=scale, interpolation=cv2.INTER_LANCZOS4)
        rgb = rgba[..., :3]
        blur = cv2.GaussianBlur(rgb, (0, 0), 1.4)
        rgba[..., :3] = cv2.addWeighted(rgb, 1.3, blur, -0.3, 0)
    cv2.imwrite(os.path.join(OUT, f"layer-{name}.webp"), rgba, [cv2.IMWRITE_WEBP_QUALITY, 86])
    return {"x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0), "scale": scale}


def paint_solguardian(path: str) -> None:
    """Final boss: a colossus silhouetted against its own sun-core (same design as the SVG)."""
    w, h = 1600, 900
    s = 2.0  # svg viewBox 800x450 -> 1600x900
    img = np.zeros((h, w, 4), np.float32)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)

    # sun halo behind the head
    cx, cy = 400 * s, 150 * s
    d = np.hypot(xx - cx, yy - cy)
    sun = np.exp(-(d / (95 * s)) ** 2)
    halo = np.exp(-(d / (230 * s)) ** 1.4) * 0.6
    rays = (0.5 + 0.5 * np.cos(np.arctan2(yy - cy, xx - cx) * 24)) ** 8 * np.exp(-d / (260 * s)) * 0.45
    glow = np.clip(sun + halo + rays, 0, 1.6)
    col = np.zeros((h, w, 3), np.float32)
    col += glow[..., None] * np.array([90, 190, 255], np.float32)  # BGR warm gold/orange
    col += (sun ** 3)[..., None] * np.array([200, 245, 255], np.float32)
    alpha = np.clip(glow * 1.1, 0, 1)

    body_pts = [(110, 450), (160, 330), (210, 282), (282, 258), (326, 232), (342, 200), (350, 160), (360, 128),
                (378, 110), (392, 64), (400, 104), (408, 64), (422, 110), (440, 128), (450, 160), (458, 200),
                (474, 232), (518, 258), (590, 282), (640, 330), (690, 450)]
    spikes = [[(282, 258), (236, 196), (300, 240)], [(518, 258), (564, 196), (500, 240)],
              [(350, 160), (322, 116), (362, 140)], [(450, 160), (478, 116), (438, 140)]]
    mask = np.zeros((h, w), np.uint8)
    cv2.fillPoly(mask, [(np.array(body_pts) * s).astype(np.int32)], 255)
    for sp in spikes:
        cv2.fillPoly(mask, [(np.array(sp) * s).astype(np.int32)], 255)
    m = cv2.GaussianBlur(mask.astype(np.float32) / 255, (0, 0), 1.2)
    # rim light from the sun: edge minus edge shifted away from the light
    rim = np.clip(m - cv2.warpAffine(m, np.float32([[1, 0, 0], [0, 1, 7]]), (w, h)), 0, 1)
    rim = cv2.GaussianBlur(rim, (0, 0), 2.0)
    body = np.array([22, 10, 20], np.float32) + (1 - yy / h)[..., None] * np.array([20, 12, 30], np.float32)
    grain = np.random.default_rng(3).normal(0, 3, (h, w, 1)).astype(np.float32)
    col = col * (1 - m[..., None]) + (body + grain) * m[..., None]
    col += rim[..., None] * np.array([120, 200, 255], np.float32) * 1.4
    alpha = np.maximum(alpha, m)

    # eyes + chest core (the shader adds their pulse)
    for ex in (381, 419):
        e = np.exp(-(((xx - ex * s) / (11 * s)) ** 2 + ((yy - 167 * s) / (2.6 * s)) ** 2))
        col += e[..., None] * np.array([160, 235, 255], np.float32) * 1.6
    core = np.exp(-(np.hypot(xx - 400 * s, yy - 318 * s) / (16 * s)) ** 2)
    col += core[..., None] * np.array([120, 210, 255], np.float32) * 1.5
    # cracks radiating from the core
    for (ax, ay) in [(372, 262), (436, 270), (398, 390), (452, 372)]:
        cv2.line(col, (int(400 * s), int(318 * s)), (int(ax * s), int(ay * s)), (90, 170, 255), 3, cv2.LINE_AA)

    # fade the base into fog and keep the halo off the texture's edges
    base = smooth(yy, h * 0.62, h * 1.0)
    alpha = alpha * (1 - base * 0.85)
    edge = np.minimum.reduce([xx / (w * 0.18), (w - xx) / (w * 0.18), yy / (h * 0.2), np.ones_like(xx)])
    alpha = alpha * smooth(np.clip(edge, 0, 1), 0.0, 1.0) * np.where(m > 0.5, 1.0, 1.0)
    alpha = np.maximum(alpha, m * (1 - base * 0.85))
    rgba = np.dstack([np.clip(col, 0, 255), np.clip(alpha * 255, 0, 255)]).astype(np.uint8)
    cv2.imwrite(path, rgba, [cv2.IMWRITE_WEBP_QUALITY, 88])


def main() -> None:
    os.makedirs(OUT, exist_ok=True)
    img = cv2.imread(hero.SRC, cv2.IMREAD_COLOR)
    if img is None:
        sys.exit("missing art/hero-source.png")
    plate, _ = hero.remove_text(img)
    maps = hero.build_maps(img, plate)
    depth = maps["a"][..., 2].astype(np.float32) / 255
    chars = maps["c"][..., 0].astype(np.float32) / 255
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

    meta: dict[str, dict] = {}

    # sky: always opaque backdrop; everything nearer is filled with sky
    sky_known = (depth < 0.07) & (chars < 0.1)
    meta["sky"] = export("sky", filled(plate, sky_known), np.ones((H, W), np.float32), 1.0, ext=(0.6, 0.6, 0.5, 0.3), opaque=True)

    # planet: the full globe + rings + moons (also shown alone in space)
    cx, cy, r = hero.PLANET_C[0], hero.PLANET_C[1], hero.PLANET_R
    disk = np.clip(r + 1.5 - np.hypot(xx - cx, yy - cy), 0, 1)
    ring = hero.poly_mask(hero.RING).astype(np.float32) / 255
    ring_px = ring * (hero.luminance(plate) > 90)
    moons = np.clip(47 - np.hypot(xx - 1115, yy - 125), 0, 1) + np.clip(25 - np.hypot(xx - 975, yy - 75), 0, 1)
    planet_alpha = np.clip(disk + cv2.GaussianBlur(ring_px.astype(np.float32), (0, 0), 1.2) + moons, 0, 1)
    planet_known = (disk > 0.5) & (depth < 0.2) & (chars < 0.1)
    planet_known |= (ring_px > 0.5) | (moons > 0.5)
    meta["planet"] = export("planet", filled(plate, planet_known), planet_alpha)

    # far: castle, portal, floating rocks, distant horizon
    # (name, depth band, export scale, frame extension l/r/t/b) — widths stay < 4096 px
    bands = [
        ("far", 0.2, 0.4, 1.25, (0.45, 0.45, 0.25, 0.15)),
        ("mid", 0.4, 0.62, 1.2, (0.45, 0.45, 0.0, 0.2)),
        ("fore", 0.62, 9.0, 1.0, (0.4, 0.4, 0.0, 0.25)),
    ]
    for name, lo, hi, scale, ext in bands:
        own = (depth >= lo) & (depth < hi) & (chars < 0.5)
        alpha = smooth(depth, lo - 0.015, lo + 0.012)
        if hi < 9:
            # keep only this layer's own pixels plus a soft margin: when parallax opens
            # a gap, the layer behind (ultimately the painted sky) shows — never a flat fill
            mine = ((depth >= lo - 0.01) & (depth < hi)).astype(np.uint8)
            mine = cv2.dilate(mine, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
            alpha = alpha * np.clip(cv2.GaussianBlur(mine.astype(np.float32), (0, 0), 5) * 1.4, 0, 1)
        if name == "fore":
            # the Astrion share this depth (their own card covers them): leave them out
            alpha = alpha * (1 - smooth(chars, 0.5, 0.95))
        meta[name] = export(name, filled(plate, own), alpha, scale, ext=ext)

    meta["chars"] = export("chars", plate, np.clip(chars * 1.05, 0, 1), 1.0)

    paint_solguardian(os.path.join(OUT, "solguardian.webp"))
    meta["image"] = {"w": W, "h": H}
    with open(os.path.join(OUT, "layers.json"), "w") as fh:
        json.dump(meta, fh, indent=2)
    print(json.dumps(meta))


if __name__ == "__main__":
    main()

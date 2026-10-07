"""
Asset pipeline for the hero artwork.

Turns the single supplied illustration into:
  - hero-plate.webp      : the artwork with the baked-in UI/typography removed
                           (real HTML text is laid over it in the page)
  - hero-maps-a.png      : R = depth, G = waterfall mask, B = lake mask
  - hero-maps-b.png      : R = cloud drift mask, G = cloth/hair sway mask, B = emissive glow mask
  - hero-maps-c.png      : R = planet surface (rotatable) mask, G = ring mask, B = character mask

All coordinates below are in source-image pixels (1672 x 941) and are mirrored in
src/config/heroLayout.ts — keep the two in sync.
Re-run with:  python tools/prepare_hero.py
"""
from __future__ import annotations

import os
import sys

import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "art", "hero-source.png")
OUT = os.path.join(ROOT, "public", "assets")
DEBUG = os.environ.get("HERO_DEBUG_DIR")

W, H = 1672, 941

# Fitted to the visible limb (top + right edge), residual < 3px.
PLANET_C = (706.7, 453.5)
PLANET_R = 395.7

# --------------------------------------------------------------------------------------
# Typography / UI baked into the artwork
# --------------------------------------------------------------------------------------
# (x0, y0, x1, y1, mode) — "glyph": only remove glyph pixels, "box": remove everything
TEXT_BOXES = [
    (60, 14, 252, 72, "glyph"),       # ASTRION logo
    (1118, 26, 1425, 60, "glyph"),    # nav links
    (1436, 18, 1606, 68, "box"),      # nav button
    (448, 58, 522, 112, "glyph"),     # sparkle above the O
    (160, 92, 712, 204, "box"),       # BEYOND (+ ringed-planet emblem)
    (700, 150, 932, 204, "box"),      # gap between BEYOND and EARTH (keeps edges off the globe)
    (204, 192, 932, 280, "box"),      # THE DYING EARTH
    (298, 280, 822, 318, "box"),      # tagline
    (316, 312, 814, 368, "box"),      # description
    (456, 376, 922, 440, "box"),      # email + button
    (466, 450, 942, 528, "box"),      # feature icons row
]

# Never touch these (character silhouettes that brush against text boxes)
PROTECT = [
    np.array([(288, 470), (296, 384), (326, 352), (370, 343), (412, 349), (446, 372), (452, 470)]),
]


def luminance(img: np.ndarray) -> np.ndarray:
    return (0.114 * img[..., 0] + 0.587 * img[..., 1] + 0.299 * img[..., 2]).astype(np.float32)


def protect_mask() -> np.ndarray:
    m = np.zeros((H, W), np.uint8)
    for poly in PROTECT:
        cv2.fillPoly(m, [poly.astype(np.int32)], 255)
    return m


def build_text_mask(img: np.ndarray) -> np.ndarray:
    lum = luminance(img)
    # background estimate that ignores thin glyph strokes
    bg_lum = luminance(cv2.medianBlur(img, 41))
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    glyph = np.zeros((H, W), np.uint8)
    box = np.zeros((H, W), np.uint8)
    for x0, y0, x1, y1, mode in TEXT_BOXES:
        if mode == "box":
            cv2.rectangle(box, (x0, y0), (x1, y1), 255, -1)
            continue
        d = lum[y0:y1, x0:x1] - bg_lum[y0:y1, x0:x1]
        sub = (d > 22) | (lum[y0:y1, x0:x1] > 165)
        s = hsv[y0:y1, x0:x1]
        lilac = (s[..., 0] > 110) & (s[..., 0] < 170) & (s[..., 1] > 60) & (s[..., 2] > 115)
        glyph[y0:y1, x0:x1] |= ((sub | lilac).astype(np.uint8) * 255)
    # glyphs carry a dark outline + soft glow: grow generously
    glyph = cv2.morphologyEx(glyph, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
    glyph = cv2.dilate(glyph, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (15, 15)))
    box = cv2.dilate(box, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (13, 13)))
    clip = np.zeros_like(glyph)
    for x0, y0, x1, y1, _ in TEXT_BOXES:
        cv2.rectangle(clip, (x0 - 8, y0 - 8), (x1 + 8, y1 + 8), 255, -1)
    mask = cv2.bitwise_and(glyph | box, clip)
    return cv2.bitwise_and(mask, cv2.bitwise_not(protect_mask()))


def push_pull(img: np.ndarray, known: np.ndarray) -> np.ndarray:
    """Pyramid push-pull fill: smooth, colour-faithful fill of unknown pixels."""
    m = known.astype(np.float32)
    src = img.astype(np.float32) * m[..., None]
    levels = []
    cur_i, cur_m = src, m
    while min(cur_m.shape) > 4:
        levels.append((cur_i, cur_m))
        cur_i = cv2.pyrDown(cur_i)
        cur_m = cv2.pyrDown(cur_m)
    filled = cur_i / np.maximum(cur_m[..., None], 1e-5)
    for li, lm in reversed(levels):
        up = cv2.resize(filled, (li.shape[1], li.shape[0]), interpolation=cv2.INTER_LINEAR)
        known_c = li / np.maximum(lm[..., None], 1e-5)
        a = np.clip(lm * 1.5, 0, 1)[..., None]
        filled = known_c * a + up * (1 - a)
    return filled


def planet_disk(r_pad: float = 0.0) -> np.ndarray:
    """Antialiased planet disk in [0,1]."""
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.hypot(xx - PLANET_C[0], yy - PLANET_C[1])
    return np.clip(PLANET_R + r_pad - d + 0.5, 0, 1)


def remove_text(img: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    mask = build_text_mask(img)
    hole = mask > 0
    imgf = img.astype(np.float32)
    disk = planet_disk()
    inside = disk > 0.5

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    rel_x, rel_y = xx - PLANET_C[0], yy - PLANET_C[1]
    ang = np.degrees(np.arctan2(rel_y, rel_x))
    rad = np.hypot(rel_x, rel_y)
    blur = cv2.GaussianBlur(imgf, (0, 0), 9)
    dist_in_hole = cv2.distanceTransform(hole.astype(np.uint8), cv2.DIST_L2, 5)

    # 1) sky: smooth push-pull from surrounding sky only
    fill_out = push_pull(img, (~hole) & ~cv2.dilate(inside.astype(np.uint8), np.ones((5, 5))).astype(bool))

    # 2) planet low frequency: a smooth lighting model (colour = quadratic in N.L on
    #    the sphere) fitted to the visible globe, plus the locally interpolated residual
    #    so the fill meets the untouched pixels without seams.
    nx, ny = rel_x / PLANET_R, rel_y / PLANET_R
    nz = np.sqrt(np.clip(1 - nx * nx - ny * ny, 0, 1))
    chars = (xx < 470) & (yy > 335)
    fit_px = (~hole) & inside & (rad < PLANET_R - 8) & (yy < 470) & ~chars & ~((xx > 930) & (yy > 190))
    best = None
    for az in range(-90, 1, 6):
        for el in (5, 15, 25, 35, 45, 55):
            L = (np.cos(np.radians(el)) * np.cos(np.radians(az)),
                 np.cos(np.radians(el)) * np.sin(np.radians(az)),
                 np.sin(np.radians(el)))
            ndl = nx * L[0] + ny * L[1] + nz * L[2]
            v = ndl[fit_px]
            A = np.c_[np.ones_like(v), v]
            coef, res, *_ = np.linalg.lstsq(A, blur[fit_px], rcond=None)
            err = float(np.sum(res)) if len(res) else 0.0
            if best is None or err < best[0]:
                best = (err, ndl, coef)
    _, ndl, coef = best
    model = np.stack([np.ones_like(ndl), ndl], -1) @ coef
    # never extrapolate past the measured night-side / lit-side colours (BGR)
    model = np.clip(model, np.array([70, 36, 24], np.float32), np.array([236, 171, 115], np.float32))
    resid_px = (~hole) & inside & (rad < PLANET_R - 4) & ~chars
    residual = push_pull(np.clip(blur - model + 128, 0, 255), resid_px) - 128
    atten = np.exp(-dist_in_hole / 70.0)[..., None]
    fill_in = model + residual * atten

    # 3) planet detail: borrow surface texture by rotating the clean (upper-right)
    #    part of the globe around the planet centre onto the hole, both directions
    detail = np.clip(imgf - blur, -60, 60)
    clean_src = ((~hole) & inside & (ang > -118) & (ang < -40) & (rad < PLANET_R - 6)).astype(np.float32)
    borrowed = np.zeros_like(imgf)
    got = np.zeros((H, W), np.float32)
    for deg in (30, -30, 50, -50, 70, 90, 110, 130):
        a = np.radians(deg)
        sx = (PLANET_C[0] + rel_x * np.cos(a) - rel_y * np.sin(a)).astype(np.float32)
        sy = (PLANET_C[1] + rel_x * np.sin(a) + rel_y * np.cos(a)).astype(np.float32)
        ok = cv2.remap(clean_src, sx, sy, cv2.INTER_LINEAR, borderValue=0)
        take = np.clip(ok - got, 0, 1)
        borrowed += cv2.remap(detail, sx, sy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT) * take[..., None]
        got += take
    # night side carries less visible detail
    lum_in = luminance(np.clip(fill_in, 0, 255))
    k = np.clip(lum_in / 75.0, 0.15, 1.0)[..., None]
    fill_in = fill_in + borrowed * k

    # 3) limb rim: average radial profile of the clean top limb, re-applied on the filled arc
    d = rad
    rim_band = np.exp(-((d - (PLANET_R - 3)) / 4.0) ** 2)[..., None]
    rim_color = np.array([255, 190, 120], np.float32)  # BGR soft blue-white limb glow
    fill_in = fill_in + rim_band * rim_color * 0.18

    fill = fill_in * disk[..., None] + fill_out * (1 - disk[..., None])

    # 4) Telea near hole borders keeps structure continuous, fill dominates deep inside
    telea = cv2.inpaint(img, mask, 5, cv2.INPAINT_TELEA).astype(np.float32)
    w = np.clip(dist_in_hole / 6.0, 0, 1)[..., None]
    fill = telea * (1 - w) + fill * w

    # 5) re-grain so the area matches the illustration's texture
    rng = np.random.default_rng(7)
    fill += rng.normal(0, 2.2, fill.shape[:2]).astype(np.float32)[..., None]

    # feathered composite
    soft = cv2.GaussianBlur(hole.astype(np.float32), (0, 0), 4.0)
    soft = np.maximum(soft, hole.astype(np.float32))[..., None]
    out = imgf * (1 - soft) + np.clip(fill, 0, 255) * soft
    return np.clip(out, 0, 255).astype(np.uint8), mask


# --------------------------------------------------------------------------------------
# Region definitions (source px) — mirrored in src/config/heroLayout.ts
# --------------------------------------------------------------------------------------
WATERFALLS = [  # x0, y0, x1, y1
    (38, 338, 122, 452), (0, 515, 72, 628),
    (1070, 594, 1094, 692), (1134, 570, 1180, 692), (1248, 550, 1328, 692),
    (1443, 512, 1548, 652), (838, 688, 888, 798), (1044, 698, 1118, 778),
]
LAKE = [(830, 806), (1000, 798), (1150, 806), (1372, 812), (1395, 850), (1362, 902),
        (1150, 912), (950, 906), (838, 884)]
RING = [(858, 356), (858, 326), (958, 298), (1028, 270), (1004, 214), (1022, 199), (1192, 202),
        (1292, 211), (1352, 222), (1354, 242), (1262, 259), (1192, 280), (1100, 297),
        (1000, 324), (930, 344)]
# floating rocks: cx, cy, rx, ry (also drive per-rock bobbing in the shader)
ROCKS = [
    (992, 356, 50, 60), (1045, 381, 28, 41), (1233, 346, 57, 56), (1095, 280, 15, 21),
    (1158, 306, 13, 19), (1142, 410, 21, 25), (1348, 250, 19, 27), (1323, 302, 11, 21),
    (1181, 406, 9, 13), (1345, 136, 68, 62), (1515, 111, 39, 41), (1555, 236, 17, 27),
    (1512, 245, 11, 17), (1573, 282, 10, 14), (1092, 432, 11, 15), (1052, 455, 9, 12),
]
CAPE_MALE = [(0, 452), (80, 450), (180, 456), (300, 448), (398, 450), (402, 482), (342, 502),
             (300, 542), (240, 602), (212, 642), (120, 624), (60, 684), (0, 694)]
HAIR_FEMALE = [(588, 545), (540, 558), (498, 600), (440, 650), (380, 690), (336, 722), (350, 764),
               (420, 792), (500, 802), (560, 742), (600, 692), (622, 642)]
CAPE_FEMALE = [(418, 760), (470, 730), (560, 712), (640, 700), (690, 724), (640, 790),
               (540, 822), (430, 826)]
HAIR_MALE = [(296, 440), (300, 380), (330, 350), (372, 340), (414, 347), (448, 372), (440, 420),
             (400, 410), (340, 440)]
CLOUD_ZONES = [
    [(0, 40), (330, 40), (330, 300), (250, 300), (240, 470), (0, 470)],
    [(1430, 130), (1672, 130), (1672, 470), (1560, 470), (1500, 300), (1430, 260)],
    [(280, 0), (620, 0), (600, 70), (300, 70)],
    [(660, 460), (1010, 460), (1010, 560), (660, 560)],
]
FAR_STRUCTURES = [(1175, 500), (1195, 330), (1290, 250), (1385, 180), (1408, 88), (1440, 88),
                  (1478, 196), (1560, 258), (1602, 330), (1672, 330), (1672, 520)]
RIGHT_CLIFF = [(980, 560), (1060, 545), (1300, 520), (1440, 470), (1560, 380), (1672, 360),
               (1672, 700), (980, 700)]
LEFT_CLIFF = [(0, 290), (90, 290), (180, 330), (240, 420), (240, 640), (0, 640)]
SHIP = [(1060, 760), (1100, 720), (1300, 660), (1460, 630), (1530, 640), (1540, 700),
        (1400, 760), (1240, 810), (1080, 812)]
FG_RIGHT = [(1380, 941), (1400, 820), (1480, 760), (1560, 700), (1672, 640), (1672, 941)]



def poly_mask(poly) -> np.ndarray:
    m = np.zeros((H, W), np.uint8)
    cv2.fillPoly(m, [np.array(poly, np.int32)], 255)
    return m


def ellipse_mask(cx, cy, rx, ry) -> np.ndarray:
    m = np.zeros((H, W), np.uint8)
    cv2.ellipse(m, (int(cx), int(cy)), (int(rx), int(ry)), 0, 0, 360, 255, -1)
    return m


def feather(m: np.ndarray, sigma: float) -> np.ndarray:
    f = m.astype(np.float32) / 255.0 if m.dtype == np.uint8 else m.astype(np.float32)
    return cv2.GaussianBlur(f, (0, 0), sigma)


def character_mask(img: np.ndarray) -> np.ndarray:
    """GrabCut both characters inside their bounding box, seeded with known body parts."""
    gc = np.full((H, W), cv2.GC_BGD, np.uint8)
    gc[330:941, 0:780] = cv2.GC_PR_BGD
    probable = poly_mask([(290, 345), (450, 360), (480, 700), (460, 941), (230, 941), (240, 660)])
    probable |= poly_mask([(520, 540), (680, 560), (780, 760), (760, 860), (560, 860), (500, 640)])
    probable |= poly_mask(CAPE_MALE) | poly_mask(HAIR_FEMALE) | poly_mask(CAPE_FEMALE)
    gc[probable > 0] = cv2.GC_PR_FGD
    sure = poly_mask([(320, 440), (440, 470), (430, 640), (360, 700), (310, 640)])
    sure |= poly_mask([(560, 570), (650, 580), (660, 700), (580, 720)])
    gc[sure > 0] = cv2.GC_FGD
    bgd, fgd = np.zeros((1, 65), np.float64), np.zeros((1, 65), np.float64)
    cv2.grabCut(img, gc, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
    m = np.where((gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD), 255, 0).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(m)
    keep = np.zeros_like(m)
    for i in range(1, n):
        if stats[i, cv2.CC_STAT_AREA] > 4000:
            keep[lab == i] = 255
    return keep


def build_maps(src: np.ndarray, plate: np.ndarray) -> dict[str, np.ndarray]:
    hsv = cv2.cvtColor(plate, cv2.COLOR_BGR2HSV).astype(np.float32)
    hh, ss, vv = hsv[..., 0], hsv[..., 1], hsv[..., 2]
    lum = luminance(plate)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

    # waterfalls: bright, low-saturation or cyan-blue streaks inside the boxes
    water = np.zeros((H, W), np.uint8)
    for x0, y0, x1, y1 in WATERFALLS:
        h_, s_, l_ = hh[y0:y1, x0:x1], ss[y0:y1, x0:x1], lum[y0:y1, x0:x1]
        sub = (l_ > 120) & ((s_ < 120) | ((h_ > 85) & (h_ < 125)))
        water[y0:y1, x0:x1] = np.where(sub, 255, water[y0:y1, x0:x1])
    water = cv2.morphologyEx(water, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_RECT, (3, 9)))
    water_f = np.clip(feather(cv2.dilate(water, np.ones((3, 3), np.uint8)), 1.5) * 1.3, 0, 1)

    # lake surface
    lake = poly_mask(LAKE) & np.where(lum > 55, 255, 0).astype(np.uint8)
    lake_f = np.clip(feather(lake, 3.0) * 1.2, 0, 1)

    # characters
    chars = character_mask(src)
    chars_f = feather(chars, 1.2)

    # clouds: soft, low-structure areas inside the cloud zones
    zone = np.zeros((H, W), np.uint8)
    for z in CLOUD_ZONES:
        zone |= poly_mask(z)
    gx = cv2.Sobel(lum, cv2.CV_32F, 1, 0, ksize=3)
    gy = cv2.Sobel(lum, cv2.CV_32F, 0, 1, ksize=3)
    edge = cv2.GaussianBlur(np.hypot(gx, gy), (0, 0), 4)
    cloudy = np.where((lum > 38) & (edge < 60), 255, 0).astype(np.uint8)
    cloud = zone & cloudy & ~chars & ~cv2.dilate(water, np.ones((15, 15), np.uint8))
    cloud_f = feather(cloud, 6.0) * feather(zone, 10.0)

    # cloth / hair sway amplitude (0..1, grows towards the free end)
    cm = poly_mask(CAPE_MALE) / 255.0 * np.clip((400 - xx) / 380.0, 0, 1) ** 1.2
    hf = poly_mask(HAIR_FEMALE) / 255.0 * np.clip(np.hypot(xx - 600, yy - 560) / 300.0, 0, 1)
    cf = poly_mask(CAPE_FEMALE) / 255.0 * np.clip((680 - xx) / 260.0, 0, 1) * 0.8
    hm = poly_mask(HAIR_MALE) / 255.0 * np.clip((430 - yy) / 90.0, 0, 1) * 0.5
    sway = np.maximum.reduce([cm, hf, cf, hm]).astype(np.float32) * (chars_f > 0.3)
    sway = cv2.GaussianBlur(sway, (0, 0), 3.0)

    # emissive lights: saturated cyan / magenta / orange highlights + crystals
    cyan = (hh > 82) & (hh < 108) & (ss > 130) & (vv > 225)
    magenta = (hh > 138) & (hh < 168) & (ss > 150) & (vv > 238)
    orange = (hh > 5) & (hh < 25) & (ss > 150) & (vv > 240)
    rel0 = np.hypot(xx - PLANET_C[0], yy - PLANET_C[1])
    not_sky = (yy > 300) | (xx > 1380)          # lights live in the landscape / fortress
    emis = (cyan | magenta | orange) & not_sky & (rel0 > PLANET_R + 6)
    emis = np.where(emis, 255, 0).astype(np.uint8) & ~poly_mask(LAKE)
    emis = cv2.morphologyEx(emis, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))
    glow_f = np.clip(feather(cv2.dilate(emis, np.ones((5, 5), np.uint8)), 4.0) * 1.6, 0, 1)

    # planet surface that may rotate (exclude ring, rocks, characters, horizon haze)
    rel = np.hypot(xx - PLANET_C[0], yy - PLANET_C[1])
    planet = np.where(rel < PLANET_R - 5, 255, 0).astype(np.uint8)
    ring = poly_mask(RING) & np.where(lum > 95, 255, 0).astype(np.uint8)
    ring = cv2.dilate(ring, np.ones((5, 5), np.uint8))
    rocks = np.zeros((H, W), np.uint8)
    for cx, cy, rx, ry in ROCKS:
        rocks |= ellipse_mask(cx, cy, rx + 6, ry + 6)
    planet_rot = planet & ~ring & ~rocks & ~cv2.dilate(chars, np.ones((9, 9), np.uint8))
    planet_rot &= np.where(yy < 540, 255, 0).astype(np.uint8)
    planet_rot_f = feather(planet_rot, 5.0) * np.clip((PLANET_R - rel) / 30.0, 0, 1)
    ring_f = feather(ring, 1.5)

    # depth (0 = far sky, 1 = nearest foreground)
    depth = np.zeros((H, W), np.float32)
    depth = np.where(rel < PLANET_R, 0.12, depth)
    for cx, cy, r, d in [(1115, 125, 46, 0.07), (975, 75, 24, 0.05)]:
        depth = np.where(np.hypot(xx - cx, yy - cy) < r, d, depth)
    depth = np.where(poly_mask(RING) > 0, 0.16, depth)
    depth = np.where(poly_mask(FAR_STRUCTURES) > 0, 0.30, depth)
    horizon = np.clip((yy - 520) / 420.0, 0, 1)
    land = (yy > 540).astype(np.float32)
    depth = np.maximum(depth, land * (0.28 + 0.6 * horizon))
    depth = np.where(poly_mask(RIGHT_CLIFF) > 0, np.maximum(depth, 0.46), depth)
    depth = np.where(poly_mask(LEFT_CLIFF) > 0, np.maximum(depth, 0.42), depth)
    for i, (cx, cy, rx, ry) in enumerate(ROCKS):
        depth = np.where(ellipse_mask(cx, cy, rx, ry) > 0, 0.26 + 0.04 * (i % 4), depth)
    depth = np.where(poly_mask(SHIP) > 0, 0.66, depth)
    depth = np.where(poly_mask(FG_RIGHT) > 0, 0.86, depth)
    depth = cv2.GaussianBlur(depth.astype(np.float32), (0, 0), 6)
    # characters: crisp silhouettes, a touch in front of the rock they stand on
    char_depth = np.clip(0.62 + (yy - 600) / 1200.0, 0.62, 0.9)
    depth = depth * (1 - chars_f) + char_depth * chars_f
    depth = cv2.GaussianBlur(depth, (0, 0), 1.5)

    def pack(r, g, b):
        rgb = np.stack([b, g, r], -1)  # OpenCV writes BGR
        return np.clip(rgb * 255 + 0.5, 0, 255).astype(np.uint8)

    return {
        "a": pack(depth, water_f, lake_f),
        "b": pack(cloud_f, sway, glow_f),
        "c": pack(planet_rot_f, ring_f, chars_f),
    }


def main() -> None:
    img = cv2.imread(SRC, cv2.IMREAD_COLOR)
    if img is None or img.shape[:2] != (H, W):
        sys.exit(f"expected {W}x{H} image at {SRC}")
    plate, tmask = remove_text(img)
    if DEBUG:
        cv2.imwrite(os.path.join(DEBUG, "text_mask.png"), tmask)
        cv2.imwrite(os.path.join(DEBUG, "plate.png"), plate)
    cv2.imwrite(os.path.join(OUT, "hero-plate.webp"), plate, [cv2.IMWRITE_WEBP_QUALITY, 90])

    # social preview: the original key art (with its typography) at 1200x675
    og = cv2.resize(img, (1200, 675), interpolation=cv2.INTER_AREA)
    cv2.imwrite(os.path.join(OUT, "og-image.jpg"), og, [cv2.IMWRITE_JPEG_QUALITY, 86])

    maps = build_maps(img, plate)
    for k, m in maps.items():
        # maps are sampled smoothly in the shader: half resolution is plenty
        half = cv2.resize(m, (W // 2, H // 2), interpolation=cv2.INTER_AREA)
        cv2.imwrite(os.path.join(OUT, f"hero-maps-{k}.png"), half, [cv2.IMWRITE_PNG_COMPRESSION, 9])
        if DEBUG:
            cv2.imwrite(os.path.join(DEBUG, f"maps_{k}.png"), m)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Auto-trace terrain from gwmap.png by sampling pixels at each parent-hex
center and classifying via nearest-centroid in the calibrated palette.

Outputs:
  gw-terrain-data.js       JS module with TERRAIN_DATA array
  gw-terrain-preview.png   Same dims as input, hex-fill of detected terrain
                           for visual QA
"""

import sys, math, json
from collections import Counter
from PIL import Image, ImageDraw
import numpy as np

# ── Geometry: mirrors gw-map.html exactly ──────────────────────────────────
HEX_R = 16
SQRT3 = math.sqrt(3)
HEX_STEP_X = HEX_R * SQRT3
HEX_STEP_Y = HEX_R * 1.5
WORLD_W = 3001
WORLD_H = 1863
COLS = math.ceil(WORLD_W / HEX_STEP_X) + 1
ROWS = math.ceil(WORLD_H / HEX_STEP_Y) + 1

def col_row_to_center(col, row):
    x = col * HEX_STEP_X + (HEX_STEP_X / 2 if row % 2 else 0)
    y = row * HEX_STEP_Y
    return x, y

# ── Palette: terrain → list of representative RGB centroids ────────────────
# Each terrain has 1-3 centroids: one from sampling the printed legend
# (gm_map_key.png) plus K-means clusters from the actual gwmap.png.
PALETTE = {
    'water': [
        (114, 163, 185),  # legend swatch "Lakes or Seas"
        (134, 184, 212),  # K-means light blue
        (85, 130, 159),   # K-means medium blue
    ],
    'plains': [
        (230, 176, 78),   # legend "Plains or Grasslands"
        (224, 180, 96),   # K-means tan-yellow
    ],
    'desert': [
        (234, 210, 76),   # legend "Deserts or Savannahs"
    ],
    'forest': [
        (118, 175, 87),   # legend "Forested"
        (100, 166, 104),  # K-means
        (141, 181, 107),  # K-means yellow-green
    ],
    'heavy-forest': [
        (19, 79, 78),     # legend "Heavily Forested" (also covers Coasts)
        (44, 99, 96),     # K-means dark teal
        (64, 138, 98),    # K-means darker green
    ],
    'mountains': [
        (84, 73, 75),     # legend "Mountains" (peak color)
        (118, 96, 71),    # K-means brown (tan-with-peaks)
        (163, 133, 94),   # K-means medium brown
    ],
    'snow-mountains': [
        (203, 175, 146),  # legend "Snow-Capped Mountains"
        (217, 220, 222),  # K-means near-white
    ],
    'deathlands': [
        (201, 142, 153),  # legend "Deathlands" (also "Ruins of the Ancients")
        (196, 165, 154),  # K-means light pink-tan
    ],
}

# Per-terrain solid color used in the verification PNG
PREVIEW_COLOR = {
    'water':          (114, 163, 185),
    'plains':         (230, 176, 78),
    'desert':         (234, 210, 76),
    'forest':         (118, 175, 87),
    'heavy-forest':   (40, 100, 80),
    'mountains':      (110, 80, 70),
    'snow-mountains': (220, 215, 215),
    'deathlands':     (210, 145, 160),
    'unknown':        (60, 60, 60),
}

# Flatten centroids for fast nearest-neighbor matching
_centroid_rgb = []
_centroid_label = []
for label, rgbs in PALETTE.items():
    for rgb in rgbs:
        _centroid_rgb.append(rgb)
        _centroid_label.append(label)
_centroids = np.array(_centroid_rgb, dtype=np.float32)
_labels = _centroid_label

DARK_THRESHOLD = 100  # pixel sums below this likely text/borders/coast lines

# Overlay masks intentionally disabled — v0.2.0 ships the unfiltered classifier
# output and lets the GM correct artifacts via the gw-map.html click-to-edit UI.
OVERLAY_MASKS = []

def in_overlay_mask(cx, cy):
    return None

def classify_pixel(rgb):
    """Nearest-centroid classify with dark-pixel filter."""
    r, g, b = int(rgb[0]), int(rgb[1]), int(rgb[2])
    if r + g + b < DARK_THRESHOLD:
        return None  # text or border, ignore
    d = ((_centroids - np.array(rgb, dtype=np.float32)) ** 2).sum(-1)
    return _labels[int(d.argmin())]

def sample_hex(img_arr, cx, cy):
    """Sample center + 6 inner ring points at HEX_R/2; majority vote."""
    H, W, _ = img_arr.shape
    pts = [(cx, cy)]
    for i in range(6):
        a = -math.pi/2 + i * math.pi/3
        pts.append((cx + (HEX_R/2) * math.cos(a),
                    cy + (HEX_R/2) * math.sin(a)))

    votes = []
    for px, py in pts:
        ix, iy = int(round(px)), int(round(py))
        if 0 <= ix < W and 0 <= iy < H:
            label = classify_pixel(img_arr[iy, ix])
            if label is not None:
                votes.append(label)

    if not votes:
        return 'unknown'
    return Counter(votes).most_common(1)[0][0]

def hex_polygon_points(cx, cy, r):
    pts = []
    for i in range(6):
        a = -math.pi/2 + i * math.pi/3
        pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts

# ── Main ───────────────────────────────────────────────────────────────────
def main():
    print(f"loading gwmap.png ({WORLD_W}x{WORLD_H})...")
    img = Image.open('gwmap.png').convert('RGB')
    arr = np.array(img)

    print(f"classifying {COLS}x{ROWS} = {COLS*ROWS:,} parent hexes...")
    data = []
    out_of_bounds = 0
    for row in range(ROWS):
        for col in range(COLS):
            cx, cy = col_row_to_center(col, row)
            # Skip hexes whose centers are completely off the image
            if cx < 0 or cx >= WORLD_W or cy < 0 or cy >= WORLD_H:
                out_of_bounds += 1
                continue
            # Overlay regions (scale bar, compass) auto-classify
            forced = in_overlay_mask(cx, cy)
            if forced is not None:
                data.append({'col': col, 'row': row, 'terrain': forced})
                continue
            terrain = sample_hex(arr, cx, cy)
            data.append({'col': col, 'row': row, 'terrain': terrain})

    counts = Counter(d['terrain'] for d in data)
    print(f"\nclassification breakdown ({len(data):,} cells, {out_of_bounds} skipped off-image):")
    for terrain, n in counts.most_common():
        pct = 100 * n / len(data)
        print(f"  {terrain:14s} {n:5d}  {pct:5.1f}%")

    # Write data file
    out_js = 'gw-terrain-data.js'
    with open(out_js, 'w', encoding='utf-8') as f:
        f.write("// Auto-generated by gw-terrain-trace.py — do not edit by hand\n")
        f.write("// Source: gwmap.png (3001x1863, 1986 TSR 3e Meriga)\n")
        f.write(f"// Geometry: HEX_R=16 pointy-top odd-r, COLS={COLS} ROWS={ROWS}\n")
        f.write("'use strict';\n\n")
        f.write("window.GW_TERRAIN_DATA = ")
        f.write(json.dumps(data, separators=(',', ':')))
        f.write(";\n")
    print(f"\nwrote {out_js} ({len(data):,} entries)")

    # Verification PNG
    print("rendering preview PNG...")
    preview = Image.new('RGB', (WORLD_W, WORLD_H), (30, 30, 30))
    pdraw = ImageDraw.Draw(preview)
    for d in data:
        cx, cy = col_row_to_center(d['col'], d['row'])
        poly = hex_polygon_points(cx, cy, HEX_R)
        fill = PREVIEW_COLOR.get(d['terrain'], PREVIEW_COLOR['unknown'])
        pdraw.polygon(poly, fill=fill, outline=(40, 40, 40))
    preview.save('gw-terrain-preview.png', optimize=True)
    print("wrote gw-terrain-preview.png")

if __name__ == '__main__':
    main()

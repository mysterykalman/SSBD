#!/usr/bin/env python3
"""Turn the hand-made felt UI artwork into stretchable 9-slice images.

Each source (a pill, tile, bubble or panel on a transparent background) is cropped, scaled to about
twice its on-screen size, and rebuilt as: fixed start + ONE seamless stitch period + fixed end, on
each stretching axis. CSS then draws it with `border-image ... round`, so the stitches repeat whole
at any width instead of smearing. Writes src/client/felt/<name>.webp and felt-slices.json (the slice
insets the stylesheet uses).

Usage: python3 scripts/build-felt-assets.py <folder of source .webp/.png files>
"""
import json
import os
import sys

import numpy as np
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
OUT = os.path.join(ROOT, "src", "client", "felt")

# name: (target body height in px for the 2x image, axes that stretch)
SPECS = {
    "btn-primary": (120, "x"), "btn-primary-pressed": (120, "x"), "btn-secondary": (120, "x"),
    "btn-destructive": (120, "x"), "btn-positive": (120, "x"), "btn-ghost": (120, "x"), "btn-disabled": (120, "x"),
    "chip-green": (84, "x"), "chip-purple": (84, "x"), "chip-red": (84, "x"), "chip-yellow": (84, "x"),
    "tile-yellow": (170, "x"), "tile-cream": (170, "x"),
    "field-default": (130, "x"),
    "bubble-left": (230, "xy"),
    "panel-card": (560, "xy"),
}
# Variants recoloured from a source: name: (source, hue shift degrees, saturation x, value x)
VARIANTS = {
    "tile-teal": ("tile-yellow", 128, 0.5, 0.8),
    "chip-teal": ("chip-yellow", 128, 0.5, 0.8),
    "btn-secondary-pressed": ("btn-secondary", 0, 1.08, 0.92),
    "chip-cream": ("tile-cream", 0, 1.0, 1.0),
}


def load(path):
    return np.asarray(Image.open(path).convert("RGBA")).astype(np.float32)


def crop(a, pad=4):
    ys, xs = np.where(a[:, :, 3] > 12)
    y0, y1 = max(ys.min() - pad, 0), min(ys.max() + pad + 1, a.shape[0])
    x0, x1 = max(xs.min() - pad, 0), min(xs.max() + pad + 1, a.shape[1])
    return a[y0:y1, x0:x1]


def body_box(a):
    ys, xs = np.where(a[:, :, 3] > 230)
    return xs.min(), ys.min(), xs.max(), ys.max()


def strip_diff(a, i, j, w):
    """How different the w-wide column strips starting at i and j are (colour and alpha)."""
    return float(np.abs(a[:, i:i + w] - a[:, j:j + w]).mean())


def period_cut(a, lo, hi):
    """Pick a seamless repeat [s, s+p) inside columns lo..hi and the matching end start e.

    s+p continues exactly like s (the tile repeats seamlessly), and the source after e continues
    like the source after s+p (the end joins the last repeat seamlessly)."""
    w = 6
    span = hi - lo
    # Stitch period estimate: autocorrelation of the column-mean profile in the middle.
    prof = a[:, lo:hi, :3].mean(axis=(0, 2))
    # High-pass: remove the lighting gradient so only the stitch rhythm is left.
    k = max(9, span // 6) | 1
    prof = prof - np.convolve(prof, np.ones(k) / k, mode="same")
    prof = prof[k // 2: len(prof) - k // 2]
    best_p, best_c = None, -1e9
    for p in range(max(8, span // 40), max(9, len(prof) // 3)):
        c = float((prof[:-p] * prof[p:]).mean())
        if c > best_c:
            best_c, best_p = c, p
    s0 = lo + 2
    best = None
    for s in range(s0, s0 + best_p):
        for p in range(int(best_p * 0.85), int(best_p * 1.15) + 1):
            if s + p + w >= hi:
                continue
            d = strip_diff(a, s, s + p, w)
            if best is None or d < best[0]:
                best = (d, s, p)
    _, s, p = best
    # End: the latest start e (at least one period later) whose columns continue like s+p.
    # Search only the last two periods before the end cap, so the fixed end stays small.
    e_best = None
    for e in range(max(s + p, hi - 2 * p), hi - w):
        d = strip_diff(a, s + p, e, w)
        if e_best is None or d < e_best[0]:
            e_best = (d, e)
    e = e_best[1]
    return s, p, e


def rebuild_x(a, cap_frac=0.62, end_frac=None):
    bx0, by0, bx1, by1 = body_box(a)
    # Keep the ends whole: for a pill that is its half-circle cap (about half its height), for a
    # panel or bubble its rounded corner (a fraction of its shorter side). end_frac protects a
    # larger end (the bubble's tail).
    margin = min(by1 - by0, bx1 - bx0) * cap_frac
    lo = int(bx0 + margin)
    hi = int(bx1 - (min(by1 - by0, bx1 - bx0) * end_frac if end_frac else margin))
    s, p, e = period_cut(a, lo, hi)
    out = np.concatenate([a[:, :s], a[:, s:s + p], a[:, e:]], axis=1)
    return out, s, out.shape[1] - (s + p)


def rebuild_y(a, cap_frac, end_frac=None):
    t, left, right = rebuild_x(np.transpose(a, (1, 0, 2)), cap_frac, end_frac)
    return np.transpose(t, (1, 0, 2)), left, right


def recolour(a, hue, sat, val):
    rgb = a[:, :, :3] / 255.0
    img = Image.fromarray((rgb * 255).astype(np.uint8), "RGB").convert("HSV")
    hsv = np.asarray(img).astype(np.float32)
    # Only shift the felt, not the low-saturation cream stitching.
    felt = hsv[:, :, 1] > 70
    hsv[:, :, 0] = np.where(felt, (hsv[:, :, 0] + hue / 360 * 255) % 255, hsv[:, :, 0])
    hsv[:, :, 1] = np.where(felt, np.clip(hsv[:, :, 1] * sat, 0, 255), hsv[:, :, 1])
    hsv[:, :, 2] = np.clip(hsv[:, :, 2] * val, 0, 255)
    rgb2 = np.asarray(Image.fromarray(hsv.astype(np.uint8), "HSV").convert("RGB")).astype(np.float32)
    return np.dstack([rgb2, a[:, :, 3]])


def process(name, a, body_h, axes):
    a = crop(a)
    bx0, by0, bx1, by1 = body_box(a)
    scale = body_h / (by1 - by0)
    img = Image.fromarray(a.clip(0, 255).astype(np.uint8), "RGBA")
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    a = np.asarray(img).astype(np.float32)
    left = right = top = bottom = None
    if "y" in axes:
        # Vertical first, on the full-width shape; the bubble keeps its tail (bottom) whole.
        a, top, bottom = rebuild_y(a, 0.3, 0.62 if name.startswith("bubble") else None)
    if "x" in axes:
        a, left, right = rebuild_x(a, 0.62 if axes == "x" else 0.3)
    bx0, by0, bx1, by1 = body_box(a)
    H, W = a.shape[:2]
    if top is None:
        # Pills stretch vertically only in a thin band through the middle.
        top = int(by0 + (by1 - by0) * 0.42)
        bottom = H - int(by0 + (by1 - by0) * 0.58)
    out = Image.fromarray(a.clip(0, 255).astype(np.uint8), "RGBA")
    out.save(os.path.join(OUT, f"{name}.webp"), "WEBP", quality=86, method=6)
    return {"w": W, "h": H, "slice": [top, right, bottom, left], "body": [int(bx0), int(by0), int(W - 1 - bx1), int(H - 1 - by1)]}


def main(src):
    os.makedirs(OUT, exist_ok=True)
    files = {os.path.splitext(f)[0]: os.path.join(src, f) for f in os.listdir(src) if f.lower().endswith((".webp", ".png"))}
    manifest = {}
    for name, (body_h, axes) in SPECS.items():
        if name in files:
            manifest[name] = process(name, load(files[name]), body_h, axes)
    for name, (base, hue, sat, val) in VARIANTS.items():
        if name in files or base not in files:
            continue
        body_h, axes = SPECS[base]
        if name == "chip-cream":
            body_h = SPECS["chip-yellow"][0]
        manifest[name] = process(name, recolour(load(files[base]), hue, sat, val), body_h, axes)
    with open(os.path.join(OUT, "felt-slices.json"), "w") as fh:
        json.dump(manifest, fh, indent=1, sort_keys=True)
    for name, m in sorted(manifest.items()):
        print(f"{name:24} {m['w']}x{m['h']} slice={m['slice']} body={m['body']}")


if __name__ == "__main__":
    main(sys.argv[1])

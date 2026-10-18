#!/usr/bin/env python3
"""Derive SSBD launcher icons from the ORIGINAL embroidered felt artwork.

No AI-generated patch, new logo, or visual reinterpretation. This script
takes src/client/icons/icon-source.png, retains its original pixels and
mask-feathers only the surrounding nearly-white photograph backdrop.

Usage:
  python3 scripts/rebuild-pwa-icons.py
  python3 scripts/rebuild-pwa-icons.py --verify
Requires Pillow. Output is reproducible and committed as binary app assets.
"""
from __future__ import annotations

import argparse
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "src/client/icons"
SOURCE = ASSETS / "icon-source.png"

def cleaned_icon() -> Image.Image:
    image = Image.open(SOURCE).convert("RGB")
    if image.width != image.height:
        raise ValueError("Original embroidered icon must be square")
    w = image.width
    if w < 512:
        raise ValueError("Source icon must be at least 512px")

    # Original icon has a light photographic square behind a felt patch.
    # The neutral light backdrop is removed by a soft colour matte. Cream
    # felt has substantially more warm pigment; the dark stitches remain.
    colours = Image.new("L",image.size)
    inp = image.load()
    out = colours.load()
    for y in range(w):
        for x in range(w):
            r,g,b=inp[x,y]
            warmth=max(r-b,0)
            darkness=max(0,238-min(r,g,b))
            # Preserve felt and its original soft dark drop shadow.
            matte=max((warmth-9)*15, darkness*7)
            out[x,y]=max(0,min(255,round(matte)))

    # The original pillow patch has rounded corners. This only removes the
    # rectangular backdrop OUTSIDE that patch; the embroidered lettering,
    # patch seams, felt shadows and original colours are unchanged.
    geometry = Image.new("L",image.size,0)
    margin=round(w*0.022)
    radius=round(w*0.15)
    ImageDraw.Draw(geometry).rounded_rectangle(
        [margin,margin,w-margin-1,w-margin-1],radius=radius,fill=255
    )
    geometry=geometry.filter(ImageFilter.GaussianBlur(w*0.005))
    alpha=ImageChops.multiply(colours,geometry)
    patch=image.convert("RGBA")
    patch.putalpha(alpha)
    return patch

def write_all(make_preview=False):
    patch=cleaned_icon()
    patch.save(ASSETS/"icon-512.png",optimize=True)
    patch.resize((192,192),Image.Resampling.LANCZOS).save(
        ASSETS/"icon-192.png",optimize=True
    )
    patch.resize((180,180),Image.Resampling.LANCZOS).save(
        ASSETS/"apple-touch-icon.png",optimize=True
    )
    tiny=patch.resize((32,32),Image.Resampling.LANCZOS)
    tiny.save(ASSETS/"favicon-32.png",optimize=True)
    patch.save(ASSETS/"favicon.ico",format="ICO",sizes=[(16,16),(32,32),(48,48)])
    if make_preview:
        preview=Image.new("RGBA",patch.size,(49,37,105,255))
        preview.alpha_composite(patch)
        preview.convert("RGB").save(ROOT/"docs/pwa-icon-preview.jpg",quality=86,optimize=True)

def verify():
    for name,sz in [
        ("icon-512.png",512),("icon-192.png",192),
        ("apple-touch-icon.png",180),("favicon-32.png",32)
    ]:
        icon=Image.open(ASSETS/name).convert("RGBA")
        assert icon.size==(sz,sz),(name,icon.size)
        assert icon.getpixel((0,0))[3]==0,(name,"top-left not transparent")
        assert icon.getpixel((sz-1,sz-1))[3]==0,(name,"bottom-right not transparent")
        assert icon.getpixel((sz//2,sz//2))[3]>=245,(name,"logo not opaque")
        assert any(icon.getpixel((x,y))[3]>20 for x,y in [
            (sz//2,sz//4),(sz//4,sz//2),(sz*3//4,sz//2)
        ]),(name,"artwork missing")
    ico=Image.open(ASSETS/"favicon.ico")
    assert ico.format=="ICO"
    print("PASS: launcher icons use the original felt artwork and transparent outer corners")

if __name__=="__main__":
    parser=argparse.ArgumentParser()
    parser.add_argument("--verify",action="store_true")
    parser.add_argument("--preview",action="store_true")
    args=parser.parse_args()
    if not args.verify: write_all(args.preview)
    verify()

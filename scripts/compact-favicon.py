# Compact favicon mark derived from the approved app icon: its blue | orange split tile and
# two white speech bubbles with a dark outline (no lettering, which is unreadable at 16-48 px).
import sys
from PIL import Image, ImageDraw, ImageFilter
S = 1024
out = sys.argv[1]
def rounded_mask(size, r):
    m = Image.new("L", (size, size), 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], r, fill=255); return m
tile = Image.new("RGBA", (S, S))
d = ImageDraw.Draw(tile)
for y in range(S):  # same top-to-bottom shading as the artwork
    t = y / S
    blue = tuple(int(a + (b - a) * t) for a, b in zip((2, 182, 253), (2, 140, 245)))
    orange = tuple(int(a + (b - a) * t) for a, b in zip((253, 160, 3), (237, 99, 2)))
    d.line([(0, y), (S // 2, y)], fill=blue + (255,)); d.line([(S // 2, y), (S, y)], fill=orange + (255,))
INK, CREAM = (11, 15, 30, 255), (248, 245, 234, 255)
d.line([(S // 2, 0), (S // 2, S)], fill=CREAM, width=28)  # the cream divider
def bubble(cx, cy, rx, ry, tail):
    w = 46
    d.ellipse([cx - rx - w, cy - ry - w, cx + rx + w, cy + ry + w], fill=INK)
    d.polygon([(p[0] + dx, p[1] + dy) for p in tail for dx, dy in [(0, 0)]], fill=INK)
    d.ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=CREAM)
    inner = [(tail[0][0] + (cx - tail[0][0]) * 0.18, tail[0][1] - 40), tail[1], (tail[2][0] + (cx - tail[2][0]) * 0.18, tail[2][1] - 40)]
    d.polygon(inner, fill=CREAM)
# Two bubbles side by side, overlapping a little in the middle (as in the artwork).
bubble(355, 430, 250, 205, [(250, 560), (150, 800), (420, 620)])
bubble(675, 430, 250, 205, [(780, 560), (880, 800), (610, 620)])
# Redraw the left bubble's fill edge over the right one's outline? The artwork shows the right bubble in front.
tile.putalpha(rounded_mask(S, int(S * 0.22)))
for size, name in [(16, "c16"), (32, "c32"), (48, "c48"), (180, "c180"), (512, "c512")]:
    tile.resize((size, size), Image.LANCZOS).save(f"{out}/{name}.png")
tile.resize((256, 256), Image.LANCZOS).save(f"{out}/preview.png")

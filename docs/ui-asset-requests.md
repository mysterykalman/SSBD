# SSBD UI asset requests (for image generation)

Target look: `reference/ui-component-guide.webp` (the component sheet) + the fuzzy needle-felted characters.
The app renders every word, label and number as live text, so **no asset may contain text**. Images
supply the felt material, stitching, puffiness and icons; the code lays text on top and stretches
frames to fit any word length or language.

## How to make them

Paste this style line at the start of every prompt:

> Needle-felted wool craft, soft fuzzy fibres visible at the edges, warm studio lighting from the top
> left, subtle soft shadow underneath, handmade toy quality, matches a warm cream/oatmeal felt world
> with orange, golden yellow, teal, tomato red, sage green and soft purple accents. No text, no
> letters, no watermark. Transparent background PNG.

Delivery: PNG, transparent background (except the tileable textures), exact pixel size below. Name
each file exactly as listed and drop them all in one folder. I convert to WebP and wire them in.

**Stretchable pieces (marked 9-slice):** the code stretches only the middle. So: corners and ends must
look identical in shape, the middle stretch must be plain and even (no logos, no wrinkles that would
smear), and the shape must fill the canvas edge to edge with only the stated shadow margin.

---

## 1. Textures (tileable, opaque, seamless on all four edges)

| File | Size | Prompt (after the style line) |
|---|---|---|
| `tex-felt-page.png` | 1024×1024 | Seamless tileable texture of warm oatmeal-cream wool felt, flat, even lighting, very fine fibres, no seams or shapes. Opaque, no transparency. |
| `tex-felt-card.png` | 512×512 | Seamless tileable texture of light cream wool felt, slightly lighter and smoother than a page background, even lighting. Opaque. |
| `tex-felt-orange.png` | 512×512 | Seamless tileable golden-orange (#F4A62A) wool felt texture, even lighting. Opaque. |
| `tex-felt-teal.png` | 512×512 | Same, teal (#5FA8A0). |
| `tex-felt-red.png` | 512×512 | Same, warm tomato red (#E0584A). |
| `tex-felt-green.png` | 512×512 | Same, sage green (#7DB37A). |
| `tex-felt-purple.png` | 512×512 | Same, soft lavender purple (#9A82C9). |
| `tex-felt-blue.png` | 512×512 | Same, soft sky blue (#79A6D6). |
| `tex-felt-yellow.png` | 512×512 | Same, warm butter yellow (#F6C64A). |

## 2. Buttons (9-slice, no text, no icon)

Shape for all: a puffy felt pill, ends are perfect half-circles 80 px radius, straight middle section,
a dashed stitched seam running 10 px inside the edge, 12 px soft shadow below (inside the canvas).
Canvas 640×200, pill occupies the top 640×176.

| File | Prompt detail |
|---|---|
| `btn-primary.png` | Golden orange felt pill, raised and puffy, stitched seam in a slightly darker orange thread. |
| `btn-primary-pressed.png` | Same pill, darker caramel orange, flatter, shadow almost gone (looks pushed in). |
| `btn-secondary.png` | Cream felt pill with a light tan stitched seam, raised. |
| `btn-secondary-pressed.png` | Same, a shade darker beige, flatter, shadow almost gone. |
| `btn-destructive.png` | Soft coral-red felt pill, cream stitched seam. |
| `btn-positive.png` | Sage green felt pill, cream stitched seam. |
| `btn-ghost.png` | Very pale cream felt pill, low and flat, faint seam, very light shadow. |
| `btn-disabled.png` | Faded greyish-beige felt pill, flat, no shadow. |

## 3. Word tiles and chips (9-slice, no text)

| File | Size | Prompt detail |
|---|---|---|
| `tile-yellow.png` | 640×260 | Chunky rectangular felt game tile, golden yellow, rounded corners 36 px radius, thick puffy edge, dashed stitched seam 12 px inside the edge, 14 px soft shadow below. Middle area plain for text. |
| `tile-teal.png` | 640×260 | Same tile in teal felt with a cream stitched seam. |
| `tile-cream.png` | 640×260 | Same tile in cream felt with a tan stitched seam. |
| `tile-hidden.png` | 640×260 | Empty outline of a tile: pale cream felt, the edge is only a loose dashed stitched line, no shadow (a "not revealed yet" placeholder). |
| `chip-cream.png` | 400×120 | Small felt history chip, cream, rounded corners 28 px, stitched seam, small shadow. |
| `chip-green.png` | 400×120 | Same chip in sage green felt (correct / match). |
| `chip-red.png` | 400×120 | Same in coral red felt (you). |
| `chip-purple.png` | 400×120 | Same in lavender felt (the other player / character). |
| `chip-teal.png` | 400×120 | Same in teal felt. |
| `chip-yellow.png` | 400×120 | Same in golden yellow felt (selected mode). |

## 4. Panels, fields, bubbles (9-slice, no text)

| File | Size | Prompt detail |
|---|---|---|
| `panel-card.png` | 900×900 | Large flat cream felt panel with rounded corners 64 px radius, dashed stitched seam 14 px inside the edge, subtle soft shadow 18 px below. Totally plain middle. |
| `panel-modal.png` | 900×900 | Same panel but slightly puffier and lighter, stronger soft shadow (a pop-up). |
| `field-default.png` | 900×150 | Recessed text-input field: light cream felt sunk slightly into the surface, rounded 40 px corners, faint inner shadow along the top edge, thin tan stitched outline. |
| `field-focus.png` | 900×150 | Same field with a blue stitched outline and a soft blue glow. |
| `field-error.png` | 900×150 | Same field tinted very pale pink with a red stitched outline. |
| `bubble-left.png` | 900×300 | Cream felt speech bubble, rounded 48 px corners, stitched seam, small rounded tail on the LEFT side 60 px from the top, soft shadow. |
| `bubble-up.png` | 900×300 | Same bubble with the tail centred on the TOP edge. |
| `toast-green.png` | 900×200 | Rounded 40 px felt banner, sage green, cream stitched seam, soft shadow. |
| `toast-blue.png` | 900×200 | Same in soft blue. |
| `toast-red.png` | 900×200 | Same in coral red. |
| `toast-yellow.png` | 900×200 | Same in golden yellow. |
| `empty-dashed.png` | 900×600 | Rounded 48 px rectangle drawn only as a loose dashed tan stitch line on transparent, no fill (empty-state frame). |

## 5. Progress and counters (single objects, transparent)

| File | Size | Prompt detail |
|---|---|---|
| `dot-red.png` | 128×128 | A single round felt pom-pom ball, tomato red, fuzzy, soft shadow, centred. |
| `dot-orange.png` | 128×128 | Same pom-pom, golden orange. |
| `dot-teal.png` | 128×128 | Same pom-pom, teal. |
| `dot-green.png` | 128×128 | Same pom-pom, sage green. |
| `dot-purple.png` | 128×128 | Same pom-pom, lavender. |
| `dot-empty.png` | 128×128 | Same pom-pom, pale beige, slightly flatter (not used yet). |
| `dot-current.png` | 128×128 | Beige pom-pom with a darker brown stitched ring around it (the current step). |
| `stitch-dash.png` | 128×32 | A short horizontal line of tan running stitches, tileable left-to-right, for connecting dots. |

## 6. Icons (felt appliqué, 128×128 each, centred, transparent)

Each a small cut-felt shape with a stitched edge, readable at 24 px. Brown-ink (#3A2A27) felt unless
a colour is given.

`icon-together.png` two people, `icon-star.png` star (golden), `icon-glasses.png` round glasses (Gary),
`icon-cap.png` baseball cap with a tiny tree patch (Milo, red), `icon-check.png` check mark in a green
circle, `icon-alert.png` exclamation in a red circle, `icon-info.png` lowercase-i shape in a blue
circle (a shape, not a letter), `icon-bulb.png` lightbulb (golden), `icon-sparkle.png` four-point
sparkle (golden), `icon-undo.png` curved back arrow, `icon-replay.png` circular arrow, `icon-chevron.png`
right-pointing chevron, `icon-back.png` left arrow, `icon-close.png` X, `icon-heart.png` red heart,
`icon-gear.png` gear, `icon-bell.png` bell, `icon-question.png` question-mark shape, `icon-keyboard.png`
small keyboard, `icon-lock.png` padlock.

## 7. Decorations (transparent)

| File | Size | Prompt detail |
|---|---|---|
| `spark-burst-left.png` | 160×160 | Three short golden-orange felt dashes fanning out like a little "shine" burst, pointing up-left. |
| `spark-burst-right.png` | 160×160 | Same burst, mirrored, pointing up-right. |
| `confetti-sheet.png` | 1024×256 | 8 separate small felt confetti pieces in a row (squares, dots, short squiggles) in orange, teal, red, purple, yellow, evenly spaced with clear gaps. |
| `empty-cards.png` | 400×320 | Two blank square felt cards (beige and pale tan) leaning on each other, playful, no marks on them. |
| `stage-floor.png` | 1200×200 | A soft felt "floor" strip: a gently curved mound of cream felt with a stitched top edge, for characters to stand on; plain, stretches horizontally. |

## 8. Characters and logo (transparent, cut out cleanly)

| File | Size | Prompt detail |
|---|---|---|
| `gary.png` | ≥ 800 px tall | The existing Gary character, same look, clean cut-out with NO background patch (the current file has a dark green blob behind his shoulders). Waist-up. |
| `milo.png` | ≥ 800 px tall | The new Milo image you supplied, cut out from the tan background (fully transparent), waist-up. |
| `pam.png` | ≥ 800 px tall | The existing Pam character, same look, full length, clean cut-out. The current file is only 159×220, too small to show large. |
| `gary-avatar.png` / `milo-avatar.png` / `pam-avatar.png` | 512×512 | Head-and-shoulders crop of each character, centred face, transparent background. |
| `logo.png` | ≥ 1000 px wide | The existing "Same Same but Different" logo, same design, larger export. Text here is fine, it is the logo. |

---

### Minimum set for a first pass

If that's too many at once, start with these 15. Together they make Home, the game board and Pam feel felted:
`tex-felt-page`, `tex-felt-card`, `btn-primary`, `btn-primary-pressed`, `btn-secondary`, `tile-yellow`,
`tile-teal`, `panel-card`, `field-default`, `bubble-left`, `dot-red`, `dot-orange`, `dot-teal`, `dot-empty`, `milo.png` (cut out).

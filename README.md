# Acrylic Furniture

Calculator for minimalist rod and acrylic shelf units in the style of the HushLume
3 tier keyboard stand. Enter width, depth, total height and number of shelves; get a
parts list, hole positions for the acrylic, assembly steps with clamp heights, and a 3D
preview.
![Uploading image.png…]()

## Construction

- Chrome optical shaft posts stand in flange couplings (feet).
- Bottom sheet rests on the flanges, posts pass through holes, shaft collars lock it.
- Each upper shelf: a 90° cross clamp per post under the sheet holds a depth crossbar;
  a cross clamp per post over the sheet holds a width rail front and back.
- If the acrylic would sag more than span / 250, middle columns are added.

## Run

No build step. Serve the folder and open it:

```sh
python3 -m http.server 8000
# http://localhost:8000
```

Tests: `node --test`

## Assumptions to verify

- Flange (`FLANGES`) and cross clamp (`CLAMPS`) sizes come from Temu listing images
  (2026-10-24). Clamp length and some flange plate diameters were not shown; measure
  real parts and update.
- Clamps on that listing only go to 10 mm bore, so rods are limited to Ø6, 8, 10.
- Sag check treats fluted acrylic as solid sheet of the same thickness; fluted is stiffer
  along the flutes, weaker across.

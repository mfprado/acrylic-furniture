// Pure geometry and bill of materials for a rod + cross clamp + sheet shelf unit
// (acrylic or wood-based board).
// Construction (from the HushLume keyboard stand assembly video):
//   - Posts stand in flange couplings (feet). The bottom sheet sits on the flanges,
//     posts pass through holes in it, a shaft collar on top locks it down.
//   - Each upper shelf: a cross clamp on every post below the sheet holds a depth
//     crossbar the sheet rests on; a cross clamp above the sheet holds a width rail
//     front and back, sandwiching the sheet.
// All units mm, kg.

export const DEFAULTS = {
  width: 1200,
  depth: 250,
  height: 450,
  shelves: 2,
  thickness: 8,
  loadKg: 10, // spread load per shelf, used for the sag check
  finish: 'fluted', // 'fluted' or 'flat', only changes the 3D view
  material: 'acrylic', // key of SHEET_MATERIALS
  color: '#202d6a', // acrylic tint or MFC colour, only changes the 3D view
  rod: 'auto', // 'auto' or a stock diameter (6, 8, 10) chosen for looks
};

// Flange couplings from the Temu listing "1pc 45 Flange Coupling 3/4/5/6/8/10/12Mm Hole +
// 1pc Drive Shaft Set" (item 70M795KX30, £3.29, comes with a 50 mm shaft), read off the
// listing's dimension images on 2026-10-24. null = not shown in the images.
export const FLANGES = {
  6: { height: 12.1, hubD: 10, plateD: null, plate: 2.1 },
  8: { height: 13, hubD: 16, plateD: 24, plate: 3.2 },
  10: { height: 13, hubD: 16, plateD: null, plate: 3.2 },
  12: { height: 13, hubD: 16, plateD: 31.9, plate: 3.2 },
};

// Shelf sheet materials. E (bending stiffness, N/mm²) and density (kg/mm³) are typical
// handbook values; board stiffness varies by brand and grade, so the sag check is a guide.
// Wood board thicknesses are the ones the user's supplier stocks (B&Q style range).
export const SHEET_MATERIALS = {
  acrylic: { name: 'Cast acrylic', E: 3200, density: 1.19e-6, thicknesses: [3, 4, 5, 6, 8, 10, 12, 15, 20], color: null },
  plywood: { name: 'Plywood', E: 7000, density: 6.0e-7, thicknesses: [3, 4, 6, 9, 11], color: '#d6b98c' },
  mdf: { name: 'MDF', E: 3500, density: 7.5e-7, thicknesses: [3, 4, 6, 9, 11], color: '#b9946a' },
  osb: { name: 'OSB', E: 4900, density: 6.3e-7, thicknesses: [3, 4, 6, 9, 11], color: '#c9a568' },
  mfc: { name: 'MFC (melamine chipboard)', E: 3000, density: 6.8e-7, thicknesses: [3, 4, 6, 9, 11], color: null },
};
const G = 9.81;
const SAG_LIMIT_RATIO = 250; // allowed sag = span / 250
// Longest post stretch between horizontal rods, as a multiple of rod diameter. Rule of
// thumb, not a published figure: HushLume's Ø10 x 1450 mm shelf braces its posts about
// every 400 to 500 mm (40 to 50 d); 60 d leaves the 450 mm Ø8 stand unbraced, as sold.
const MAX_UNBRACED_RATIO = 60;
// Bores where a flange AND a cross clamp exist on Temu (the clamp listing stops at 10).
const ROD_STOCK_SIZES = [6, 8, 10];

// Choose the rod diameter from overall size. Thin rods for small pieces, thicker as
// the unit grows, always picking from ROD_STOCK_SIZES so clamps and flanges exist.
// No published rule exists for this. Anchored on the two HushLume pieces with known specs:
//   keyboard stand 400-600 wide x 350 tall -> Ø8; display shelf 1200 wide x 1450 tall -> Ø10.
// Height drives it (post slenderness is what the eye reads and what wobbles); width only
// keeps small pieces off Ø6, because long rails in Ø6 bow visibly.
export function rodDiameter(height, width) {
  if (height <= 300 && width <= 600) return 6;
  if (height <= 900) return 8;
  return 10;
}

// Cross clamps from the Temu listing "Two Cross Shaped Optical Axis Fixing Clips"
// (item 3GMWW64QKG, £2.12 per 2 pcs, models 6*6, 8*8, 10*10), read 2026-10-24.
// The images give only the square section; length is estimated at about 2.6x the
// section from the photos. Measure a real clamp and replace `len`.
export const CLAMPS = {
  6: { section: 12, len: 31, screw: 'M4' },
  8: { section: 15, len: 39, screw: 'M4' },
  10: { section: 20, len: 52, screw: 'M5' },
};

export function clampSize(d) {
  const c = CLAMPS[d];
  return { len: c.len, wid: c.section, hi: c.section };
}

// Mid span sag of a sheet supported on two crossbars, under its own weight plus load.
export function sheetSag({ span, depth, thickness, loadKg, material = 'acrylic' }) {
  const { E, density } = SHEET_MATERIALS[material];
  const I = (depth * thickness ** 3) / 12;
  const qSelf = density * depth * thickness * G; // N/mm
  const qLoad = (loadKg * G) / span; // N/mm
  return (5 * (qSelf + qLoad) * span ** 4) / (384 * E * I);
}

export function computeDesign(input) {
  const p = { ...DEFAULTS, ...input };
  const { width: W, depth: D, height: H, thickness: t } = p;
  const shelves = Math.max(2, Math.round(p.shelves));
  const mat = SHEET_MATERIALS[p.material] ? p.material : 'acrylic';

  const recommended = rodDiameter(H, W);
  const d = p.rod === 'auto' || p.rod == null ? recommended : Number(p.rod);
  if (!ROD_STOCK_SIZES.includes(d)) throw new Error(`Rod Ø${d} mm is not a stock size`);
  const clamp = clampSize(d);
  const flange = FLANGES[d];
  const fh = flange.height;
  // Crossbars and rails sit on the OUTSIDE of the posts (as in the HushLume photos), offset
  // by the clamp's bore spacing. Inset the posts so those rods still land just inside the
  // sheet edge.
  const reach = CLAMPS[d].len - CLAMPS[d].section;
  const inset = Math.round(reach + d / 2 + 2); // post hole centre from sheet edge
  // Cut-to-size shops (Cut My: whole mm, ±1 mm tolerance) drill whole millimetres, so round
  // up to leave at least 1 mm clearance. The collar and clamps cover the gap.
  const holeD = Math.ceil(d + 1);

  // Add post columns along the width until the sheet sag between crossbars is acceptable.
  let columns = 2;
  let span, sag;
  for (;;) {
    span = (W - 2 * inset) / (columns - 1);
    sag = sheetSag({ span, depth: D, thickness: t, loadKg: p.loadKg / (columns - 1), material: mat });
    if (sag <= span / SAG_LIMIT_RATIO || columns >= 5) break;
    columns++;
  }
  const xs = Array.from({ length: columns }, (_, i) => inset + i * span);
  const ys = [inset, D - inset];

  // Vertical layout. "top" means top face of the sheet.
  const bottomTop = fh + t;
  const topTop = H - clamp.hi;
  const levels = Array.from({ length: shelves }, (_, i) =>
    i === 0 ? bottomTop : bottomTop + (i * (topTop - bottomTop)) / (shelves - 1)
  );
  const clearGap = levels.length > 1 ? levels[1] - levels[0] - t - clamp.hi * 2 : 0;

  // Brace rows: same rods and clamps as a shelf but no sheet, added evenly inside any gap
  // where the post would run further than MAX_UNBRACED_RATIO x d without a horizontal rod.
  // Each brace height is where the lower (crossbar) clamp meets the upper (rail) clamp.
  const maxUnbraced = MAX_UNBRACED_RATIO * d;
  const braces = [];
  for (let i = 0; i + 1 < levels.length; i++) {
    const from = levels[i];
    const to = levels[i + 1] - t;
    const n = Math.ceil((to - from) / maxUnbraced) - 1;
    for (let k = 1; k <= n; k++) braces.push(from + (k * (to - from)) / (n + 1));
  }

  const posts = columns * 2;
  const upper = shelves - 1;
  const rows = upper + braces.length; // levels that carry crossbars, rails and clamps
  const postLength = H - 4; // rod sits in the flange hub, a few mm off the floor

  const rods = [
    { role: 'Post', length: postLength, qty: posts },
    { role: 'Depth crossbar', length: D, qty: rows * columns },
    { role: 'Width rail (front and back)', length: W, qty: rows * 2 },
  ];

  const parts = {
    rodDiameter: d,
    rods,
    rodTotalLength: rods.reduce((s, r) => s + r.length * r.qty, 0),
    flanges: posts,
    collars: posts,
    clamps: rows * posts * 2,
    sheets: { qty: shelves, width: W, depth: D, thickness: t, material: mat, materialName: SHEET_MATERIALS[mat].name, holeD, holes: xs.flatMap((x) => ys.map((y) => [x, y])) },
  };

  const warnings = [];
  if (sag > span / SAG_LIMIT_RATIO)
    warnings.push(`Shelf sags ${sag.toFixed(1)} mm even with ${columns} columns. Use a thicker sheet.`);
  if (clearGap < 60) warnings.push(`Only ${Math.round(clearGap)} mm clear between shelves.`);
  if (d < recommended)
    warnings.push(`Ø${d} is thinner than the Ø${recommended} suggested for this size; expect more brace rows and a less rigid frame.`);
  if (braces.length)
    warnings.push(`Added ${braces.length} brace row(s) so no post runs more than ${maxUnbraced} mm unbraced.`);
  if (columns > 2) warnings.push(`Added ${columns - 2} middle column(s) so ${t} mm ${SHEET_MATERIALS[mat].name.toLowerCase()} stays flat over ${W} mm.`);
  if (!SHEET_MATERIALS[mat].thicknesses.includes(t))
    warnings.push(`${SHEET_MATERIALS[mat].name} is not stocked in ${t} mm (${SHEET_MATERIALS[mat].thicknesses.join(', ')}).`);

  return { input: p, shelves, d, recommended, clamp, clampSpec: CLAMPS[d], flange, inset, columns, xs, ys, span, sag, levels, braces, clearGap, postLength, parts, warnings };
}

// Cut My (cutmy.co.uk) acrylic options, as their cut-to-size form asks for them (checked
// 2026-10-24). Hole positions are centres; whether their "Distance From Edge" means centre
// or hole edge is not stated on the page, so both are given.
export const CUTMY = {
  thicknesses: { clear: [2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30], opal: [3, 5, 10] },
  minEdge: 8,
  tolerance: 1,
  maxLength: 3050,
  maxWidth: 2030,
};

export function cutMyOrder(design) {
  const { parts, inset, input } = design;
  const s = parts.sheets;
  const notes = [];
  if (s.material === 'acrylic') {
    if (!CUTMY.thicknesses.clear.includes(s.thickness))
      notes.push(`${s.thickness} mm is not a Cut My clear acrylic thickness (${CUTMY.thicknesses.clear.join(', ')}).`);
    if (!CUTMY.thicknesses.opal.includes(s.thickness)) notes.push(`Opal only comes in ${CUTMY.thicknesses.opal.join(', ')} mm.`);
  } else {
    notes.push(`${s.materialName}: pick it under Cut My's wood sheets and check the thickness is offered there.`);
  }
  if (s.width > CUTMY.maxLength || s.depth > CUTMY.maxWidth) notes.push('Sheet is larger than Cut My can cut.');
  if (s.thickness < 8 && input.width >= 900) notes.push(`${s.thickness} mm is thin for a ${input.width} mm shelf; 8 or 10 mm recommended.`);
  return {
    length: s.width,
    width: s.depth,
    thickness: s.thickness,
    qty: s.qty,
    polishedEdges: true,
    holeD: s.holeD,
    edgeToCentre: inset,
    edgeToHoleEdge: Math.round((inset - s.holeD / 2) * 10) / 10,
    layout: s.holes.length === 4 ? 'Corners' : 'Edit Holes Individually',
    holes: s.holes.map(([x, y]) => [Math.round(x), Math.round(y)]),
    notes,
  };
}

// Measured heights from the floor, for marking clamp positions during assembly.
export function assemblySteps(design) {
  const { levels, input, clamp, parts, d } = design;
  const t = input.thickness;
  const steps = [
    `Fit a Ø${d} flange coupling on the bottom of each of the ${parts.flanges} posts and tighten the grub screws.`,
    `Stand the posts up and drop the bottom sheet over them so it rests on the flanges. Slide a shaft collar down each post onto the sheet and tighten.`,
  ];
  const events = [
    ...levels.slice(1).map((top, i) => ({ h: top, shelf: i + 2 })),
    ...design.braces.map((h) => ({ h, brace: true })),
  ].sort((a, b) => a.h - b.h);
  events.forEach(({ h: top, shelf: i, brace }) => {
    if (brace) {
      steps.push(
        `Brace row at ${Math.round(top)} mm: slide a cross clamp onto each post with its top at ${Math.round(top)} mm and push a ${input.depth} mm crossbar through each front and back pair. Stack a second clamp on each post right above it, push a ${input.width} mm rail through the front clamps and another through the back, and tighten.`
      );
      return;
    }
    i -= 2;
    const under = Math.round(top - t);
    steps.push(
      `Shelf ${i + 2}: slide a cross clamp onto each post with its top at ${under} mm from the floor. Push a ${input.depth} mm crossbar through each front and back pair and tighten.`,
      `Lower sheet ${i + 2} over the posts onto the crossbars. Slide a cross clamp onto each post down onto the sheet (top at ${Math.round(top + clamp.hi)} mm), push a ${input.width} mm rail through the front clamps and another through the back, and tighten everything.`
    );
  });
  steps.push('Check each shelf with a level and re-tighten every grub screw once.');
  return steps;
}

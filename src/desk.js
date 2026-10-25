// Geometry and bill of materials for a T-slot aluminium profile desk, after CPlot's
// Profile Desk Frame (1" 10-series extrusion, 48" x 24" top, 27" legs, corner brackets,
// gussets, mounting tabs and levelling feet). Metric profiles here: 2020, 3030, 4040.
// All units mm. Layout: x along the width, y front to back, z up.

export const DESK_DEFAULTS = {
  width: 1220,
  depth: 610,
  height: 740, // floor to the top of the frame
  profile: 'auto', // 'auto' or 20 / 30 / 40
  topThickness: 19, // 3/4 in plywood (with linoleum), flush between the top rails
  topFinish: 'linoleum', // 'linoleum' or 'plain'
  topColor: '#c9b8a3',
  stretchers: 'yes', // low side + back stretchers
  frameColor: '#949494',
  centreRail: 'no', // optional rail across the middle; splits the top into two panels
  loadKg: 50, // spread over the top: monitors, arms, things
  showTop: 'yes', // 3D view only: hide the top to see the frame and joining plates
};

// Standard metric T-slot profiles. Centre bore is tapped for the end thread (feet).
export const PROFILES = {
  20: { p: 20, slot: 6, endTap: 'M5', bolt: 'M5 x 10 button head', nut: 'M5 drop-in T-nut', footThread: 'M5' },
  30: { p: 30, slot: 8, endTap: 'M8', bolt: 'M6 x 12 button head', nut: 'M6 drop-in T-nut', footThread: 'M8' },
  40: { p: 40, slot: 8, endTap: 'M8', bolt: 'M8 x 16 button head', nut: 'M8 drop-in T-nut', footThread: 'M8' },
};

export const TAB_THICKNESS = 5; // joining plates (3/16") under the rails carry the inset top
const TAB_SPACING = 300; // joining plates on top of the rails, roughly every 300 mm
const SHEET_MAX = 2440; // longest standard plywood sheet (8 ft)
const SAG_LIMIT = 300; // span / 300, usual stiffness limit for a desk top
// Second moment of area (mm^4) of typical metric T-slot profiles; check your supplier's sheet.
const PROFILE_I = { 20: 0.7e4, 30: 2.7e4, 40: 9.0e4 };
const E_ALU = 69000; // MPa
const E_PLY = 7000; // MPa, birch/poplar plywood, bending along the face grain (conservative)

// Same idea as the shelf rod rule: thin for small pieces, heavier as the frame grows.
// CPlot's 1220 x 740 desk uses 1" (25.4 mm) profile, which sits between 2020 and 3030.
export function profileSize(width, height) {
  const span = Math.max(width, height);
  if (span <= 900) return 20;
  if (span <= 1600) return 30;
  return 40;
}

export function computeDesk(input) {
  const q = { ...DESK_DEFAULTS, ...input };
  const { width: W, depth: D, height: H, topThickness: tt } = q;
  const recommended = profileSize(W, H);
  const size = q.profile === 'auto' || q.profile == null ? recommended : Number(q.profile);
  const prof = PROFILES[size];
  const p = prof.p;

  // levelling mount for 1" rail (McMaster 47065T341) lifts the leg end about one profile
  const FOOT_HEIGHT = p;
  const railZ = H - p; // underside of the top rails
  // CPlot's top is inset: cut to fit between the rails, resting on the joining plates
  // bolted under them, so it sits flush with (or below) the top of the frame.
  const midRail = q.centreRail === 'yes';
  // a centre rail splits the opening, so the top becomes two panels
  const topW = midRail ? Math.round((W - 3 * p) / 2) : W - 2 * p;
  const topD = D - 2 * p;
  // Gap between the plates and the underside of the top, held by the bolts through the plates so the
  // top surface comes out flush with the rails.
  const topGap = p - tt;
  // Legs run up to the top of the frame; the rails fit between them (CPlot cover drawing).
  const legLength = Math.round(railZ + p - FOOT_HEIGHT);
  const stretcherZ = Math.round(FOOT_HEIGHT + legLength * 0.25); // underside of low stretchers
  const withStretchers = q.stretchers !== 'no';

  const cuts = [
    { role: 'Leg', length: legLength, qty: 4 },
    { role: 'Top rail, long (front and back)', length: W - 2 * p, qty: 2 },
    { role: 'Top rail, short (ends)', length: D - 2 * p, qty: 2 },
    ...(midRail ? [{ role: 'Centre rail (between the long rails)', length: D - 2 * p, qty: 1 }] : []),
  ];
  if (withStretchers) {
    cuts.push({ role: 'Low stretcher, ends', length: D - 2 * p, qty: 2 });
    cuts.push({ role: 'Low stretcher, back', length: W - 2 * p, qty: 1 });
  }

  // Fittings from CPlot's Studio Desk bill of materials (T-Nutz 10 series parts):
  //  - 4 Hole Inside Corner Gusset (CB-010-K): under each end of the long top rails (4),
  //    plus 2 lying flat in the back low corners joining the end and back stretchers
  //    (CPlot p.21-23; the BOM lists 4 of these and 6 of the 2 hole ones)
  //  - 2 Hole Inside Corner Gusset (CB-010-A): under each end of the short top rails (4)
  //  - 2 Hole Inside Corner Bracket (CBS-010-A): 8 in the BOM; CPlot's photos show them
  //    under the stretcher ends (6 joints). The other 2 are listed but not placed.
  //  - Hidden Corner Connector (HC-010-A, inside to inside): only on the optional centre
  //    rail, one each side of it at both ends. The stretcher corners use the brackets and
  //    the flat 4 hole gussets only (the BOM lists 6 connectors; their place is unclear).
  //  - 3 Hole Joining Plate: across the optional centre rail, carrying both top panels.
  //  - Joining Plate (JP-010-A): 12 across the top of the rails, one bolt + T-nut into the
  //    rail and one button head bolt up into the top through the overhanging hole (CPlot p.26-28)
  const backGussets = withStretchers ? 2 : 0; // 4 hole gussets flat in the back low corners
  const largeGussets = 4 + backGussets;
  const smallGussets = 4;
  const lBrackets = withStretchers ? 8 : 0;
  const hiddenConnectors = midRail ? 4 : 0; // centre rail only: one each side, both ends
  // centre rail: hidden corner connectors join it to the long rails; no plates on it
  const centreSupports = 0; // the hidden connectors already join and support the centre rail
  const threeHolePlates = centreSupports;
  const tabsLong = Math.max(2, Math.round(W / TAB_SPACING));
  const tabsShort = Math.max(1, Math.round(D / TAB_SPACING));
  const tabs = 2 * tabsLong + 2 * tabsShort;
  // bolts with a T-nut each; the 3 hole plates across the centre rail also take two button
  // head bolts up into the top panels through their outer holes (no T-nut)
  const fasteners = largeGussets * 4 + smallGussets * 2 + lBrackets * 2 + tabs + centreSupports;
  const bolts = fasteners + tabs + 2 * centreSupports; // + one up into the top per 2 hole plate

  const warnings = [];
  if (size < recommended)
    warnings.push(`${size}${size} profile is lighter than the ${recommended}${recommended} suggested for this size; expect more wobble.`);
  // No centre rail: the top is screwed to every rail through the joining plates, so it
  // ties the long rails together and shares the load. Two simple checks, both taken as
  // simply supported uniform loads (conservative: ignores the plate edge fixity and the
  // rail + top acting together):
  //  - plywood spanning front to back between the long rails, over the full width
  //  - each long rail carrying half the load over its length
  const load = Math.max(0, Number(q.loadKg) || 0) * 9.81; // N
  const sag = (P, L, EI) => (5 * P * L ** 3) / (384 * EI);
  const plyI = (topW * tt ** 3) / 12;
  const topSag = sag(load / (midRail ? 2 : 1), topD, E_PLY * plyI); // load shared by the panels
  // the centre rail hands its share to the long rails at mid span, so it does not help them
  const railSag = sag(load / 2, W - 2 * p, E_ALU * PROFILE_I[size]);
  const check = {
    load: q.loadKg,
    topSag,
    topLimit: topD / SAG_LIMIT,
    railSag,
    railLimit: (W - 2 * p) / SAG_LIMIT,
  };
  if (topSag > check.topLimit)
    warnings.push(`The ${tt} mm top sags about ${topSag.toFixed(1)} mm front to back under ${q.loadKg} kg (limit ${check.topLimit.toFixed(1)} mm). Use thicker plywood or a shallower desk.`);
  if (railSag > check.railLimit) {
    const better = [20, 30, 40].find((s) => sag(load / 2, W - 2 * s, E_ALU * PROFILE_I[s]) <= (W - 2 * s) / SAG_LIMIT);
    warnings.push(`The long rails sag about ${railSag.toFixed(1)} mm in the middle under ${q.loadKg} kg (limit ${check.railLimit.toFixed(1)} mm).${better && better > size ? ` Use ${better}${better} profile.` : ' Use a heavier profile or a narrower desk.'}`);
  }
  if (topW > SHEET_MAX) warnings.push(`The top (${topW} mm) is longer than a ${SHEET_MAX} mm plywood sheet; it would need a joint with nothing under it. Add a centre rail to split it into two panels.`);
  if (tt > p) warnings.push(`A ${tt} mm top is thicker than the ${size}${size} profile, so it stands ${tt - p} mm proud of the rails instead of flush.`);
  if (H < 600) warnings.push('Under 600 mm is coffee-table height, not a desk.');
  if (withStretchers && stretcherZ < 80) warnings.push('Low stretchers end up very close to the floor.');

  return {
    kind: 'desk',
    input: q,
    size,
    recommended,
    prof,
    p,
    railZ,
    topGap,
    legLength,
    stretcherZ,
    withStretchers,
    check,
    midRail,
    footHeight: FOOT_HEIGHT,
    parts: {
      cuts,
      profileTotal: cuts.reduce((s, c) => s + c.length * c.qty, 0),
      largeGussets,
      smallGussets,
      backGussets,
      lBrackets,
      hiddenConnectors,
      threeHolePlates,
      centreSupports,
      tabs,
      tabsLong,
      tabsShort,
      fasteners,
      bolts,
      feet: 4,
      top: { width: topW, depth: topD, thickness: tt, finish: q.topFinish, panels: midRail ? 2 : 1 },
    },
    warnings,
  };
}

export function deskRows({ parts, size, prof }) {
  const name = `${size}${size} T-slot profile`;
  return [
    ...parts.cuts.map((c) => [name, `${c.length} mm · ${c.role}`, c.qty]),
    ['4 Hole Inside Corner Gusset', `${size} series (CB-010-K equivalent)`, parts.largeGussets],
    ['2 Hole Inside Corner Gusset', `${size} series (CB-010-A equivalent)`, parts.smallGussets],
    ...(parts.lBrackets ? [['2 Hole Inside Corner Bracket', `${size} series (CBS-010-A equivalent)`, parts.lBrackets]] : []),
    ...(parts.hiddenConnectors ? [['Hidden Corner Connector', `${size} series (HC-010-A equivalent), set-screw`, parts.hiddenConnectors]] : []),
    ['Joining Plate', `${size} series, 2 holes (JP-010-A equivalent)`, parts.tabs],
    ...(parts.threeHolePlates ? [['3 Hole Joining Plate', `${size} series, straight, across the centre rail under the top`, parts.threeHolePlates]] : []),
    ['Bolt', `${prof.bolt}, flanged`, parts.bolts],
    ['T-nut', prof.nut, parts.fasteners],
    ['Levelling foot', `${prof.footThread} thread, into the leg end bore`, parts.feet],
    ['Plywood top', `${parts.top.width} × ${parts.top.depth} × ${parts.top.thickness} mm`, parts.top.panels],
    ...(parts.top.finish === 'linoleum' ? [['Linoleum sheet', `${parts.top.width} × ${parts.top.depth} mm, glued to the top`, parts.top.panels]] : []),
  ];
}

// Order follows CPlot's instructions, described the right way up. Each step lists the
// parts it adds; scene.js draws them from deskStepTags, which must stay parallel.
export function deskSteps(d) {
  const { input, prof, p, legLength, stretcherZ, withStretchers, midRail, parts } = d;
  const loose = 'Leave the T-nuts loose so they can slide into the slots.';
  return [
    `Short top rails (${input.depth - 2 * p} mm): bolt a 2 hole inside corner gusset to the underside of each end, with a T-nut on its free face. ${loose}`,
    `Long top rails (${input.width - 2 * p} mm): bolt a 4 hole inside corner gusset to the underside of each end, with two T-nuts on its free face. ${loose}`,
    `Legs (${legLength} mm, tap the foot end ${prof.endTap} if needed): slide a leg onto the gusset at each end of a long rail, top flush with the rail. Tighten. You now have two U frames.`,
    `Join the two U frames with the short rails, sliding their gussets into the legs, and tighten${midRail ? `. Add the centre rail at ${Math.round(input.width / 2)} mm between the long rails, level with them, with two hidden corner connectors at each end, one each side, in the inside corners` : ''}.`,
    ...(withStretchers
      ? [
          `End stretchers (${input.depth - 2 * p} mm): bolt a 2 hole inside corner bracket under each end, T-nut on the free face. Mark ${stretcherZ} mm up from the foot end of each leg, slide them in with their undersides on the marks and tighten the brackets.`,
          `Back stretcher (${input.width - 2 * p} mm): a corner bracket under each end, slide it in between the back legs at the same height and tighten.`,
          'Back corners: drop two T-nuts into the inner side slot of the end stretcher and two into the back stretcher, next to each back leg. Set a 4 hole inside corner gusset flat into the inside corner and bolt it to both stretchers, four screws per corner.',
        ]
      : []),
    `Screw a ${prof.footThread} levelling foot into the end of each leg.`,
    `Drop ${parts.tabs} T-nuts into the bottom slot of the top rails, about ${TAB_SPACING} mm apart. Bolt a joining plate under the rail at each, so its second hole sticks out under the opening for the top.`,
    `Drop the plywood (${parts.top.panels > 1 ? '2 panels, ' : ''}${parts.top.width} × ${parts.top.depth} mm, linoleum side up) in between the top rails. Drive a button head bolt up through each plate's free hole into the top, leaving a ${Math.max(0, d.topGap)} mm gap above the plate so the top sits flush with the rails.`,
    'Level the desk with the feet, then re-tighten every bolt once.',
  ];
}

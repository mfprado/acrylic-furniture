// Geometry and bill of materials for a T-slot aluminium profile desk, after CPlot's
// Profile Desk Frame (1" 10-series extrusion, 48" x 24" top, 27" legs, corner brackets,
// gussets, mounting tabs and levelling feet). Metric profiles here: 2020, 3030, 4040.
// All units mm. Layout: x along the width, y front to back, z up.

export const DESK_DEFAULTS = {
  width: 1220,
  depth: 610,
  height: 740, // floor to top surface
  profile: 'auto', // 'auto' or 20 / 30 / 40
  topThickness: 18, // plywood
  topFinish: 'linoleum', // 'linoleum' or 'plain'
  topColor: '#c9b8a3',
  stretchers: 'yes', // low side + back stretchers
  frameColor: '#c4c8cc',
};

// Standard metric T-slot profiles. Centre bore is tapped for the end thread (feet).
export const PROFILES = {
  20: { p: 20, slot: 6, endTap: 'M5', bolt: 'M5 x 10 button head', nut: 'M5 drop-in T-nut', footThread: 'M5' },
  30: { p: 30, slot: 8, endTap: 'M8', bolt: 'M6 x 12 button head', nut: 'M6 drop-in T-nut', footThread: 'M8' },
  40: { p: 40, slot: 8, endTap: 'M8', bolt: 'M8 x 16 button head', nut: 'M8 drop-in T-nut', footThread: 'M8' },
};

const FOOT_HEIGHT = 15; // levelling foot, screwed most of the way in
export const TAB_THICKNESS = 5; // joining plates (3/16") sit between the rails and the top
const TAB_SPACING = 300; // joining plates on top of the rails, roughly every 300 mm
const MID_RAIL_OVER = 1400; // add a centre top rail on wider desks

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

  const railZ = H - tt - TAB_THICKNESS - p; // underside of the top rails
  // Legs run up to the top of the frame; the rails fit between them (CPlot cover drawing).
  const legLength = Math.round(railZ + p - FOOT_HEIGHT);
  const stretcherZ = Math.round(FOOT_HEIGHT + legLength * 0.25); // underside of low stretchers
  const withStretchers = q.stretchers !== 'no';
  const midRail = W > MID_RAIL_OVER;

  const cuts = [
    { role: 'Leg', length: legLength, qty: 4 },
    { role: 'Top rail, long (front and back)', length: W - 2 * p, qty: 2 },
    { role: 'Top rail, short (ends)', length: D - 2 * p, qty: 2 + (midRail ? 1 : 0) },
  ];
  if (withStretchers) {
    cuts.push({ role: 'Low stretcher, ends', length: D - 2 * p, qty: 2 });
    cuts.push({ role: 'Low stretcher, back', length: W - 2 * p, qty: 1 });
  }

  // Fittings from CPlot's Studio Desk bill of materials (T-Nutz 10 series parts):
  //  - 4 Hole Inside Corner Gusset (CB-010-K): under each end of the long top rails (4)
  //  - 2 Hole Inside Corner Gusset (CB-010-A): under each end of the short top rails (4),
  //    plus 2 flat under the back stretcher corners, bolted up into both stretchers
  //  - 2 Hole Inside Corner Bracket (CBS-010-A): 8 in the BOM; CPlot's drawings show 6,
  //    on top of the stretcher ends. The other 2 are listed but not placed.
  //  - Hidden Corner Connector (HC-010-A): 6, inside the slots, not visible once fitted
  //  - Joining Plate (JP-010-A): 12 on top of the rails, each with 2 screws + 2 T-nuts
  const largeGussets = 4;
  const smallGussets = 4 + (midRail ? 2 : 0) + (withStretchers ? 2 : 0);
  const lBrackets = withStretchers ? 8 : 0;
  const hiddenConnectors = withStretchers ? 6 : 4;
  const tabsLong = Math.max(2, Math.round(W / TAB_SPACING));
  const tabsShort = Math.max(1, Math.round(D / TAB_SPACING));
  const tabs = 2 * tabsLong + 2 * tabsShort;
  const fasteners = largeGussets * 4 + smallGussets * 2 + lBrackets * 2 + tabs * 2;

  const warnings = [];
  if (size < recommended)
    warnings.push(`${size}${size} profile is lighter than the ${recommended}${recommended} suggested for this size; expect more wobble.`);
  if (midRail) warnings.push(`Added a centre top rail because the desk is wider than ${MID_RAIL_OVER} mm.`);
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
    legLength,
    stretcherZ,
    withStretchers,
    midRail,
    footHeight: FOOT_HEIGHT,
    parts: {
      cuts,
      profileTotal: cuts.reduce((s, c) => s + c.length * c.qty, 0),
      largeGussets,
      smallGussets,
      lBrackets,
      hiddenConnectors,
      tabs,
      tabsLong,
      tabsShort,
      fasteners,
      feet: 4,
      top: { width: W, depth: D, thickness: tt, finish: q.topFinish },
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
    ['Hidden Corner Connector', `${size} series (HC-010-A equivalent), set-screw`, parts.hiddenConnectors],
    ['Joining Plate', `${size} series, 2 holes (JP-010-A equivalent)`, parts.tabs],
    ['Bolt', prof.bolt, parts.fasteners],
    ['T-nut', prof.nut, parts.fasteners],
    ['Levelling foot', `${prof.footThread} thread, into the leg end bore`, parts.feet],
    ['Plywood top', `${parts.top.width} × ${parts.top.depth} × ${parts.top.thickness} mm`, 1],
    ...(parts.top.finish === 'linoleum' ? [['Linoleum sheet', `${parts.top.width} × ${parts.top.depth} mm, glued to the top`, 1]] : []),
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
    `Join the two U frames with the short rails, sliding their gussets into the legs, and tighten${midRail ? `. Add the centre rail at ${Math.round(input.width / 2)} mm the same way` : ''}.`,
    ...(withStretchers
      ? [
          `End stretchers (${input.depth - 2 * p} mm): bolt a 2 hole inside corner bracket on top of each end, T-nut on the free face. Mark ${stretcherZ} mm up from the foot end of each leg, slide them in with their undersides on the marks and tighten.`,
          `Back stretcher (${input.width - 2 * p} mm): a corner bracket on top of each end, slide it in between the back legs at the same height and tighten.`,
          'Drop a T-nut into the bottom slot of each end stretcher and of the back stretcher near the back corners, and screw a flat corner plate across the underside of each corner.',
        ]
      : []),
    `Screw a ${prof.footThread} levelling foot into the end of each leg.`,
    `Drop ${parts.tabs * 2} T-nuts into the top face of the rails, about ${TAB_SPACING} mm apart, and bolt a joining plate across each, two screws per plate.`,
    'Lay the plywood (and linoleum) on the joining plates and screw up through them into the top.',
    'Level the desk with the feet, then re-tighten every bolt once.',
  ];
}

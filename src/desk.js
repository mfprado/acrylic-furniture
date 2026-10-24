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
const TAB_SPACING = 300; // top mounting tabs roughly every 300 mm
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

  const railZ = H - tt - p; // underside of the top rails
  const legLength = Math.round(railZ - FOOT_HEIGHT);
  const stretcherZ = Math.round(FOOT_HEIGHT + legLength * 0.25); // underside of low stretchers
  const withStretchers = q.stretchers !== 'no';
  const midRail = W > MID_RAIL_OVER;

  const cuts = [
    { role: 'Leg', length: legLength, qty: 4 },
    { role: 'Top rail, long (front and back)', length: W, qty: 2 },
    { role: 'Top rail, short (ends)', length: D - 2 * p, qty: 2 + (midRail ? 1 : 0) },
  ];
  if (withStretchers) {
    cuts.push({ role: 'Low stretcher, ends', length: D - 2 * p, qty: 2 });
    cuts.push({ role: 'Low stretcher, back', length: W - 2 * p, qty: 1 });
  }

  // One 90° bracket per rail end, two at each leg top (one per face it meets).
  const brackets =
    2 * 2 + // short top rails into the long rails
    4 * 2 + // legs up into the long rails
    (midRail ? 2 : 0) +
    (withStretchers ? 2 * 2 + 2 : 0);
  const gussets = 4; // triangular plates under the top corners
  const tabs = 2 * Math.max(2, Math.round(W / TAB_SPACING)) + 2 * Math.max(1, Math.round(D / TAB_SPACING));
  const fasteners = brackets * 2 + gussets * 4 + tabs; // one bolt + T-nut per hole

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
      brackets,
      gussets,
      tabs,
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
    ['Corner bracket (90°)', `${size} series`, parts.brackets],
    ['Corner gusset (triangle)', `${size} series`, parts.gussets],
    ['Top mounting tab', 'flat plate, one hole', parts.tabs],
    ['Bolt + T-nut', `${prof.bolt} with ${prof.nut}`, parts.fasteners],
    ['Levelling foot', `${prof.footThread} thread, into the leg end bore`, parts.feet],
    ['Plywood top', `${parts.top.width} × ${parts.top.depth} × ${parts.top.thickness} mm`, 1],
    ...(parts.top.finish === 'linoleum' ? [['Linoleum sheet', `${parts.top.width} × ${parts.top.depth} mm, glued to the top`, 1]] : []),
  ];
}

// Order follows CPlot's instructions: sub-assemble rails with brackets, stand the legs,
// add the top frame upside down, gussets, feet, tabs, flip, fix the top.
export function deskSteps(d) {
  const { input, prof, p, legLength, stretcherZ, withStretchers, midRail, parts } = d;
  const steps = [
    `Tap the bottom bore of each ${legLength} mm leg ${prof.endTap} if it is not pre-tapped.`,
    `Fit a 90° bracket to both ends of every short rail (${input.depth - 2 * p} mm) and the back stretcher: bolt through the bracket into a T-nut, leave the T-nut loose so it can slide into the slot.`,
    'Lay the two long top rails upside down on the floor, front and back. Slide the short top rails between them at the ends and tighten.',
    ...(midRail ? [`Slide the centre short rail in at ${Math.round(input.width / 2)} mm and tighten.`] : []),
    'Stand a leg in each corner on the upside-down frame (legs pointing up), fix each with two brackets, one on each face it touches.',
    ...(withStretchers
      ? [
          `Mark ${stretcherZ} mm from the foot end of each leg. Slide the end stretchers and the back stretcher in with their undersides on the marks and tighten.`,
        ]
      : []),
    'Drop two T-nuts into each top rail at every corner and screw a triangular gusset across the joint.',
    `Screw a ${prof.footThread} levelling foot into the end of each leg.`,
    `Drop ${parts.tabs} T-nuts into the top face of the rails, spaced about ${TAB_SPACING} mm, and fix a mounting tab on each.`,
    'Flip the frame onto its feet. Lay the top on the rails and screw up through the tabs into it.',
    'Level the desk with the feet, then re-tighten every bolt once.',
  ];
  return steps;
}

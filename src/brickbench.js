// Geometry and bill of materials for a brick bench: London stock bricks laid flat on Ø8 mm
// chrome rods, inside a T-slot profile frame built like the Profile desk. The rods are held
// by rod support blocks bolted into the middle of the long rails' inner faces, so the tops of
// the rails stand a little above the bottom of the bricks and surround them
// (see docs/designs/brick-bench.md).
// All units mm. Layout: x along the length, y front to back, z up.
import { PROFILES, PROFILE_I, E_ALU, SAG_LIMIT } from './desk.js';

export const BRICKBENCH_DEFAULTS = {
  bricksLong: 8, // bricks side by side along the length
  rows: 1, // bricks end to end across the depth
  height: 450, // floor to the top of the bricks
  profile: '20', // 'auto' (lightest that passes the sag check) or 20 / 30 / 40
  loadKg: 100, // a person sitting, shared over the two long rails
  showBricks: 'yes', // 3D view only: hide the bricks to see the frame and rods
};

// Old imperial London stock brick, designer's note 2026-10-27. Height: low end of the
// 68 to 73 mm range given.
export const BRICK = { length: 228, width: 108, height: 68 };
export const ROD_D = 8; // chrome rod, designer 2026-10-27
// Two rods under each brick, evenly spaced across its width: a rod every half brick.
export const ROD_PITCH = BRICK.width / 2;
// Rod support block: 8 mm bore, mounting holes 32 mm apart (designer's picture, 2026-10-27).
// Its other sizes are not known yet, so the rod axis is taken at the middle of the rail.
export const BLOCK = { bore: 8, holeSpacing: 32 };

export function computeBrickbench(input) {
  const q = { ...BRICKBENCH_DEFAULTS, ...input };
  const { bricksLong: n, rows, height: H } = q;
  const L = n * BRICK.width; // seat length: the bricks, between the short rails
  const S = rows * BRICK.length; // seat depth: between the long rails
  // Each long rail carries half the load over its length, simply supported (as the desk).
  const load = Math.max(0, Number(q.loadKg) || 0) * 9.81; // N
  const sagAt = (s) => (5 * (load / 2) * L ** 3) / (384 * E_ALU * PROFILE_I[s]);
  const passes = (s) => sagAt(s) <= L / SAG_LIMIT;
  // auto: the lightest profile whose rails stay within the sag limit, else the heaviest
  const recommended = [20, 30, 40].find(passes) ?? 40;
  const size = q.profile === 'auto' || q.profile == null ? recommended : Number(q.profile);
  const prof = PROFILES[size];
  const p = prof.p;
  const W = L + 2 * p; // outside of the frame
  const D = S + 2 * p;

  const FOOT_HEIGHT = p; // levelling mount lifts the leg end about one profile, as on the desk
  // bricks rest on the rods, whose axis is at the middle of the rails: the rail top is half
  // a profile above the axis, and the seat a rod radius and a brick above it
  const rodZ = H - BRICK.height - ROD_D / 2;
  const frameTop = rodZ + p / 2;
  const legLength = Math.round(frameTop - FOOT_HEIGHT);
  const stretcherZ = Math.round(FOOT_HEIGHT + legLength * 0.25); // underside of low stretchers

  // rails fit between the legs, so the long ones are as long as the seat and the short ones as deep
  const cuts = [
    { role: 'Leg', length: legLength, qty: 4 },
    { role: 'Top rail, long (front and back)', length: L, qty: 2 },
    { role: 'Top rail, short (ends)', length: S, qty: 2 },
    { role: 'Low stretcher, ends', length: S, qty: 2 },
    { role: 'Low stretcher, back', length: L, qty: 1 },
  ];

  // Frame fittings as on the desk without its top: 4 hole gussets under the long rail ends
  // and flat in the back low corners, 2 hole gussets under the short rail ends, brackets
  // under the stretcher ends.
  const largeGussets = 6;
  const smallGussets = 4;
  const lBrackets = 8;
  const frameFasteners = largeGussets * 4 + smallGussets * 2 + lBrackets * 2;

  // A rod every half brick, each held at both ends by a block with two mounting bolts.
  const rodCount = 2 * n;
  const blocks = 2 * rodCount;
  const blockFasteners = blocks * 2;
  // first: from the inner face of the short rail to the first rod
  const rods = { count: rodCount, length: S, diameter: ROD_D, pitch: ROD_PITCH, first: ROD_PITCH / 2 };

  const railSag = sagAt(size);
  const check = { load: q.loadKg, railSag, railLimit: L / SAG_LIMIT };
  const warnings = [];
  if (railSag > check.railLimit) {
    const better = [20, 30, 40].find(passes);
    warnings.push(
      `The long rails sag about ${railSag.toFixed(1)} mm in the middle under ${q.loadKg} kg (limit ${check.railLimit.toFixed(1)} mm).${better && better > size ? ` Use ${better}${better} profile.` : ' Use a heavier profile or a shorter bench.'}`,
    );
  }

  return {
    kind: 'brickbench',
    input: q,
    size,
    recommended,
    prof,
    p,
    seatLength: L,
    seatDepth: S,
    width: W,
    depth: D,
    rodZ,
    frameTop,
    legLength,
    stretcherZ,
    check,
    footHeight: FOOT_HEIGHT,
    rods,
    brick: BRICK,
    parts: {
      cuts,
      profileTotal: cuts.reduce((t, c) => t + c.length * c.qty, 0),
      largeGussets,
      smallGussets,
      lBrackets,
      blocks,
      rods: rodCount,
      bricks: n * rows,
      fasteners: frameFasteners + blockFasteners,
      bolts: frameFasteners + blockFasteners,
      feet: 4,
    },
    warnings,
  };
}

export function brickbenchRows({ parts, size, prof, rods }) {
  const name = `${size}${size} T-slot profile`;
  return [
    ...parts.cuts.map((c) => [name, `${c.length} mm · ${c.role}`, c.qty]),
    ['London stock brick', `${BRICK.length} × ${BRICK.width} × ${BRICK.height} mm`, parts.bricks],
    ['Chrome rod', `Ø${ROD_D} mm × ${rods.length} mm`, parts.rods],
    ['Rod support block', `${BLOCK.bore} mm bore, mounting holes ${BLOCK.holeSpacing} mm apart, clamp screw`, parts.blocks],
    ['4 Hole Inside Corner Gusset', `${size} series (CB-010-K equivalent)`, parts.largeGussets],
    ['2 Hole Inside Corner Gusset', `${size} series (CB-010-A equivalent)`, parts.smallGussets],
    ['2 Hole Inside Corner Bracket', `${size} series (CBS-010-A equivalent)`, parts.lBrackets],
    ['Bolt', `${prof.bolt}, flanged`, parts.bolts],
    ['T-nut', prof.nut, parts.fasteners],
    ['Levelling foot', `${prof.footThread} thread, into the leg end bore`, parts.feet],
  ];
}

// Follows the Profile desk's order. Each step lists the parts it adds; scene.js draws them
// from brickbenchStepTags, which must stay parallel.
export function brickbenchSteps(d) {
  const { prof, seatLength: L, seatDepth: S, legLength, stretcherZ, parts, rods } = d;
  const loose = 'Leave the T-nuts loose so they can slide into the slots.';
  return [
    `Short top rails (${S} mm): bolt a 2 hole inside corner gusset to the underside of each end, with a T-nut on its free face. ${loose}`,
    `Long top rails (${L} mm): bolt a 4 hole inside corner gusset to the underside of each end, with two T-nuts on its free face. ${loose}`,
    `Legs (${legLength} mm, tap the foot end ${prof.endTap} if needed): slide a leg onto the gusset at each end of a long rail, top flush with the rail. Tighten. You now have two U frames.`,
    'Join the two U frames with the short rails, sliding their gussets into the legs, and tighten.',
    `End stretchers (${S} mm): bolt a 2 hole inside corner bracket under each end, T-nut on the free face. Mark ${stretcherZ} mm up from the foot end of each leg, slide them in with their undersides on the marks and tighten the brackets.`,
    `Back stretcher (${L} mm): a corner bracket under each end, slide it in between the back legs at the same height and tighten.`,
    'Back corners: drop two T-nuts into the inner side slot of the end stretcher and two into the back stretcher, next to each back leg. Set a 4 hole inside corner gusset flat into the inside corner and bolt it to both stretchers, four screws per corner.',
    `Screw a ${prof.footThread} levelling foot into the end of each leg.`,
    `Drop ${parts.blocks * 2} T-nuts into the middle slot of the inner faces of the long rails. Bolt ${parts.blocks} rod support blocks onto them, ${parts.blocks / 2} on the front rail and ${parts.blocks / 2} on the back rail, ${rods.pitch} mm apart with the first ${rods.first} mm from the short rail, so every rod has a block at both ends. Leave the clamp screws open.`,
    `Slide an Ø${ROD_D} mm rod (${rods.length} mm) into each facing pair of blocks, ${parts.rods} rods in all, and tighten the clamp screws.`,
    `Lay the ${parts.bricks} bricks flat on the rods, inside the rails, ${BRICK.length} mm side along the rods, touching, two rods under each brick.`,
    'Level the bench with the feet, then re-tighten every bolt once.',
  ];
}

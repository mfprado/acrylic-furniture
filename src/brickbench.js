// Geometry and bill of materials for a brick bench: London stock bricks laid flat on Ø8 mm
// chrome rods, the rods held by rod support blocks bolted on top of the long rails of a
// T-slot profile frame built like the Profile desk (see docs/designs/brick-bench.md).
// All units mm. Layout: x along the length, y front to back, z up.
import { PROFILES, PROFILE_I, E_ALU, SAG_LIMIT } from './desk.js';

export const BRICKBENCH_DEFAULTS = {
  bricksLong: 8, // bricks side by side along the length
  rows: 1, // bricks end to end across the depth
  height: 450, // floor to the top of the bricks
  profile: 'auto', // 'auto' or 20 / 30 / 40
  loadKg: 100, // a person sitting, shared over the two long rails
};

// Old imperial London stock brick, designer's note 2026-10-27. Height: low end of the
// 68 to 73 mm range given.
export const BRICK = { length: 228, width: 108, height: 68 };
export const ROD_D = 8; // chrome rod, designer 2026-10-27
// Two rods under each brick, evenly spaced across its width: a rod every half brick.
export const ROD_PITCH = BRICK.width / 2;
// Rod support block: 8 mm bore, mounting holes 32 mm apart (designer's picture, 2026-10-27).
// Its height is not known yet, so the rod axis is taken level with the top of the rails.
export const BLOCK = { bore: 8, holeSpacing: 32 };

export function computeBrickbench(input) {
  const q = { ...BRICKBENCH_DEFAULTS, ...input };
  const { bricksLong: n, rows, height: H } = q;
  const W = n * BRICK.width; // length of the bench
  const D = rows * BRICK.length; // depth of the bench
  // Each long rail carries half the load over its length, simply supported (as the desk).
  const load = Math.max(0, Number(q.loadKg) || 0) * 9.81; // N
  const sagAt = (s) => (5 * (load / 2) * (W - 2 * s) ** 3) / (384 * E_ALU * PROFILE_I[s]);
  const passes = (s) => sagAt(s) <= (W - 2 * s) / SAG_LIMIT;
  // auto: the lightest profile whose rails stay within the sag limit, else the heaviest
  const recommended = [20, 30, 40].find(passes) ?? 40;
  const size = q.profile === 'auto' || q.profile == null ? recommended : Number(q.profile);
  const prof = PROFILES[size];
  const p = prof.p;

  const FOOT_HEIGHT = p; // levelling mount lifts the leg end about one profile, as on the desk
  // bricks rest on the rods: the top of the rails is a brick and half a rod below the seat
  const frameTop = H - BRICK.height - ROD_D / 2;
  const legLength = Math.round(frameTop - FOOT_HEIGHT);
  const stretcherZ = Math.round(FOOT_HEIGHT + legLength * 0.25); // underside of low stretchers

  const cuts = [
    { role: 'Leg', length: legLength, qty: 4 },
    { role: 'Top rail, long (front and back)', length: W - 2 * p, qty: 2 },
    { role: 'Top rail, short (ends)', length: D - 2 * p, qty: 2 },
    { role: 'Low stretcher, ends', length: D - 2 * p, qty: 2 },
    { role: 'Low stretcher, back', length: W - 2 * p, qty: 1 },
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
  const rods = { count: rodCount, length: D, diameter: ROD_D, pitch: ROD_PITCH, first: ROD_PITCH / 2 };

  const railSpan = W - 2 * p;
  const railSag = sagAt(size);
  const check = { load: q.loadKg, railSag, railLimit: railSpan / SAG_LIMIT };
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
    width: W,
    depth: D,
    frameTop,
    legLength,
    stretcherZ,
    check,
    footHeight: FOOT_HEIGHT,
    rods,
    brick: BRICK,
    parts: {
      cuts,
      profileTotal: cuts.reduce((s, c) => s + c.length * c.qty, 0),
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
  const { prof, p, width: W, depth: D, legLength, stretcherZ, parts, rods } = d;
  const loose = 'Leave the T-nuts loose so they can slide into the slots.';
  return [
    `Short top rails (${D - 2 * p} mm): bolt a 2 hole inside corner gusset to the underside of each end, with a T-nut on its free face. ${loose}`,
    `Long top rails (${W - 2 * p} mm): bolt a 4 hole inside corner gusset to the underside of each end, with two T-nuts on its free face. ${loose}`,
    `Legs (${legLength} mm, tap the foot end ${prof.endTap} if needed): slide a leg onto the gusset at each end of a long rail, top flush with the rail. Tighten. You now have two U frames.`,
    'Join the two U frames with the short rails, sliding their gussets into the legs, and tighten.',
    `End stretchers (${D - 2 * p} mm): bolt a 2 hole inside corner bracket under each end, T-nut on the free face. Mark ${stretcherZ} mm up from the foot end of each leg, slide them in with their undersides on the marks and tighten the brackets.`,
    `Back stretcher (${W - 2 * p} mm): a corner bracket under each end, slide it in between the back legs at the same height and tighten.`,
    'Back corners: drop two T-nuts into the inner side slot of the end stretcher and two into the back stretcher, next to each back leg. Set a 4 hole inside corner gusset flat into the inside corner and bolt it to both stretchers, four screws per corner.',
    `Screw a ${prof.footThread} levelling foot into the end of each leg.`,
    `Drop ${parts.blocks * 2} T-nuts into the top slot of the long rails. Bolt ${parts.blocks} rod support blocks on top, ${parts.blocks / 2} on the front rail and ${parts.blocks / 2} on the back rail, ${rods.pitch} mm apart from the first at ${rods.first} mm from the end, so every rod has a block at both ends. Leave the clamp screws open.`,
    `Slide an Ø${ROD_D} mm rod (${rods.length} mm) into each facing pair of blocks, ${parts.rods} rods in all, and tighten the clamp screws.`,
    `Lay the ${parts.bricks} bricks flat on the rods, ${BRICK.length} mm side along the rods, touching, two rods under each brick.`,
    'Level the bench with the feet, then re-tighten every bolt once.',
  ];
}

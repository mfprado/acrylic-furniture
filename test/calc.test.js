import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDesign, assemblySteps, cutMyOrder } from '../src/calc.js';

test('2 shelf 1200 x 250 x 450 unit', () => {
  const d = computeDesign({ width: 1200, depth: 250, height: 450, shelves: 2, thickness: 8 });
  const posts = d.columns * 2;
  assert.equal(d.parts.flanges, posts);
  assert.equal(d.parts.clamps, posts * 2); // one upper shelf, clamp under and over sheet
  assert.equal(d.parts.sheets.holes.length, posts);
  assert.ok(d.sag <= d.span / 250 || d.columns === 5);
  assert.equal(Math.round(d.levels.at(-1) + d.clamp.hi), 450); // top clamp reaches total height
  assert.ok(assemblySteps(d).length >= 4);
});

test('short span needs no middle column', () => {
  const d = computeDesign({ width: 600, depth: 150, height: 300, shelves: 3, thickness: 8, loadKg: 1 });
  assert.equal(d.columns, 2);
});

test('tall unit gets brace rows, short one does not', () => {
  assert.equal(computeDesign({}).braces.length, 0);
  const tall = computeDesign({ width: 1200, depth: 250, height: 1450, shelves: 2, thickness: 10 });
  assert.ok(tall.braces.length >= 2);
  assert.equal(tall.parts.clamps, (1 + tall.braces.length) * tall.columns * 2 * 2);
  assert.ok(assemblySteps(tall).some((s) => s.startsWith('Brace row')));
});

test('user can pick a thicker rod for looks', () => {
  const auto = computeDesign({});
  const wide = computeDesign({ rod: '10' });
  assert.equal(auto.d, 8);
  assert.equal(wide.d, 10);
  assert.ok(wide.inset > auto.inset); // bigger clamps push posts further in
  assert.ok(computeDesign({ rod: '6' }).warnings.some((w) => w.includes('thinner')));
});

test('Cut My order rounds holes up and lists every hole', () => {
  const o = cutMyOrder(computeDesign({}));
  assert.equal(o.holeD, 9); // Ø8 rod + 1 mm, whole mm
  assert.equal(o.edgeToCentre, 30);
  assert.equal(o.holes.length, 8);
  assert.equal(o.layout, 'Edit Holes Individually');
  assert.ok(cutMyOrder(computeDesign({ thickness: 5 })).notes.some((n) => n.includes('thin')));
});

import { computeDesk, deskRows, deskSteps } from '../src/desk.js';

test('profile desk matches the CPlot layout', () => {
  const d = computeDesk({});
  assert.equal(d.size, 30); // 1220 x 740 -> 3030
  assert.equal(d.parts.cuts.find((c) => c.role.startsWith('Leg')).qty, 4);
  assert.equal(d.legLength, 740 - 30); // levelling mount lifts the leg end one profile // legs reach the top of the frame, above the foot
  assert.equal(d.parts.top.width, 1220 - 60); // top drops in between the rails
  assert.equal(d.parts.largeGussets, 6); // 4 at the top corners, 2 flat in the back low corners
  assert.equal(d.parts.smallGussets, 4);
  assert.equal(d.parts.cuts[1].length, 1220 - 60); // long rails fit between the legs
  assert.equal(d.parts.lBrackets, 8);
  assert.equal(d.parts.hiddenConnectors, 6);
  assert.equal(d.parts.tabs, 12); // CPlot uses 12 mounting tabs on a 48 x 24 in top
  assert.ok(deskRows(d).length >= 8);
  assert.ok(deskSteps(d).length >= 8);
  assert.ok(d.check.topSag <= d.check.topLimit && d.check.railSag <= d.check.railLimit); // CPlot size is fine
  const wide = computeDesk({ width: 2400, profile: 20, loadKg: 80 });
  assert.ok(wide.check.railSag > wide.check.railLimit); // no centre rail: long thin rails warn
  assert.ok(wide.warnings.some((w) => w.includes('long rails sag')));
  const rail = computeDesk({ centreRail: 'yes' });
  assert.equal(rail.parts.hiddenConnectors, 10); // centre rail: one each side at both ends
  assert.equal(rail.parts.threeHolePlates, 2); // across the centre rail under the top
  assert.equal(rail.parts.top.panels, 2);
  assert.equal(rail.parts.top.width, (1220 - 90) / 2);
  assert.equal(computeDesk({ stretchers: 'no' }).parts.cuts.length, 3);
});

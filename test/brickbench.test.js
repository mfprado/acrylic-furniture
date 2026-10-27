import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBrickbench, brickbenchRows, brickbenchSteps } from '../src/brickbench.js';

test('defaults: 8 bricks long, 1 row, 450 mm high', () => {
  const d = computeBrickbench({});
  assert.equal(d.seatLength, 864); // 8 bricks of 108 mm
  assert.equal(d.seatDepth, 228); // one brick deep
  assert.equal(d.size, 20);
  assert.equal(d.width, 864 + 40); // the rails go round the bricks
  assert.equal(d.depth, 228 + 40);
  assert.equal(d.parts.bricks, 8);
  assert.equal(d.parts.rods, 16); // two rods under each brick
  assert.equal(d.parts.blocks, 32); // a block at both ends of every rod
  assert.equal(d.rods.length, 228);
  assert.equal(brickbenchRows(d).find((r) => r[0] === 'Rod support block')[2], 32);
  assert.equal(brickbenchSteps(d).length, 12);
});

test('rows add bricks across the depth', () => {
  const d = computeBrickbench({ rows: 3 });
  assert.equal(d.seatDepth, 684);
  assert.equal(d.parts.bricks, 24);
  assert.equal(d.rods.length, 684);
});

test('the seat is at the chosen height, with the rails reaching half a profile above the rod axis', () => {
  const d = computeBrickbench({ height: 500 });
  assert.equal(d.rodZ + 4 + 68, 500); // rod axis, then the rod radius, then a brick
  assert.equal(d.frameTop, d.rodZ + d.p / 2);
  assert.equal(d.legLength + d.footHeight, d.frameTop);
});

test('long rails are as long as the seat, short rails as deep', () => {
  const cuts = computeBrickbench({ bricksLong: 5, rows: 2 }).parts.cuts;
  assert.equal(cuts.find((c) => c.role.startsWith('Top rail, long')).length, 540);
  assert.equal(cuts.find((c) => c.role.startsWith('Top rail, short')).length, 456);
});

test('the default 2020 profile warns about sag at 8 bricks and suggests 3030', () => {
  const d = computeBrickbench({});
  assert.equal(d.warnings.length, 1);
  assert.ok(d.warnings[0].includes('Use 3030'));
});

test('rods sit every half brick', () => {
  const d = computeBrickbench({ bricksLong: 3 });
  assert.equal(d.rods.pitch, 54);
  assert.equal(d.rods.first, 27);
  assert.equal(d.rods.count, 6);
});

test('auto picks the lightest profile that passes the sag check', () => {
  assert.equal(computeBrickbench({ bricksLong: 3, profile: 'auto' }).size, 20);
  assert.equal(computeBrickbench({ profile: 'auto' }).size, 30); // 2020 sags too much at 864 mm and 100 kg
  assert.equal(computeBrickbench({ bricksLong: 14, profile: 'auto' }).size, 40);
  assert.deepEqual(computeBrickbench({ profile: 'auto' }).warnings, []);
});

test('long thin rails under a heavy load warn about sag, a thicker profile fixes it', () => {
  const heavy = computeBrickbench({ bricksLong: 14, profile: '20' });
  assert.ok(heavy.warnings.some((w) => w.includes('sag')));
  assert.ok(heavy.warnings.some((w) => w.includes('Use 4040')));
  assert.equal(computeBrickbench({ bricksLong: 14, loadKg: 0 }).warnings.length, 0);
});

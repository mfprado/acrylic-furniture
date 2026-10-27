import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeBrickbench, brickbenchRows, brickbenchSteps } from '../src/brickbench.js';

test('defaults: 8 bricks long, 1 row, 450 mm high', () => {
  const d = computeBrickbench({});
  assert.equal(d.width, 864); // 8 bricks of 108 mm
  assert.equal(d.depth, 228); // one brick deep
  assert.equal(d.parts.bricks, 8);
  assert.equal(d.parts.rods, 16); // two rods under each brick
  assert.equal(d.parts.blocks, 32); // a block at both ends of every rod
  assert.equal(d.rods.length, 228);
  assert.equal(d.warnings.length, 0);
  assert.equal(brickbenchRows(d).find((r) => r[0] === 'Rod support block')[2], 32);
  assert.equal(brickbenchSteps(d).length, 12);
});

test('rows add bricks across the depth', () => {
  const d = computeBrickbench({ rows: 3 });
  assert.equal(d.depth, 684);
  assert.equal(d.parts.bricks, 24);
  assert.equal(d.rods.length, 684);
});

test('the seat is at the chosen height: frame top sits a brick and half a rod lower', () => {
  const d = computeBrickbench({ height: 500 });
  assert.equal(d.frameTop, 500 - 68 - 4);
  assert.equal(d.legLength + d.footHeight, d.frameTop);
});

test('rods sit every half brick', () => {
  const d = computeBrickbench({ bricksLong: 3 });
  assert.equal(d.rods.pitch, 54);
  assert.equal(d.rods.first, 27);
  assert.equal(d.rods.count, 6);
});

test('auto picks the lightest profile that passes the sag check', () => {
  assert.equal(computeBrickbench({ bricksLong: 3 }).size, 20);
  assert.equal(computeBrickbench({}).size, 30); // 2020 sags too much at 864 mm and 100 kg
  assert.equal(computeBrickbench({ bricksLong: 14 }).size, 40);
  assert.equal(computeBrickbench({ bricksLong: 14, profile: '30' }).size, 30); // picked by hand
  assert.ok(computeBrickbench({ bricksLong: 14, profile: '30' }).warnings.some((w) => w.includes('sag')));
});

test('long thin rails under a heavy load warn about sag, a thicker profile fixes it', () => {
  const heavy = computeBrickbench({ bricksLong: 14, profile: '20', loadKg: 150 });
  assert.ok(heavy.warnings.some((w) => w.includes('sag')));
  assert.ok(heavy.warnings.some((w) => w.includes('Use 4040')));
  assert.equal(computeBrickbench({ bricksLong: 14, loadKg: 0 }).warnings.length, 0);
});

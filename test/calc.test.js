import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeDesign, assemblySteps } from '../src/calc.js';

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

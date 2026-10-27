import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CATALOG, IDEAS_PAGE, findPiece, navHtml, pieceIds } from '../src/catalog.js';

test('piece ids are unique and not the ideas page', () => {
  const ids = pieceIds();
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(!ids.includes(IDEAS_PAGE));
});

test('findPiece returns the group a piece is in', () => {
  assert.equal(findPiece('desk').group.id, 'desks');
  assert.equal(findPiece('shelf').piece.label, 'Rod shelf');
  assert.equal(findPiece(IDEAS_PAGE), null);
});

test('top bar has a menu per group and a link per piece', () => {
  const html = navHtml();
  for (const g of CATALOG) assert.ok(html.includes(`data-group="${g.id}"`));
  for (const id of [...pieceIds(), IDEAS_PAGE]) assert.ok(html.includes(`href="#${id}"`));
});

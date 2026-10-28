import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { CATALOG, HOME_PAGE, IDEAS_PAGE, findPiece, navHtml, pieceCardsHtml, pieceIds } from '../src/catalog.js';

test('piece ids are unique and not the ideas page', () => {
  const ids = pieceIds();
  assert.equal(new Set(ids).size, ids.length);
  assert.ok(!ids.includes(IDEAS_PAGE));
  assert.ok(!ids.includes(HOME_PAGE));
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

test('home page has a card per piece, linking to it, with its render', () => {
  const html = pieceCardsHtml();
  for (const g of CATALOG) {
    for (const p of g.pieces) {
      assert.ok(html.includes(`href="#${p.id}"`), p.id);
      assert.ok(p.render && html.includes(`src="${p.render}"`), `${p.id} has a render`);
      assert.ok(existsSync(new URL(`../${p.render}`, import.meta.url)), `${p.render} exists`);
    }
  }
});

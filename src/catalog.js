// The pieces in the configurator, grouped by furniture type for the top bar. Each group is
// a menu; each piece is a page with its own form, saved settings and 3D view. Adding a
// piece: add it to its group here (or start a new group) and give it an entry in TABS in
// main.js with the same id. The id is also the URL hash (#desk), so don't rename one.

export const CATALOG = [
  {
    id: 'shelving',
    label: 'Shelving',
    pieces: [{ id: 'shelf', label: 'Rod shelf', blurb: 'Chrome rods, clamps and sheets' }],
  },
  {
    id: 'desks',
    label: 'Desks & tables',
    pieces: [{ id: 'desk', label: 'Profile desk', blurb: 'T-slot aluminium frame' }],
  },
];

// The ideas board is a page of its own, outside the groups.
export const IDEAS_PAGE = 'ideas';

export const pieceIds = () => CATALOG.flatMap((g) => g.pieces.map((p) => p.id));

// Which group a piece is in, and the piece itself; null for the ideas board or an unknown id.
export function findPiece(id) {
  for (const group of CATALOG) {
    const piece = group.pieces.find((p) => p.id === id);
    if (piece) return { group, piece };
  }
  return null;
}

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Top bar menus: a button per group that opens a list of its pieces.
export function navHtml() {
  return CATALOG.map((g) => `<div class="menu" data-group="${g.id}">
    <button type="button" class="menu-button" aria-expanded="false" aria-controls="menu-${g.id}">${esc(g.label)}</button>
    <ul class="menu-list" id="menu-${g.id}" hidden>
      ${g.pieces.map((p) => `<li><a href="#${p.id}" data-page="${p.id}">${esc(p.label)}<small>${esc(p.blurb)}</small></a></li>`).join('')}
    </ul>
  </div>`).join('') + `<a class="nav-link" href="#${IDEAS_PAGE}" data-page="${IDEAS_PAGE}">Ideas</a>`;
}

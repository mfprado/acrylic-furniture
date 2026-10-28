// The pieces in the configurator, grouped by furniture type for the top bar. Each group is
// a menu; each piece is a page with its own form, saved settings and 3D view. Adding a
// piece: add it to its group here (or start a new group) and give it an entry in TABS in
// main.js with the same id. The id is also the URL hash (#desk), so don't rename one.

export const CATALOG = [
  {
    id: 'shelving',
    label: 'Shelving',
    pieces: [{
      id: 'shelf',
      label: 'Rod shelf',
      blurb: 'Chrome rods, clamps and sheets',
      about: 'Chrome rods and clamps holding sheets of acrylic, plywood, MDF, OSB or MFC.',
      render: 'assets/renders/rod-shelf.jpg',
    }],
  },
  {
    id: 'desks',
    label: 'Desks & tables',
    pieces: [{
      id: 'desk',
      label: 'Profile desk',
      blurb: 'T-slot aluminium frame',
      about: 'A T-slot aluminium frame in 2020, 3030 or 4040 profile, with a plywood or linoleum top.',
      credit: 'Based on the Profile Desk Frame by Palmer Purcell (CPlot).',
      render: 'assets/renders/profile-desk.jpg',
    }],
  },
];

// The ideas board and the home page are pages of their own, outside the groups.
export const IDEAS_PAGE = 'ideas';
export const HOME_PAGE = 'home';

export const pieceIds = () => CATALOG.flatMap((g) => g.pieces.map((p) => p.id));

// Home page cards: one per piece, with its render (a still of the 3D view at the default
// settings, saved in assets/renders/; take a new one when a piece's model changes).
export function pieceCardsHtml() {
  return CATALOG.flatMap((g) => g.pieces.map((p) => `<a class="piece-card" href="#${p.id}">
    <img src="${esc(p.render)}" alt="${esc(p.label)}, 3D view at the default size" loading="lazy" />
    <span class="group">${esc(g.label)}</span>
    <h3>${esc(p.label)}</h3>
    <p>${esc(p.about ?? p.blurb)}</p>
    ${p.credit ? `<p class="credit">${esc(p.credit)}</p>` : ''}
    <span class="go">Configure →</span>
  </a>`)).join('');
}

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
  </div>`).join('') + `<a class="nav-link" href="#${IDEAS_PAGE}" data-page="${IDEAS_PAGE}"><span aria-hidden="true">💡</span> Ideas</a>`;
}

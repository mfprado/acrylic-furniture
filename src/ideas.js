// Ideas board: pieces that use the same off-the-shelf parts approach but are not in the
// configurator yet. Plain data, so adding one is a new entry here.

export const IDEAS = [
  {
    title: 'Glass clamp lamp',
    status: 'Idea',
    summary:
      'A table lamp built from glass clamps: the small metal clamps sold for glass shelves and balustrades. Cheap, and they look good. Clamps grip glass or acrylic panels around a bulb on a rod, the same way the shelves clamp to posts.',
    parts: [
      { name: 'Glass clamps', link: 'https://amzn.eu/d/0eu2PAy3' },
      { name: 'Chrome rod and flange coupling as the stem and foot (already in the shelf parts list)' },
      { name: 'Glass or acrylic panels for the shade' },
      { name: 'Pre-wired lamp cord set with bulb holder' },
    ],
    open: [
      'Clamp sizes: which glass thicknesses and rod diameters do they take? Measure real parts.',
      'Heat: keep panels clear of the bulb, LED only.',
      'Wiring: use a ready-made, certified cord set rather than wiring mains yourself.',
    ],
    sketch: `<svg viewBox="0 0 120 140" aria-hidden="true">
      <rect x="35" y="128" width="50" height="6" rx="2" fill="#2c3035"/>
      <rect x="58" y="40" width="4" height="88" fill="#9aa0a6"/>
      <circle cx="60" cy="52" r="9" fill="#ffe9a8" stroke="#c9a640"/>
      <rect x="28" y="20" width="4" height="64" fill="rgba(160,200,215,.45)" stroke="#7fa3b0"/>
      <rect x="88" y="20" width="4" height="64" fill="rgba(160,200,215,.45)" stroke="#7fa3b0"/>
      <rect x="25" y="28" width="10" height="8" rx="1" fill="#5b6168"/>
      <rect x="85" y="28" width="10" height="8" rx="1" fill="#5b6168"/>
      <rect x="25" y="68" width="10" height="8" rx="1" fill="#5b6168"/>
      <rect x="85" y="68" width="10" height="8" rx="1" fill="#5b6168"/>
      <line x1="35" y1="32" x2="58" y2="32" stroke="#9aa0a6" stroke-width="2"/>
      <line x1="62" y1="32" x2="85" y2="32" stroke="#9aa0a6" stroke-width="2"/>
      <line x1="35" y1="72" x2="58" y2="72" stroke="#9aa0a6" stroke-width="2"/>
      <line x1="62" y1="72" x2="85" y2="72" stroke="#9aa0a6" stroke-width="2"/>
    </svg>`,
  },
];

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function ideaCard(idea) {
  const parts = idea.parts
    .map((p) => `<li>${p.link ? `<a href="${esc(p.link)}" target="_blank" rel="noopener">${esc(p.name)} ↗</a>` : esc(p.name)}</li>`)
    .join('');
  return `<article class="idea">
    <div class="sketch">${idea.sketch ?? ''}</div>
    <div>
      <span class="status">${esc(idea.status)}</span>
      <h3>${esc(idea.title)}</h3>
      <p>${esc(idea.summary)}</p>
      <h4>Parts</h4><ul>${parts}</ul>
      <h4>To work out</h4><ul>${idea.open.map((o) => `<li>${esc(o)}</li>`).join('')}</ul>
    </div>
  </article>`;
}

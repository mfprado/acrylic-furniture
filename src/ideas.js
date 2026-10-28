// Ideas board: pieces that are not in the configurator yet. A card records the idea as it
// was proposed, nothing more: parts, sizes and assembly are worked out later, when someone
// designs it. Each idea keeps an open GitHub issue where people collaborate on it, and the
// card lists who has joined in. Adding one: see .agents/skills/add-idea/SKILL.md.

const REPO = 'mfprado/open-source-modular-furniture';

export const IDEAS = [
  {
    title: 'Clamp lamp',
    points: [
      'A square lamp held together with clamps.',
      'Inspired by glass clamps: very cheap on Amazon, and they look good.',
      'Shade in acrylic, or paper like a Japanese paper lamp.',
    ],
    links: [{ name: 'Glass clamps (inspiration)', url: 'https://amzn.eu/d/0eu2PAy3' }],
    issue: 2,
    // traced from the reference photo: thin rod legs, clamped square frames, paper cube
    sketch: `<svg viewBox="0 0 200 240" role="img" aria-label="Sketch: square paper shade on four thin legs, held by clamped rod frames">
      <g stroke="#8a8f94" stroke-width="2.5" stroke-linecap="round"><line x1="68" y1="212" x2="68" y2="12"/><line x1="158" y1="212" x2="158" y2="12"/><line x1="42" y1="140" x2="68" y2="124"/><line x1="68" y1="124" x2="158" y2="124"/><line x1="42" y1="44" x2="68" y2="28"/><line x1="68" y1="28" x2="158" y2="28"/></g>
      <polygon points="42,48 132,48 158,32 68,32" fill="#fff6dc"/>
      <rect x="42" y="48" width="90" height="86" fill="#e9dfc7" stroke="#cbbd99"/>
      <polygon points="132,48 158,32 158,118 132,134" fill="#d6c8a6" stroke="#cbbd99"/>
      <line x1="145.0" y1="40.0" x2="145.0" y2="126.0" stroke="#9c8d6c" stroke-dasharray="3 3"/>
      <g stroke="#8a8f94" stroke-width="2.5" stroke-linecap="round"><line x1="42" y1="228" x2="42" y2="28"/><line x1="132" y1="228" x2="132" y2="28"/><line x1="42" y1="140" x2="132" y2="140"/><line x1="132" y1="140" x2="158" y2="124"/><line x1="42" y1="44" x2="132" y2="44"/><line x1="132" y1="44" x2="158" y2="28"/></g>
      <g fill="#5b6168"><rect x="38" y="40" width="8" height="8"/><rect x="128" y="40" width="8" height="8"/><rect x="154" y="24" width="8" height="8"/><rect x="64" y="24" width="8" height="8"/><rect x="38" y="136" width="8" height="8"/><rect x="128" y="136" width="8" height="8"/><rect x="154" y="120" width="8" height="8"/></g>
      <g fill="#8a8f94"><ellipse cx="42" cy="229" rx="7" ry="2.5"/><ellipse cx="132" cy="229" rx="7" ry="2.5"/><ellipse cx="68" cy="213" rx="7" ry="2.5"/><ellipse cx="158" cy="213" rx="7" ry="2.5"/></g>
    </svg>`,
  },
  {
    title: 'Brick stool',
    points: [
      'A stool or bench made of London classic red bricks joined with clamps.',
      'Inspired by glass clamps.',
    ],
    issue: 4,
  },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const issueUrl = (n) => `https://github.com/${REPO}/issues/${n}`;

export function ideaCard(idea) {
  const links = idea.links ?? [];
  return `<article class="idea">
    ${idea.sketch ? `<div class="sketch">${idea.sketch}</div>` : idea.image ? `<img class="photo" src="${esc(idea.image)}" alt="" />` : ''}
    <h3>${esc(idea.title)}</h3>
    <ul>${idea.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    ${links.length ? `<p class="links">${links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)} ↗</a>`).join('')}</p>` : ''}
    ${idea.issue ? `<div class="people" data-issue="${Number(idea.issue)}"></div>
    <a class="join" href="${issueUrl(idea.issue)}" target="_blank" rel="noopener">Collaborate on issue #${Number(idea.issue)} ↗</a>` : ''}
  </article>`;
}

// Short card for the home page: the title, the first point and the way in.
export function ideaTeaser(idea) {
  return `<article class="idea-teaser">
    ${idea.issue ? `<span class="issue">Issue #${Number(idea.issue)}</span>` : ''}
    <h3>${esc(idea.title)}</h3>
    <p>${esc(idea.points[0])}</p>
    ${idea.issue ? `<a href="${issueUrl(idea.issue)}" target="_blank" rel="noopener">Collaborate ↗</a>` : ''}
  </article>`;
}

// Collaborators are whoever opened or commented on the idea's issue, fetched live so the
// list grows as people join in. Unauthenticated GitHub API calls are limited per visitor,
// so on any failure the card simply shows no list.
export async function loadPeople(el) {
  const n = el.dataset.issue;
  try {
    const get = async (path) => {
      const r = await fetch(`https://api.github.com/repos/${REPO}/issues/${n}${path}`);
      if (!r.ok) throw new Error(r.status);
      return r.json();
    };
    const [issue, comments] = await Promise.all([get(''), get('/comments?per_page=100')]);
    const people = new Map();
    for (const u of [issue.user, ...comments.map((c) => c.user)]) {
      if (u && u.type !== 'Bot' && !people.has(u.login)) people.set(u.login, u);
    }
    if (!people.size) return;
    el.innerHTML = `<h4>Collaborators</h4>` + [...people.values()]
      .map((u) => `<a href="${esc(u.html_url)}" target="_blank" rel="noopener" title="${esc(u.login)}"><img src="${esc(u.avatar_url)}&s=48" alt="" />${esc(u.login)}</a>`)
      .join('');
  } catch { /* offline or rate limited: leave the list out */ }
}

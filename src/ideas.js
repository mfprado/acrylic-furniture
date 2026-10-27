// Ideas board: pieces that are not in the configurator yet. A card records the idea as it
// was proposed, nothing more: parts, sizes and assembly are worked out later, when someone
// designs it. Each idea keeps an open GitHub issue where people collaborate on it, and the
// card lists who has joined in. Adding one: see .claude/skills/add-idea/SKILL.md.

const REPO = 'mfprado/open-source-modular-furniture';

export const IDEAS = [
  {
    title: 'Clamp lamp',
    points: [
      'A lamp held together with clamps.',
      'Inspired by glass clamps: very cheap on Amazon, and they look good.',
      'Shade in acrylic, or paper like a Japanese paper lamp.',
    ],
    links: [{ name: 'Glass clamps (inspiration)', url: 'https://amzn.eu/d/0eu2PAy3' }],
    issue: 2,
  },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const issueUrl = (n) => `https://github.com/${REPO}/issues/${n}`;

export function ideaCard(idea) {
  const links = idea.links ?? [];
  return `<article class="idea">
    ${idea.image ? `<img class="photo" src="${esc(idea.image)}" alt="" />` : ''}
    <h3>${esc(idea.title)}</h3>
    <ul>${idea.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    ${links.length ? `<p class="links">${links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)} ↗</a>`).join('')}</p>` : ''}
    ${idea.issue ? `<div class="people" data-issue="${Number(idea.issue)}"></div>
    <a class="join" href="${issueUrl(idea.issue)}" target="_blank" rel="noopener">Collaborate on issue #${Number(idea.issue)} ↗</a>` : ''}
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

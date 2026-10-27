// Ideas board: pieces that are not in the configurator yet. A card records the idea as it
// was proposed, nothing more: parts, sizes and assembly are worked out later, when someone
// designs it. Adding one is a new entry here; see .claude/skills/add-idea/SKILL.md.

export const IDEAS = [
  {
    title: 'Clamp lamp',
    points: [
      'A lamp held together with clamps.',
      'Inspired by glass clamps: very cheap on Amazon, and they look good.',
      'Shade in acrylic, or paper like a Japanese paper lamp.',
    ],
    links: [{ name: 'Glass clamps (inspiration)', url: 'https://amzn.eu/d/0eu2PAy3' }],
  },
];

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function ideaCard(idea) {
  const links = [
    ...(idea.links ?? []),
    ...(idea.issue ? [{ name: `Issue #${idea.issue}`, url: `https://github.com/mfprado/open-source-modular-furniture/issues/${idea.issue}` }] : []),
  ];
  return `<article class="idea">
    ${idea.image ? `<img class="photo" src="${esc(idea.image)}" alt="" />` : ''}
    <h3>${esc(idea.title)}</h3>
    <ul>${idea.points.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    ${links.length ? `<p class="links">${links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.name)} ↗</a>`).join('')}</p>` : ''}
  </article>`;
}

import { computeDesign, assemblySteps, cutMyOrder, DEFAULTS, SHEET_MATERIALS } from './calc.js';
import { computeDesk, deskRows, deskSteps, DESK_DEFAULTS } from './desk.js';
import { partInfo } from './partinfo.js';
import { createViewer, renderParts, renderSteps, shelfStepTags, deskStepTags } from './scene.js';
import { downloadSpec } from './pdf.js';
import { IDEAS, ideaCard, loadPeople } from './ideas.js';
import { IDEAS_PAGE, findPiece, navHtml } from './catalog.js';

const viewer = createViewer(document.querySelector('#viewer'), { onPick: showPart });

// Part renders are slow to make, so build them once per design, on the first click.
let shotsFor = null;
let shotsCache = null;
function partShots() {
  if (!current) return null;
  if (shotsFor !== current) { shotsCache = renderParts(current); shotsFor = current; }
  return shotsCache;
}

// Info box for a clicked part
function showPart(name, names) {
  const box = $('partInfo');
  const info = partInfo(name);
  box.querySelector('h3').textContent = info.title;
  box.querySelector('.code').textContent = info.code ? `Part ${info.code} or equivalent` : '';
  box.querySelector('.text').textContent = info.text;
  // Profiles cut to the same length are the same piece whatever their role, so count them
  // together and list the roles (e.g. long rails and the back stretcher).
  const cut = name.match(/(\d{4}) × (\d+) mm$/);
  const same = cut ? names.filter((n) => n.endsWith(cut[0])) : names.filter((n) => n === name);
  const roles = {};
  for (const n of same) { const r = n.replace(` ${cut?.[0] ?? ''}`, ''); roles[r] = (roles[r] ?? 0) + 1; }
  box.querySelector('.qty').textContent = cut && Object.keys(roles).length > 1
    ? `${same.length} pieces of ${cut[2]} mm in this design: ${Object.entries(roles).map(([r, k]) => `${r.toLowerCase()} ×${k}`).join(', ')}`
    : `${same.length} in this design`;
  // small render of the part, the same one the PDF hardware page uses
  const img = box.querySelector('img');
  const shot = info.shot && partShots()?.[info.shot];
  img.hidden = !shot;
  if (shot) img.src = shot.url;
  const a = box.querySelector('.link');
  a.hidden = !info.link;
  if (info.link) a.href = info.link;
  box.hidden = false;
}
const $ = (id) => document.getElementById(id);
$('partInfo').querySelector('.close').addEventListener('click', () => ($('partInfo').hidden = true));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') $('partInfo').hidden = true; });

// One entry per piece in the catalog (src/catalog.js), by the same id. Each tab keeps its own form, saved settings and camera.
const TABS = {
  shelf: {
    form: $('config'),
    defaults: DEFAULTS,
    strings: ['finish', 'color', 'rod', 'material'],
    compute: computeDesign,
    rows: (d) => partRows(d),
    steps: assemblySteps,
    summary: (d) =>
      `Ø${d.d} mm rods · ${d.columns} columns · sag ${d.sag.toFixed(1)} mm over ${Math.round(d.span)} mm · ${Math.round(d.clearGap)} mm clear between shelves`,
    total: (d) => `${(d.parts.rodTotalLength / 1000).toFixed(2)} m of Ø${d.d} rod in total`,
  },
  desk: {
    form: $('deskConfig'),
    defaults: DESK_DEFAULTS,
    strings: ['profile', 'centreRail', 'stretchers', 'topFinish', 'topColor', 'frameColor', 'showTop'],
    compute: computeDesk,
    rows: deskRows,
    steps: deskSteps,
    summary: (d) =>
      `${d.size}${d.size} profile · legs ${d.legLength} mm · ${d.withStretchers ? `stretchers at ${d.stretcherZ} mm` : 'no stretchers'}${d.midRail ? ' · centre rail' : ''} · sag ${d.check.topSag.toFixed(1)} mm top, ${d.check.railSag.toFixed(1)} mm rails under ${d.check.load} kg`,
    total: (d) => `${(d.parts.profileTotal / 1000).toFixed(2)} m of ${d.size}${d.size} profile in total`,
  },
};

// Remember the last settings and tab in this browser so a refresh keeps them.
const storeKey = (tab) => (tab === 'shelf' ? 'acrylic-furniture:settings' : `acrylic-furniture:${tab}`);
const TAB_KEY = 'acrylic-furniture:tab';
const read = (key) => {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode: ignore */ }
};
const fill = (form, values) => {
  for (const [k, v] of Object.entries(values)) if (form.elements[k]) form.elements[k].value = v;
};
// The shelf thickness list depends on the sheet material, so rebuild it when that changes.
// Acrylic-only options (finish) hide for wood; the colour picker only matters for acrylic
// and MFC, which come in colours.
function syncMaterial() {
  const f = TABS.shelf.form;
  const m = SHEET_MATERIALS[f.elements.material.value] ?? SHEET_MATERIALS.acrylic;
  const sel = f.elements.thickness;
  const keep = Number(sel.value);
  sel.innerHTML = m.thicknesses.map((t) => `<option value="${t}">${t} mm</option>`).join('');
  sel.value = m.thicknesses.includes(keep) ? keep : m.thicknesses.reduce((a, b) => (Math.abs(b - keep) < Math.abs(a - keep) ? b : a));
  f.querySelector('[data-acrylic]').hidden = f.elements.material.value !== 'acrylic';
  f.querySelector('[data-colour]').hidden = m.color !== null;
}

for (const [name, t] of Object.entries(TABS)) {
  const saved = { ...t.defaults, ...(read(storeKey(name)) ?? {}) };
  fill(t.form, saved);
  if (name === 'shelf') {
    syncMaterial();
    fill(t.form, { thickness: saved.thickness });
    syncMaterial();
  }
}
TABS.shelf.form.elements.material.addEventListener('change', syncMaterial);

// The ideas tab is a board, not a configurator: no form, no 3D view.
$('ideaList').innerHTML = IDEAS.map(ideaCard).join('');
document.querySelectorAll('#ideaList .people').forEach(loadPeople);
const isTab = (name) => name in TABS || name === IDEAS_PAGE;

// Top bar: a menu per furniture type. The page is in the URL hash so it can be linked to;
// without one, open the page used last.
$('topnav').innerHTML = navHtml();
const menus = [...document.querySelectorAll('.menu')];
function closeMenus(except) {
  for (const m of menus) {
    if (m === except) continue;
    m.querySelector('.menu-button').setAttribute('aria-expanded', 'false');
    m.querySelector('.menu-list').hidden = true;
  }
}
for (const m of menus) {
  m.querySelector('.menu-button').addEventListener('click', (e) => {
    const open = e.currentTarget.getAttribute('aria-expanded') !== 'true';
    closeMenus(m);
    e.currentTarget.setAttribute('aria-expanded', String(open));
    m.querySelector('.menu-list').hidden = !open;
  });
}
document.addEventListener('click', (e) => { if (!e.target.closest('.menu')) closeMenus(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });
document.querySelectorAll('#topnav a').forEach((a) => a.addEventListener('click', () => closeMenus()));
const fromHash = () => location.hash.slice(1);
window.addEventListener('hashchange', () => { if (isTab(fromHash())) showTab(fromHash()); });

let tab = [fromHash(), read(TAB_KEY)].find(isTab) ?? 'shelf';
const framed = {};
let current = null;

function showTab(name) {
  tab = name;
  write(TAB_KEY, name);
  document.querySelectorAll('[data-for]').forEach((el) => (el.hidden = !el.dataset.for.split(' ').includes(name)));
  if (fromHash() !== name) history.replaceState(null, '', `#${name}`);
  const found = findPiece(name);
  $('crumb').textContent = found ? found.group.label : '';
  $('pageTitle').textContent = found ? found.piece.label : 'Ideas';
  document.querySelectorAll('#topnav [data-page]').forEach((a) => {
    if (a.dataset.page === name) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });
  menus.forEach((m) => m.classList.toggle('current', m.dataset.group === found?.group.id));
  if (!TABS[name]) return;
  framed[name] = null; // re-frame when switching furniture
  render();
}

function render() {
  const t = TABS[tab];
  const input = Object.fromEntries([...new FormData(t.form)].map(([k, v]) => [k, t.strings.includes(k) ? v : Number(v)]));
  write(storeKey(tab), input);
  let design;
  try {
    design = t.compute(input);
  } catch (e) {
    $('warnings').innerHTML = `<li>${e.message}</li>`;
    return;
  }
  current = design;

  // Re-frame the camera only when the overall size changes, so colour or finish tweaks
  // keep the angle you chose.
  const size = `${input.width}x${input.depth}x${input.height}`;
  viewer.show(design, { keepCamera: size === framed[tab] });
  framed[tab] = size;

  $('summary').textContent = t.summary(design);
  $('parts').innerHTML = t
    .rows(design)
    .map(([name, spec, qty]) => `<tr><td>${name}</td><td>${spec}</td><td>${qty}</td></tr>`)
    .join('');
  $('rodtotal').textContent = t.total(design);
  $('warnings').innerHTML = design.warnings.map((w) => `<li>${w}</li>`).join('');

  if (tab === 'shelf') {
    $('holes').textContent = design.parts.sheets.holes.map(([x, y]) => `(${Math.round(x)}, ${y})`).join('  ');
    $('cutmy').textContent = cutMyText(cutMyOrder(design));
  }
}

export function partRows({ parts, d }) {
  return [
    ...parts.rods.filter((r) => r.qty).map((r) => [`Ø${d} mm chrome rod`, `${r.length} mm · ${r.role}`, r.qty]),
    [`${parts.sheets.materialName} sheet`, `${parts.sheets.width} × ${parts.sheets.depth} × ${parts.sheets.thickness} mm, ${parts.sheets.holes.length} holes Ø${parts.sheets.holeD}`, parts.sheets.qty],
    ['Cross clamp (90°)', `Ø${d} bore both ways`, parts.clamps],
    ['Flange coupling', `Ø${d} bore`, parts.flanges],
    ['Shaft collar', `Ø${d} bore`, parts.collars],
  ];
}

export function cutMyText(o) {
  return [
    `Length            ${o.length} mm`,
    `Width             ${o.width} mm`,
    `Thickness         ${o.thickness} mm`,
    `Quantity          ${o.qty}`,
    `Polished edges    ${o.polishedEdges ? 'Yes' : 'No'}`,
    `Drilled holes     Yes, ${o.holes.length}`,
    `Hole diameter     ${o.holeD} mm`,
    `Distance from edge ${o.edgeToCentre} mm to centre (${o.edgeToHoleEdge} mm to hole edge)`,
    `Holes (x, y from front left, centres):`,
    ...o.holes.map(([x, y], i) => `  ${String(i + 1).padStart(2)}. ${x}, ${y}`),
    ...o.notes.map((n) => `! ${n}`),
  ].join('\n');
}

for (const t of Object.values(TABS)) t.form.addEventListener('input', render);

// Two-option selects show as switches: off is the first option, on the second. The select
// stays in the form (hidden) so saving, reset and compute read it as before.
const switches = [];
for (const sel of document.querySelectorAll('form select')) {
  if (sel.options.length !== 2 || sel.name === 'thickness') continue; // thickness options change with material
  const sw = document.createElement('button');
  sw.type = 'button';
  sw.className = 'switch';
  sw.setAttribute('role', 'switch');
  sw.innerHTML = '<span class="state"></span><span class="track"></span>';
  sel.hidden = true;
  sel.after(sw);
  const sync = () => {
    sw.setAttribute('aria-checked', String(sel.selectedIndex === 1));
    sw.querySelector('.state').textContent = sel.options[sel.selectedIndex]?.text ?? '';
  };
  sw.addEventListener('click', () => {
    sel.selectedIndex = sel.selectedIndex === 1 ? 0 : 1;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    sel.dispatchEvent(new Event('input', { bubbles: true }));
  });
  sel.form.addEventListener('input', sync);
  switches.push(sync);
  sync();
}
const syncSwitches = () => switches.forEach((s) => s());
$('reset').addEventListener('click', () => {
  try { localStorage.removeItem(storeKey(tab)); } catch { /* ignore */ }
  fill(TABS[tab].form, TABS[tab].defaults);
  syncSwitches();
  render();
});
$('copycutmy').addEventListener('click', async (e) => {
  try {
    await navigator.clipboard.writeText($('cutmy').textContent);
    e.target.textContent = 'Copied';
  } catch {
    e.target.textContent = 'Copy failed, select the text above';
  }
  setTimeout(() => (e.target.textContent = 'Copy order details'), 1500);
});
$('download').addEventListener('click', async (e) => {
  if (!current) return;
  const btn = e.currentTarget;
  const label = btn.textContent;
  btn.textContent = 'Building PDF…';
  btn.disabled = true;
  await new Promise((r) => setTimeout(r, 30)); // let the label paint before the heavy work
  try {
    buildPdf();
  } catch (err) {
    $('warnings').innerHTML = `<li>PDF failed: ${err.message}</li>`;
  } finally {
    btn.textContent = label;
    btn.disabled = false;
  }
});

function buildPdf() {
  const t = TABS[tab];
  if (tab === 'shelf') {
    downloadSpec(current, t.rows(current), t.steps(current), viewer.snapshot(), cutMyText(cutMyOrder(current)), renderParts(current), null, renderSteps(current, shelfStepTags(current)));
  } else {
    downloadSpec(current, t.rows(current), t.steps(current), viewer.snapshot(), null, renderParts(current), t.summary(current), renderSteps(current, deskStepTags(current)));
  }
}
showTab(tab);

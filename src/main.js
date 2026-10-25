import { computeDesign, assemblySteps, cutMyOrder, DEFAULTS, SHEET_MATERIALS } from './calc.js';
import { computeDesk, deskRows, deskSteps, DESK_DEFAULTS } from './desk.js';
import { createViewer, renderParts, renderSteps, shelfStepTags, deskStepTags } from './scene.js';
import { downloadSpec } from './pdf.js';

const viewer = createViewer(document.querySelector('#viewer'));
const $ = (id) => document.getElementById(id);

// One entry per furniture type. Each tab keeps its own form, saved settings and camera.
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
    strings: ['profile', 'stretchers', 'topFinish', 'topColor', 'frameColor', 'showTop'],
    compute: computeDesk,
    rows: deskRows,
    steps: deskSteps,
    summary: (d) =>
      `${d.size}${d.size} profile · legs ${d.legLength} mm · ${d.withStretchers ? `stretchers at ${d.stretcherZ} mm` : 'no stretchers'}${d.midRail ? ' · centre rail' : ''}`,
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

let tab = TABS[read(TAB_KEY)] ? read(TAB_KEY) : 'shelf';
const framed = {};
let current = null;

function showTab(name) {
  tab = name;
  write(TAB_KEY, name);
  document.querySelectorAll('[data-for]').forEach((el) => (el.hidden = el.dataset.for !== name));
  document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === name)));
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
document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => showTab(b.dataset.tab)));
$('reset').addEventListener('click', () => {
  try { localStorage.removeItem(storeKey(tab)); } catch { /* ignore */ }
  fill(TABS[tab].form, TABS[tab].defaults);
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

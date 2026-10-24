import { computeDesign, assemblySteps, cutMyOrder, DEFAULTS } from './calc.js';
import { createViewer, renderParts } from './scene.js';
import { downloadSpec } from './pdf.js';

const form = document.querySelector('#config');
const viewer = createViewer(document.querySelector('#viewer'));
const $ = (id) => document.getElementById(id);

// Remember the last settings in this browser so a refresh keeps them.
const STORE_KEY = 'acrylic-furniture:settings';
const load = () => {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) ?? {}; } catch { return {}; }
};
const save = (input) => {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(input)); } catch { /* private mode: ignore */ }
};
const fill = (values) => {
  for (const [k, v] of Object.entries(values)) if (form.elements[k]) form.elements[k].value = v;
};
fill({ ...DEFAULTS, ...load() });

let framed = null;
let current = null;

function render() {
  const input = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, ['finish', 'color', 'rod'].includes(k) ? v : Number(v)]));
  save(input);
  let design;
  try {
    design = computeDesign(input);
  } catch (e) {
    $('warnings').innerHTML = `<li>${e.message}</li>`;
    return;
  }
  const { parts, d } = design;
  // Re-frame the camera only when the overall size changes, so colour or finish tweaks
  // keep the angle you chose.
  const size = `${input.width}x${input.depth}x${input.height}`;
  viewer.show(design, { keepCamera: size === framed });
  framed = size;

  $('summary').textContent =
    `Ø${d} mm rods · ${design.columns} columns · sag ${design.sag.toFixed(1)} mm over ${Math.round(design.span)} mm · ${Math.round(design.clearGap)} mm clear between shelves`;

  current = design;
  $('parts').innerHTML = partRows(design)
    .map(([name, spec, qty]) => `<tr><td>${name}</td><td>${spec}</td><td>${qty}</td></tr>`)
    .join('');

  $('holes').textContent = parts.sheets.holes.map(([x, y]) => `(${Math.round(x)}, ${y})`).join('  ');
  $('rodtotal').textContent = `${(parts.rodTotalLength / 1000).toFixed(2)} m of Ø${d} rod in total`;
  $('cutmy').textContent = cutMyText(cutMyOrder(design));
  $('steps').innerHTML = assemblySteps(design).map((s) => `<li>${s}</li>`).join('');
  $('warnings').innerHTML = design.warnings.map((w) => `<li>${w}</li>`).join('');
}

export function partRows({ parts, d }) {
  return [
    ...parts.rods.filter((r) => r.qty).map((r) => [`Ø${d} mm chrome rod`, `${r.length} mm · ${r.role}`, r.qty]),
    ['Cast acrylic sheet', `${parts.sheets.width} × ${parts.sheets.depth} × ${parts.sheets.thickness} mm, ${parts.sheets.holes.length} holes Ø${parts.sheets.holeD}`, parts.sheets.qty],
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

form.addEventListener('input', render);
$('reset').addEventListener('click', () => {
  try { localStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
  fill(DEFAULTS);
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
$('download').addEventListener('click', () => {
  if (current) downloadSpec(current, partRows(current), assemblySteps(current), viewer.snapshot(), cutMyText(cutMyOrder(current)), renderParts(current));
});
render();

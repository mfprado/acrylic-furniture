import { computeDesign, assemblySteps, DEFAULTS } from './calc.js';
import { createViewer } from './scene.js';
import { downloadSpec } from './pdf.js';

const form = document.querySelector('#config');
const viewer = createViewer(document.querySelector('#viewer'));
const $ = (id) => document.getElementById(id);

for (const [k, v] of Object.entries(DEFAULTS)) if (form.elements[k]) form.elements[k].value = v;

let framed = null;
let current = null;

function render() {
  const input = Object.fromEntries([...new FormData(form)].map(([k, v]) => [k, ['finish', 'color', 'rod'].includes(k) ? v : Number(v)]));
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

form.addEventListener('input', render);
$('download').addEventListener('click', () => {
  if (current) downloadSpec(current, partRows(current), assemblySteps(current), viewer.snapshot());
});
render();

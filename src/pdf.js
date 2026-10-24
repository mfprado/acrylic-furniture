// Builds the spec sheet PDF with jsPDF + autotable (loaded as UMD globals in index.html).
// Built-in Courier keeps the sidebar's monospace look and covers Ø, ×, ° (Latin-1).

export function downloadSpec(design, rows, steps, shot, cutMy, partShots) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { input, d } = design;
  const M = 15;
  const pageW = doc.internal.pageSize.getWidth();
  const textW = pageW - 2 * M;
  let y = M;

  const heading = (text) => {
    y += 3;
    if (y > 260) { doc.addPage(); y = M; }
    doc.setFont('courier', 'bold').setFontSize(10).setTextColor(90);
    doc.text(text.toUpperCase(), M, y);
    doc.setDrawColor(180).line(M, y + 1.5, pageW - M, y + 1.5);
    y += 7;
    doc.setFont('courier', 'normal').setFontSize(9).setTextColor(20);
  };
  const para = (text) => {
    const lines = doc.splitTextToSize(text, textW);
    if (y + lines.length * 4 > 285) { doc.addPage(); y = M; }
    doc.text(lines, M, y);
    y += lines.length * 4 + 1.5;
  };

  doc.setFont('courier', 'bold').setFontSize(16).setTextColor(30);
  doc.text('ACRYLIC FURNITURE', M, y);
  y += 6;
  doc.setFont('courier', 'normal').setFontSize(9).setTextColor(90);
  doc.text(`${input.width} × ${input.depth} × ${input.height} mm · ${design.shelves} shelves · Ø${d} rods · ${new Date().toISOString().slice(0, 10)}`, M, y);
  y += 6;

  const imgH = Math.min(100, (textW * shot.h) / shot.w);
  const imgW = (imgH * shot.w) / shot.h;
  doc.addImage(shot.url, 'JPEG', M + (textW - imgW) / 2, y, imgW, imgH);
  y += imgH + 6;

  heading('Configuration');
  para(`Width ${input.width} mm · depth ${input.depth} mm · height ${input.height} mm · ${design.shelves} shelves`);
  para(`Acrylic ${input.thickness} mm ${input.finish}, colour ${input.color} · design load ${input.loadKg} kg per shelf`);
  para(`${design.columns} post columns · sag ${design.sag.toFixed(1)} mm over ${Math.round(design.span)} mm · ${Math.round(design.clearGap)} mm clear between shelves`);
  design.warnings.forEach((w) => para(`! ${w}`));

  heading('Materials at a glance');
  doc.autoTable({
    startY: y,
    margin: { left: M, right: M },
    head: [['Part', 'Spec', 'Qty']],
    body: rows,
    styles: { font: 'courier', fontSize: 8.5, cellPadding: 1.8 },
    headStyles: { fillColor: [44, 48, 53], textColor: 235 },
    columnStyles: { 2: { halign: 'right', fontStyle: 'bold', cellWidth: 14 } },
  });
  y = doc.lastAutoTable.finalY + 4;
  para(`${(design.parts.rodTotalLength / 1000).toFixed(2)} m of Ø${d} rod in total`);

  partsDetail(doc, design, partShots, { M, textW, getY: () => y, setY: (v) => (y = v), heading });

  heading('Hole centres per sheet (x, y mm from front left)');
  para(`Ø${design.parts.sheets.holeD} mm: ` + design.parts.sheets.holes.map(([hx, hy]) => `(${Math.round(hx)}, ${hy})`).join('  '));

  heading('Cut My order (per sheet)');
  cutMy.split('\n').forEach((line) => para(line));

  heading('Assembly');
  steps.forEach((s, i) => para(`${i + 1}. ${s}`));

  doc.save(`shelf-${input.width}x${input.depth}x${input.height}.pdf`);
}

// --- parts detail: one block per part, render on the left, dimensions on the right ------

function partsDetail(doc, design, shots, { M, textW, getY, setY, heading }) {
  const { d, clampSpec: c, flange: f, parts, inset } = design;
  const sh = parts.sheets;
  const IMG_W = 58;
  const IMG_H = (IMG_W * 3) / 4;
  const textX = M + IMG_W + 6;

  const block = (title, shot, lines, extraH = 0) => {
    let y = getY();
    if (y + IMG_H + extraH > 285) { doc.addPage(); y = 15; }
    doc.setDrawColor(210).rect(M, y, IMG_W, IMG_H);
    doc.addImage(shot.url, 'JPEG', M + 0.3, y + 0.3, IMG_W - 0.6, IMG_H - 0.6);
    doc.setFont('courier', 'bold').setFontSize(10).setTextColor(20).text(title, textX, y + 5);
    doc.setFont('courier', 'normal').setFontSize(8.5).setTextColor(40);
    lines.forEach((l, i) => doc.text(l, textX, y + 11 + i * 4.4));
    setY(y + IMG_H + 6);
    return y + IMG_H + 3;
  };

  setY(getY() + 2);
  heading('Parts detail');

  const drawY = block('Acrylic sheet', shots.sheet, [
    `${sh.width} x ${sh.depth} x ${sh.thickness} mm, qty ${sh.qty}`,
    `${sh.holes.length} through holes, Ø${sh.holeD} mm`,
    `Hole centres ${inset} mm from front, back and side edges`,
    `Hole spacing along width: ${Math.round(design.span)} mm`,
    `Hole spacing front to back: ${sh.depth - 2 * inset} mm`,
    'Polished edges recommended',
  ], 52);
  setY(sheetDrawing(doc, M, drawY + 4, textW, sh, inset) + 6);

  const rodLines = parts.rods.filter((r) => r.qty).map((r) => `${r.qty} x ${r.length} mm  ${r.role}`);
  block(`Chrome rod Ø${d} mm`, shots.rod, [
    'Chrome plated 45# steel optical shaft, ends deburred',
    ...rodLines,
    `Total ${(parts.rodTotalLength / 1000).toFixed(2)} m`,
  ]);

  block(`Cross clamp Ø${d} x Ø${d}`, shots.clamp, [
    `Qty ${parts.clamps}, aluminium, two bores at 90°`,
    `Section ${c.section} x ${c.section} mm, length ~${c.len} mm (estimated)`,
    `Bore centre to bore centre: ${c.len - c.section} mm`,
    `Pinch screws ${c.screw}`,
    'Rod offset from post = bore spacing above',
  ]);

  block(`Flange coupling Ø${d}`, shots.flange, [
    `Qty ${parts.flanges}, 45# steel, used as feet`,
    `Total height ${f.height} mm, plate ${f.plate} mm thick`,
    `Hub Ø${f.hubD} mm, plate Ø${f.plateD ?? 'not listed'}${f.plateD ? ' mm' : ''}`,
    `4 mounting holes in plate, grub screws in hub`,
  ]);

  block(`Shaft collar Ø${d}`, shots.collar, [
    `Qty ${parts.collars}, locks the bottom sheet onto the feet`,
    `Bore Ø${d} mm, outer Ø~${d + 8} mm, width ~${Math.max(6, d)} mm (estimated)`,
    'Split collar with one pinch screw',
  ]);
}

// Top view of one sheet with chained dimensions to every hole. Returns the y below it.
function sheetDrawing(doc, x0, y0, w, sh, inset) {
  const k = (w - 22) / sh.width;
  const ox = x0 + 14;
  const oy = y0 + 8;
  const H = sh.depth * k;
  const xs = [...new Set(sh.holes.map(([x]) => Math.round(x)))].sort((a, b) => a - b);
  const ys = [...new Set(sh.holes.map(([, y]) => Math.round(y)))].sort((a, b) => a - b);

  doc.setDrawColor(40).setLineWidth(0.3).rect(ox, oy, sh.width * k, H);
  doc.setLineWidth(0.2);
  sh.holes.forEach(([hx, hy]) => doc.circle(ox + hx * k, oy + hy * k, Math.max(0.7, (sh.holeD / 2) * k)));

  doc.setFont('courier', 'normal').setFontSize(6.5).setTextColor(60).setDrawColor(120);
  const hDim = (a, b, y, label) => {
    const xa = ox + a * k, xb = ox + b * k;
    doc.line(xa, y, xb, y);
    doc.line(xa, y - 1, xa, y + 1);
    doc.line(xb, y - 1, xb, y + 1);
    doc.text(label, (xa + xb) / 2, y - 0.8, { align: 'center' });
  };
  const vDim = (a, b, x, label) => {
    const ya = oy + a * k, yb = oy + b * k;
    doc.line(x, ya, x, yb);
    doc.line(x - 1, ya, x + 1, ya);
    doc.line(x - 1, yb, x + 1, yb);
    doc.text(label, x - 1.2, (ya + yb) / 2 + 1, { align: 'right' });
  };

  hDim(0, sh.width, oy - 4, `${sh.width}`);
  const stops = [0, ...xs, sh.width];
  for (let i = 0; i + 1 < stops.length; i++) hDim(stops[i], stops[i + 1], oy + H + 5, `${stops[i + 1] - stops[i]}`);
  vDim(0, sh.depth, ox - 6, `${sh.depth}`);
  const vStops = [0, ...ys, sh.depth];
  const right = ox + sh.width * k + 6;
  for (let i = 0; i + 1 < vStops.length; i++) {
    const ya = oy + vStops[i] * k, yb = oy + vStops[i + 1] * k;
    doc.line(right, ya, right, yb);
    doc.line(right - 1, ya, right + 1, ya);
    doc.line(right - 1, yb, right + 1, yb);
    doc.text(`${vStops[i + 1] - vStops[i]}`, right + 1.5, (ya + yb) / 2 + 1);
  }
  doc.text(`Top view, mm. Holes Ø${sh.holeD}, centres ${inset} from edges. Front edge at top.`, ox, oy + H + 11);
  return oy + H + 13;
}

// Builds the spec sheet PDF with jsPDF + autotable (loaded as UMD globals in index.html).
// Built-in Courier keeps the sidebar's monospace look and covers Ø, ×, ° (Latin-1).

export function downloadSpec(design, rows, steps, shot) {
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

  heading('Hole centres per sheet (x, y mm from front left)');
  para(`Ø${design.parts.sheets.holeD} mm: ` + design.parts.sheets.holes.map(([hx, hy]) => `(${Math.round(hx)}, ${hy})`).join('  '));

  heading('Assembly');
  steps.forEach((s, i) => para(`${i + 1}. ${s}`));

  doc.save(`shelf-${input.width}x${input.depth}x${input.height}.pdf`);
}

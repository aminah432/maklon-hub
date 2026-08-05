/**
 * Utilitas ekspor bersama: CSV, PDF, dan cetak langsung.
 * Dipakai oleh <ExportMenu /> agar tampilan dokumen konsisten di semua halaman.
 */

export type ExportColumn<T> = {
  header: string;
  /** nilai mentah untuk CSV/PDF (bukan ReactNode) */
  value: (row: T) => string | number | null | undefined;
  align?: "left" | "right" | "center";
  width?: number;
};

export type ExportMeta = { label: string; value: string };

export type ExportDoc<T> = {
  /** judul dokumen, contoh "Daftar Invoice" */
  title: string;
  subtitle?: string;
  /** baris informasi ringkas di kepala dokumen */
  meta?: ExportMeta[];
  columns: ExportColumn<T>[];
  rows: T[];
  /** baris ringkasan di bawah tabel */
  summary?: ExportMeta[];
  /** nama berkas tanpa ekstensi */
  fileName?: string;
  orientation?: "portrait" | "landscape";
};

const BRAND = "Maklon Control Center";

function cell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  return String(v);
}

export function slugFile(name: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}-${stamp}`;
}

function cetakWaktu(): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  }).format(new Date());
}

/* ------------------------------- CSV ------------------------------- */

export function toCsv<T>(doc: ExportDoc<T>): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  const lines: string[] = [];
  lines.push(esc(doc.title));
  if (doc.subtitle) lines.push(esc(doc.subtitle));
  for (const m of doc.meta ?? []) lines.push(`${esc(m.label)},${esc(m.value)}`);
  lines.push(esc(`Dicetak ${cetakWaktu()}`));
  lines.push("");
  lines.push(doc.columns.map((c) => esc(c.header)).join(","));
  for (const row of doc.rows) {
    lines.push(doc.columns.map((c) => esc(cell(c.value(row)))).join(","));
  }
  if (doc.summary?.length) {
    lines.push("");
    for (const s of doc.summary) lines.push(`${esc(s.label)},${esc(s.value)}`);
  }
  return lines.join("\r\n");
}

export function downloadCsv<T>(doc: ExportDoc<T>): void {
  const blob = new Blob(["\uFEFF" + toCsv(doc)], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${doc.fileName ?? slugFile(doc.title)}.csv`);
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* ------------------------------- PDF ------------------------------- */

export async function downloadPdf<T>(doc: ExportDoc<T>): Promise<void> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableMod.default;

  const pdf = new jsPDF({
    orientation: doc.orientation ?? (doc.columns.length > 6 ? "landscape" : "portrait"),
    unit: "pt",
    format: "a4",
  });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 36;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.setTextColor(17, 24, 39);
  pdf.text(doc.title, margin, 50);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.text(BRAND, pageW - margin, 44, { align: "right" });
  pdf.text(`Dicetak ${cetakWaktu()}`, pageW - margin, 57, { align: "right" });

  let y = 66;
  if (doc.subtitle) {
    pdf.setFontSize(10);
    pdf.setTextColor(75, 85, 99);
    pdf.text(doc.subtitle, margin, y);
    y += 14;
  }
  const meta = doc.meta ?? [];
  if (meta.length) {
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128);
    pdf.text(meta.map((m) => `${m.label}: ${m.value}`).join("   •   "), margin, y);
    y += 12;
  }
  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, y, pageW - margin, y);

  autoTable(pdf, {
    startY: y + 12,
    margin: { left: margin, right: margin, bottom: 46 },
    head: [doc.columns.map((c) => c.header)],
    body: doc.rows.map((r) => doc.columns.map((c) => cell(c.value(r)))),
    styles: { font: "helvetica", fontSize: 8.5, cellPadding: 5, textColor: [31, 41, 55] },
    headStyles: { fillColor: [24, 33, 47], textColor: [255, 255, 255], fontStyle: "bold" },
    alternateRowStyles: { fillColor: [246, 248, 251] },
    columnStyles: Object.fromEntries(
      doc.columns.map((c, i) => [i, { halign: c.align ?? "left", cellWidth: c.width ?? "auto" }]),
    ),
    theme: "grid",
    tableLineColor: [226, 232, 240],
    tableLineWidth: 0.5,
    didDrawPage: () => {
      const h = pdf.internal.pageSize.getHeight();
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(BRAND, margin, h - 22);
      const page = pdf.getNumberOfPages();
      pdf.text(`Halaman ${page}`, pageW - margin, h - 22, { align: "right" });
    },
  });

  if (doc.summary?.length) {
    const after = (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;
    let sy = (after?.finalY ?? y) + 22;
    const h = pdf.internal.pageSize.getHeight();
    if (sy > h - 90) {
      pdf.addPage();
      sy = 60;
    }
    pdf.setFontSize(9.5);
    for (const s of doc.summary) {
      pdf.setTextColor(107, 114, 128);
      pdf.setFont("helvetica", "normal");
      pdf.text(s.label, margin, sy);
      pdf.setTextColor(17, 24, 39);
      pdf.setFont("helvetica", "bold");
      pdf.text(s.value, pageW - margin, sy, { align: "right" });
      sy += 15;
    }
  }

  pdf.save(`${doc.fileName ?? slugFile(doc.title)}.pdf`);
}

/* ------------------------------ Cetak ------------------------------ */

function escapeHtml(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function reportHtml<T>(doc: ExportDoc<T>): string {
  const head = doc.columns
    .map((c) => `<th style="text-align:${c.align ?? "left"}">${escapeHtml(c.header)}</th>`)
    .join("");
  const body = doc.rows
    .map(
      (r) =>
        `<tr>${doc.columns
          .map(
            (c) =>
              `<td style="text-align:${c.align ?? "left"}">${escapeHtml(cell(c.value(r)))}</td>`,
          )
          .join("")}</tr>`,
    )
    .join("");
  const meta = (doc.meta ?? [])
    .map((m) => `<span><b>${escapeHtml(m.label)}:</b> ${escapeHtml(m.value)}</span>`)
    .join("");
  const summary = (doc.summary ?? [])
    .map(
      (s) =>
        `<div class="sum-row"><span>${escapeHtml(s.label)}</span><b>${escapeHtml(s.value)}</b></div>`,
    )
    .join("");

  return `<!doctype html><html lang="id"><head><meta charset="utf-8" />
<title>${escapeHtml(doc.title)}</title>
<style>
  @page { size: A4 ${doc.orientation ?? (doc.columns.length > 6 ? "landscape" : "portrait")}; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: "Helvetica Neue", Helvetica, Arial, sans-serif; color:#111827; margin:0; font-weight:300; }
  header { display:flex; justify-content:space-between; align-items:flex-start; gap:16px;
           border-bottom:2px solid #18212f; padding-bottom:10px; }
  h1 { font-size:18px; margin:0 0 4px; font-weight:600; letter-spacing:-.2px; }
  .sub { font-size:11px; color:#4b5563; }
  .brand { text-align:right; font-size:10px; color:#6b7280; line-height:1.6; }
  .brand strong { display:block; font-size:12px; color:#18212f; letter-spacing:.4px; }
  .meta { display:flex; flex-wrap:wrap; gap:6px 18px; font-size:10px; color:#6b7280; margin:10px 0 14px; }
  table { width:100%; border-collapse:collapse; font-size:10px; }
  thead th { background:#18212f; color:#fff; font-weight:600; padding:7px 8px; border:1px solid #18212f; }
  tbody td { padding:6px 8px; border:1px solid #e2e8f0; vertical-align:top; }
  tbody tr:nth-child(even) td { background:#f6f8fb; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .summary { margin-top:16px; margin-left:auto; width:280px; font-size:11px; }
  .sum-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #e2e8f0; }
  footer { margin-top:22px; font-size:9px; color:#94a3b8; display:flex; justify-content:space-between; }
</style></head><body>
<header>
  <div><h1>${escapeHtml(doc.title)}</h1>${doc.subtitle ? `<div class="sub">${escapeHtml(doc.subtitle)}</div>` : ""}</div>
  <div class="brand"><strong>${BRAND}</strong>Dicetak ${escapeHtml(cetakWaktu())}<br/>${doc.rows.length} baris data</div>
</header>
${meta ? `<div class="meta">${meta}</div>` : ""}
<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
${summary ? `<div class="summary">${summary}</div>` : ""}
<footer><span>${BRAND}</span><span>${escapeHtml(doc.title)}</span></footer>
</body></html>`;
}

/** Cetak dokumen lewat iframe tersembunyi agar halaman aplikasi tidak ikut tercetak. */
export function printDoc<T>(doc: ExportDoc<T>): void {
  printHtml(reportHtml(doc));
}

export function printHtml(html: string): void {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const cleanup = () => {
    setTimeout(() => frame.remove(), 1000);
  };
  frame.onload = () => {
    const win = frame.contentWindow;
    if (!win) {
      cleanup();
      return;
    }
    win.focus();
    win.print();
    if ("onafterprint" in win) win.onafterprint = cleanup;
    else cleanup();
  };
  const cdoc = frame.contentDocument;
  if (!cdoc) {
    cleanup();
    return;
  }
  cdoc.open();
  cdoc.write(html);
  cdoc.close();
}

/* ------------------- Dokumen multi-bagian (detail) ------------------- */

export type ExportSection = {
  heading: string;
  columns: { header: string; align?: "left" | "right" | "center" }[];
  rows: (string | number)[][];
};

export type SectionDoc = {
  title: string;
  subtitle?: string;
  meta?: ExportMeta[];
  sections: ExportSection[];
  summary?: ExportMeta[];
  fileName?: string;
  orientation?: "portrait" | "landscape";
};

export function downloadCsvSections(doc: SectionDoc): void {
  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const lines: string[] = [esc(doc.title)];
  if (doc.subtitle) lines.push(esc(doc.subtitle));
  for (const m of doc.meta ?? []) lines.push(`${esc(m.label)},${esc(m.value)}`);
  lines.push(esc(`Dicetak ${cetakWaktu()}`));
  for (const s of doc.sections) {
    lines.push("");
    lines.push(esc(s.heading));
    lines.push(s.columns.map((c) => esc(c.header)).join(","));
    for (const r of s.rows) lines.push(r.map((v) => esc(String(v))).join(","));
  }
  if (doc.summary?.length) {
    lines.push("");
    for (const s of doc.summary) lines.push(`${esc(s.label)},${esc(s.value)}`);
  }
  const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${doc.fileName ?? slugFile(doc.title)}.csv`);
}

export async function downloadPdfSections(doc: SectionDoc): Promise<void> {
  const [{ jsPDF }, autoTableMod] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const autoTable = autoTableMod.default;
  const pdf = new jsPDF({ orientation: doc.orientation ?? "portrait", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const margin = 36;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(15);
  pdf.setTextColor(17, 24, 39);
  pdf.text(doc.title, margin, 50);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9);
  pdf.setTextColor(107, 114, 128);
  pdf.text(BRAND, pageW - margin, 44, { align: "right" });
  pdf.text(`Dicetak ${cetakWaktu()}`, pageW - margin, 57, { align: "right" });

  let y = 66;
  if (doc.subtitle) {
    pdf.setFontSize(10);
    pdf.setTextColor(75, 85, 99);
    pdf.text(doc.subtitle, margin, y);
    y += 14;
  }
  if (doc.meta?.length) {
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128);
    pdf.text(doc.meta.map((m) => `${m.label}: ${m.value}`).join("   •   "), margin, y);
    y += 12;
  }
  pdf.setDrawColor(226, 232, 240);
  pdf.line(margin, y, pageW - margin, y);
  y += 16;

  const last = () => (pdf as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable;

  for (const s of doc.sections) {
    if (y > pdf.internal.pageSize.getHeight() - 120) {
      pdf.addPage();
      y = 56;
    }
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10.5);
    pdf.setTextColor(17, 24, 39);
    pdf.text(s.heading, margin, y);
    autoTable(pdf, {
      startY: y + 8,
      margin: { left: margin, right: margin, bottom: 46 },
      head: [s.columns.map((c) => c.header)],
      body: s.rows.map((r) => r.map((v) => String(v))),
      styles: { font: "helvetica", fontSize: 8, cellPadding: 4.5, textColor: [31, 41, 55] },
      headStyles: { fillColor: [24, 33, 47], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [246, 248, 251] },
      columnStyles: Object.fromEntries(s.columns.map((c, i) => [i, { halign: c.align ?? "left" }])),
      theme: "grid",
      tableLineColor: [226, 232, 240],
      tableLineWidth: 0.5,
      didDrawPage: () => {
        const h = pdf.internal.pageSize.getHeight();
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(8);
        pdf.setTextColor(148, 163, 184);
        pdf.text(BRAND, margin, h - 22);
        pdf.text(`Halaman ${pdf.getNumberOfPages()}`, pageW - margin, h - 22, { align: "right" });
      },
    });
    y = (last()?.finalY ?? y) + 26;
  }

  if (doc.summary?.length) {
    if (y > pdf.internal.pageSize.getHeight() - 90) {
      pdf.addPage();
      y = 56;
    }
    pdf.setFontSize(9.5);
    for (const s of doc.summary) {
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(107, 114, 128);
      pdf.text(s.label, margin, y);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(17, 24, 39);
      pdf.text(s.value, pageW - margin, y, { align: "right" });
      y += 15;
    }
  }

  pdf.save(`${doc.fileName ?? slugFile(doc.title)}.pdf`);
}

export function sectionsHtml(doc: SectionDoc): string {
  const tables = doc.sections
    .map(
      (s) => `<section class="blk"><h2>${escapeHtml(s.heading)}</h2>
<table><thead><tr>${s.columns
        .map((c) => `<th style="text-align:${c.align ?? "left"}">${escapeHtml(c.header)}</th>`)
        .join("")}</tr></thead><tbody>${s.rows
        .map(
          (r) =>
            `<tr>${r
              .map(
                (v, i) =>
                  `<td style="text-align:${s.columns[i]?.align ?? "left"}">${escapeHtml(String(v))}</td>`,
              )
              .join("")}</tr>`,
        )
        .join("")}</tbody></table></section>`,
    )
    .join("");
  const meta = (doc.meta ?? [])
    .map((m) => `<span><b>${escapeHtml(m.label)}:</b> ${escapeHtml(m.value)}</span>`)
    .join("");
  const summary = (doc.summary ?? [])
    .map(
      (s) =>
        `<div class="sum-row"><span>${escapeHtml(s.label)}</span><b>${escapeHtml(s.value)}</b></div>`,
    )
    .join("");
  return `<!doctype html><html lang="id"><head><meta charset="utf-8" />
<title>${escapeHtml(doc.title)}</title>
<style>
  @page { size: A4 ${doc.orientation ?? "portrait"}; margin: 14mm; }
  body { font-family:"Helvetica Neue",Helvetica,Arial,sans-serif; color:#111827; margin:0; font-weight:300; }
  header { display:flex; justify-content:space-between; border-bottom:2px solid #18212f; padding-bottom:10px; }
  h1 { font-size:18px; margin:0 0 4px; font-weight:600; }
  h2 { font-size:11.5px; margin:0 0 6px; font-weight:600; text-transform:uppercase; letter-spacing:.6px; color:#18212f; }
  .sub { font-size:11px; color:#4b5563; }
  .brand { text-align:right; font-size:10px; color:#6b7280; line-height:1.6; }
  .brand strong { display:block; font-size:12px; color:#18212f; }
  .meta { display:flex; flex-wrap:wrap; gap:6px 18px; font-size:10px; color:#6b7280; margin:10px 0 14px; }
  .blk { margin-bottom:18px; page-break-inside:avoid; }
  table { width:100%; border-collapse:collapse; font-size:9.5px; }
  thead th { background:#18212f; color:#fff; font-weight:600; padding:6px 7px; border:1px solid #18212f; }
  tbody td { padding:5px 7px; border:1px solid #e2e8f0; }
  tbody tr:nth-child(even) td { background:#f6f8fb; }
  .summary { margin-left:auto; width:300px; font-size:11px; }
  .sum-row { display:flex; justify-content:space-between; padding:6px 0; border-bottom:1px solid #e2e8f0; }
  footer { margin-top:18px; font-size:9px; color:#94a3b8; display:flex; justify-content:space-between; }
</style></head><body>
<header><div><h1>${escapeHtml(doc.title)}</h1>${doc.subtitle ? `<div class="sub">${escapeHtml(doc.subtitle)}</div>` : ""}</div>
<div class="brand"><strong>${BRAND}</strong>Dicetak ${escapeHtml(cetakWaktu())}</div></header>
${meta ? `<div class="meta">${meta}</div>` : ""}
${tables}
${summary ? `<div class="summary">${summary}</div>` : ""}
<footer><span>${BRAND}</span><span>${escapeHtml(doc.title)}</span></footer>
</body></html>`;
}

export function printSections(doc: SectionDoc): void {
  printHtml(sectionsHtml(doc));
}

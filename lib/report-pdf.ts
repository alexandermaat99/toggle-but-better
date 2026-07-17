import { jsPDF } from "jspdf";
import { formatDurationShort, formatElapsedClock } from "@/lib/format-time";

export type ReportPdfGroup = {
  id: number;
  name: string;
  ms: number;
  projects: {
    name: string;
    ms: number;
    operations: {
      name: string;
      ms: number;
    }[];
  }[];
};

type ReportPdfInput = {
  displayName: string;
  clientLabel: string;
  rangeLabel: string;
  rangeDates: string;
  entryFilters: string[];
  operationFilters: string[];
  totalMs: number;
  groups: ReportPdfGroup[];
};

function filenameDate(d = new Date()) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function downloadReportPdf(input: ReportPdfInput) {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginX = 48;
  let y = 52;

  const accent: [number, number, number] = [71, 112, 148];
  const dark: [number, number, number] = [23, 23, 23];
  const muted: [number, number, number] = [115, 115, 115];
  const line: [number, number, number] = [212, 212, 212];

  const ensureSpace = (needed: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - 48) {
      doc.addPage();
      doc.setFillColor(...accent);
      doc.rect(0, 0, pageWidth, 8, "F");
      y = 52;
    }
  };

  doc.setFillColor(...accent);
  doc.rect(0, 0, pageWidth, 8, "F");

  const reportTitle = `${input.displayName} Time Log for ${input.clientLabel}`;

  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(reportTitle, pageWidth - marginX * 2);
  doc.text(titleLines, marginX, y);
  y += titleLines.length * 22 + 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  doc.text(`Generated ${new Date().toLocaleString()}`, marginX, y);
  y += 24;

  ensureSpace(72);
  doc.setDrawColor(...line);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(marginX, y, pageWidth - marginX * 2, 64, 8, 8, "FD");

  const summaryX = marginX + 16;
  let summaryY = y + 22;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  doc.text(`Span: ${input.rangeLabel} · ${input.rangeDates}`, summaryX, summaryY);
  summaryY += 16;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accent);
  doc.text(
    `Total: ${formatElapsedClock(input.totalMs)} (${formatDurationShort(input.totalMs)})`,
    summaryX,
    summaryY,
  );
  y += 84;

  if (input.entryFilters.length > 0 || input.operationFilters.length > 0) {
    ensureSpace(40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...muted);
    if (input.entryFilters.length > 0) {
      const lineText = `Entry names: ${input.entryFilters.join(", ")}`;
      const wrapped = doc.splitTextToSize(lineText, pageWidth - marginX * 2);
      doc.text(wrapped, marginX, y);
      y += wrapped.length * 12 + 4;
    }
    if (input.operationFilters.length > 0) {
      const lineText = `Operations: ${input.operationFilters.join(", ")}`;
      const wrapped = doc.splitTextToSize(lineText, pageWidth - marginX * 2);
      ensureSpace(wrapped.length * 12 + 8);
      doc.text(wrapped, marginX, y);
      y += wrapped.length * 12 + 12;
    }
  }

  if (input.groups.length === 0) {
    ensureSpace(24);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(...muted);
    doc.text("No time entries match these filters.", marginX, y);
  }

  for (const client of input.groups) {
    if (input.groups.length > 1) {
      ensureSpace(36);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(...dark);
      doc.text(client.name, marginX, y);
      doc.setTextColor(...accent);
      doc.text(formatElapsedClock(client.ms), pageWidth - marginX, y, {
        align: "right",
      });
      y += 10;
      doc.setDrawColor(...line);
      doc.setLineWidth(0.8);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 18;
    }

    for (const project of client.projects) {
      ensureSpace(28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...dark);
      doc.text(project.name, marginX, y);
      doc.setTextColor(...muted);
      doc.text(formatElapsedClock(project.ms), pageWidth - marginX, y, {
        align: "right",
      });
      y += 16;

      for (const operation of project.operations) {
        ensureSpace(16);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.setTextColor(...dark);
        const opName = doc.splitTextToSize(
          operation.name,
          pageWidth - marginX * 2 - 100,
        );
        doc.text(opName, marginX + 14, y);
        doc.setTextColor(...accent);
        doc.text(formatElapsedClock(operation.ms), pageWidth - marginX, y, {
          align: "right",
        });
        y += Math.max(opName.length, 1) * 13 + 4;
      }

      y += 12;
    }

    y += 6;
  }

  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...muted);
    doc.text(
      `Toggle But Better · Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 24,
      { align: "center" },
    );
  }

  const safeName = input.displayName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  const safeClient = input.clientLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`time-log-${safeName}-${safeClient}-${filenameDate()}.pdf`);
}

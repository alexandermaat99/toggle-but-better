import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  formatDurationShort,
  formatElapsedClock,
  formatLogRange,
} from "@/lib/format-time";

export type ReportPdfLog = {
  id: number;
  description: string;
  operationName: string;
  projectName: string;
  clientName: string;
  start_time: string;
  end_time: string;
  ms: number;
};

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
      logs: ReportPdfLog[];
    }[];
  }[];
};

type ReportPdfInput = {
  title?: string;
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

  // Muted steel blue — calmer for print
  const accent: [number, number, number] = [71, 112, 148];
  const dark: [number, number, number] = [23, 23, 23];
  const muted: [number, number, number] = [115, 115, 115];
  const line: [number, number, number] = [212, 212, 212];

  const ensureSpace = (needed: number) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    if (y + needed > pageHeight - 48) {
      doc.addPage();
      y = 52;
    }
  };

  // Header bar
  doc.setFillColor(...accent);
  doc.rect(0, 0, pageWidth, 8, "F");

  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(input.title ?? "Time Report", marginX, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  doc.text(`Generated ${new Date().toLocaleString()}`, marginX, y);
  y += 28;

  // Summary card
  ensureSpace(90);
  doc.setDrawColor(...line);
  doc.setFillColor(250, 250, 250);
  doc.roundedRect(marginX, y, pageWidth - marginX * 2, 78, 8, 8, "FD");

  const summaryX = marginX + 16;
  let summaryY = y + 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...dark);
  doc.text("Summary", summaryX, summaryY);
  summaryY += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...muted);
  doc.text(`Client: ${input.clientLabel}`, summaryX, summaryY);
  summaryY += 14;
  doc.text(`Span: ${input.rangeLabel} · ${input.rangeDates}`, summaryX, summaryY);
  summaryY += 14;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...accent);
  doc.text(
    `Total: ${formatElapsedClock(input.totalMs)} (${formatDurationShort(input.totalMs)})`,
    summaryX,
    summaryY,
  );
  y += 98;

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
    ensureSpace(36);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...dark);
    doc.text(client.name, marginX, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(...accent);
    doc.text(formatElapsedClock(client.ms), pageWidth - marginX, y, {
      align: "right",
    });
    y += 10;

    doc.setDrawColor(...line);
    doc.setLineWidth(0.8);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 18;

    for (const project of client.projects) {
      ensureSpace(28);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...dark);
      doc.text(project.name, marginX, y);
      doc.setTextColor(...muted);
      doc.text(formatElapsedClock(project.ms), pageWidth - marginX, y, {
        align: "right",
      });
      y += 14;

      for (const operation of project.operations) {
        ensureSpace(24);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(...dark);
        doc.text(operation.name, marginX + 8, y);
        doc.setTextColor(...accent);
        doc.text(formatElapsedClock(operation.ms), pageWidth - marginX, y, {
          align: "right",
        });
        y += 8;

        const body = operation.logs.map((log) => [
          log.description || "—",
          formatLogRange(log.start_time, log.end_time),
          formatDurationShort(log.ms),
        ]);

        autoTable(doc, {
          startY: y,
          margin: { left: marginX + 8, right: marginX },
          head: [["Entry", "When", "Duration"]],
          body,
          theme: "plain",
          styles: {
            font: "helvetica",
            fontSize: 9,
            textColor: dark,
            cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
            overflow: "linebreak",
          },
          headStyles: {
            fillColor: [245, 245, 245],
            textColor: muted,
            fontStyle: "bold",
            fontSize: 8,
          },
          columnStyles: {
            0: { cellWidth: 180 },
            1: { cellWidth: 200 },
            2: { cellWidth: 70, halign: "right", textColor: accent },
          },
          didDrawPage: () => {
            doc.setFillColor(...accent);
            doc.rect(0, 0, pageWidth, 8, "F");
          },
        });

        const docWithTable = doc as jsPDF & {
          lastAutoTable?: { finalY: number };
        };
        y = (docWithTable.lastAutoTable?.finalY ?? y) + 16;
      }

      y += 6;
    }

    y += 10;
  }

  // Footer page numbers
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

  const safeClient = input.clientLabel.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
  doc.save(`time-report-${safeClient}-${filenameDate()}.pdf`);
}

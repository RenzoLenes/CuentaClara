import type { TextItem } from "pdfjs-dist/types/src/display/api";

interface TextFragment {
  text: string;
  x: number;
  y: number;
  width: number;
}

interface ExtractedLine {
  text: string;
  amountX: number | null;
}

export interface ExtractionResult {
  text: string;
  lines: ExtractedLine[];
  debitHeaderX: number | null;
  creditHeaderX: number | null;
}

interface ColumnLayout {
  debitHeaderX: number | null;
  creditHeaderX: number | null;
  /** Right edge of the DESCRIPCION header (description content must be left of this) */
  descriptionEndX: number | null;
  /** X where SALDO column starts -- only for cuenta corriente */
  saldoX: number | null;
}

/**
 * Detects column header positions from all fragments on a page.
 * Uses relative positioning instead of hardcoded thresholds:
 * columns are identified by their text, then noise/saldo columns
 * are determined by being to the RIGHT of known columns.
 */
function detectColumns(fragments: TextFragment[]): ColumnLayout {
  const layout: ColumnLayout = {
    debitHeaderX: null,
    creditHeaderX: null,
    descriptionEndX: null,
    saldoX: null,
  };

  const headerCandidates: { label: string; x: number; width: number }[] = [];

  for (const frag of fragments) {
    const t = frag.text.trim().toUpperCase();
    headerCandidates.push({ label: t, x: frag.x, width: frag.width });

    // CARGOS / DEBE or CARGO / ABONO (exact column headers only)
    if (t === "CARGOS / DEBE" || t === "CARGO / ABONO" || t === "CARGOS" || t === "CARGO") {
      layout.debitHeaderX = frag.x;
    }
    // ABONOS / HABER (only in ahorros format)
    if (t.startsWith("ABONOS")) {
      layout.creditHeaderX = frag.x;
    }
    // DESCRIPCION header -- use its RIGHT edge as the boundary
    if (t.startsWith("DESCRIPCION")) {
      layout.descriptionEndX = frag.x + frag.width;
    }
  }

  // Detect SALDO: find "SALDO" that appears to the RIGHT of CARGO/ABONO column
  for (const h of headerCandidates) {
    if (h.label === "SALDO" || h.label.startsWith("SALDOPAGINA")) {
      if (layout.debitHeaderX != null && h.x > layout.debitHeaderX) {
        layout.saldoX = h.x;
      }
    }
  }

  return layout;
}

export async function extractTextFromPdf(
  buffer: ArrayBuffer,
  password?: string
): Promise<ExtractionResult> {
  const pdfjsLib = await import("pdfjs-dist");

  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const loadingTask = pdfjsLib.getDocument({
    data: buffer,
    password: password || undefined,
  });

  const pdf = await loadingTask.promise;
  const allLines: ExtractedLine[] = [];
  let layout: ColumnLayout | null = null;

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();

    const fragments: TextFragment[] = content.items
      .filter((item): item is TextItem => "str" in item && item.str !== "")
      .map((item) => ({
        text: item.str,
        x: item.transform[4],
        y: Math.round(item.transform[5]),
        width: item.width ?? 0,
      }));

    if (fragments.length === 0) continue;

    // Detect column layout from first page
    if (pageNum === 1) {
      layout = detectColumns(fragments);
    }

    // Group fragments by y-coordinate (tolerance of 3 = same line)
    const lineMap = new Map<number, TextFragment[]>();
    for (const frag of fragments) {
      let matchedY: number | null = null;
      for (const existingY of lineMap.keys()) {
        if (Math.abs(existingY - frag.y) < 3) {
          matchedY = existingY;
          break;
        }
      }
      const key = matchedY ?? frag.y;
      if (!lineMap.has(key)) lineMap.set(key, []);
      lineMap.get(key)!.push(frag);
    }

    const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);

    for (const y of sortedYs) {
      let lineFrags = lineMap.get(y)!.sort((a, b) => a.x - b.x);

      // Filter columns based on detected layout
      if (layout) {
        lineFrags = filterNoiseColumns(lineFrags, layout);
      }

      // Build line text
      let lineText = "";
      let prevEnd = 0;
      for (const frag of lineFrags) {
        if (prevEnd > 0) {
          const gap = frag.x - prevEnd;
          if (gap > 1) {
            const spaces = Math.max(1, Math.round(gap / 4));
            lineText += " ".repeat(spaces);
          }
        }
        lineText += frag.text;
        prevEnd = frag.x + frag.width;
      }

      // Find X position of the last numeric fragment
      let amountX: number | null = null;
      for (let i = lineFrags.length - 1; i >= 0; i--) {
        if (/[\d,]+\.?\d*/.test(lineFrags[i].text.replace(/-$/, ""))) {
          amountX = lineFrags[i].x;
          break;
        }
      }

      allLines.push({ text: lineText, amountX });
    }
  }

  const fullText = allLines.map((l) => l.text).join("\n");

  return {
    text: fullText,
    lines: allLines,
    debitHeaderX: layout?.debitHeaderX ?? null,
    creditHeaderX: layout?.creditHeaderX ?? null,
  };
}

/**
 * Filters out fragments that belong to noise columns (MED AT, LUGAR, HORA, NUM OP)
 * and the SALDO column. Only applies when we have enough column info.
 *
 * Keeps: date + description (left side) and CARGO/ABONO amount.
 * Removes: everything between description end and CARGO/ABONO, plus SALDO.
 */
function filterNoiseColumns(
  frags: TextFragment[],
  layout: ColumnLayout
): TextFragment[] {
  const { descriptionEndX, debitHeaderX, saldoX } = layout;

  // Only filter if we detected both description end AND debit column
  // (this means it's a format with extra columns between description and amount)
  if (descriptionEndX == null || debitHeaderX == null) {
    // For ahorros format (or if detection failed): only filter SALDO
    if (saldoX != null) {
      return frags.filter((f) => f.x < saldoX);
    }
    return frags;
  }

  return frags.filter((f) => {
    // Keep: within description column (date + description text)
    if (f.x < descriptionEndX) return true;
    // Keep: in CARGO/ABONO column area
    if (f.x >= debitHeaderX) {
      // Exclude SALDO if detected
      if (saldoX != null && f.x >= saldoX) return false;
      return true;
    }
    // Remove: noise columns (MED AT, LUGAR, HORA, NUM OP)
    return false;
  });
}

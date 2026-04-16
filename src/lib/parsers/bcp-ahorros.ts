import type { Transaction, ParseResult, PositionedLine } from "./types";

const MONTHS: Record<string, number> = {
  ENE: 0, FEB: 1, MAR: 2, ABR: 3,
  MAY: 4, JUN: 5, JUL: 6, AGO: 7,
  SEP: 8, OCT: 9, NOV: 10, DIC: 11,
};

function parseDate(dateStr: string, year: number): Date | null {
  const match = dateStr.match(/^(\d{2})([A-Z]{3})$/);
  if (!match) return null;
  const day = parseInt(match[1]);
  const month = MONTHS[match[2]];
  if (month === undefined) return null;
  return new Date(year, month, day);
}

function extractYear(text: string): number | null {
  const match = text.match(/DEL\s+\d{2}\/\d{2}\/(\d{2})\s+AL\s+\d{2}\/\d{2}\/\d{2}/);
  if (match) return 2000 + parseInt(match[1]);
  return null;
}

function extractPeriod(text: string): string {
  const match = text.match(/DEL\s+(\d{2}\/\d{2}\/\d{2})\s+AL\s+(\d{2}\/\d{2}\/\d{2})/);
  return match ? `${match[1]} - ${match[2]}` : "";
}

function extractAccount(text: string): string {
  const match = text.match(/(191-\d+-\d+-\d+)/);
  return match ? match[1] : "";
}

export interface SavingsParseOptions {
  debitHeaderX: number | null;
  creditHeaderX: number | null;
}

export function parseBCPSavings(
  text: string,
  lines: PositionedLine[],
  options: SavingsParseOptions
): ParseResult {
  const year = extractYear(text);
  if (!year) {
    return { transactions: [], period: "", accountHolder: "", account: "", currency: "SOLES" };
  }

  // Threshold to distinguish debit vs credit column.
  // Uses midpoint between the two column headers when both are available.
  let columnThresholdX: number | null = null;
  if (options.debitHeaderX != null && options.creditHeaderX != null) {
    columnThresholdX = (options.debitHeaderX + options.creditHeaderX) / 2;
  }

  const transactions: Transaction[] = [];

  for (const line of lines) {
    const trimmed = line.text.trimEnd();
    if (!trimmed) continue;

    const m = trimmed.match(
      /^(\d{2}[A-Z]{3})\s+(\d{2}[A-Z]{3})\s+(.+)\s+([\d,]+\.\d{2})\s*$/
    );
    if (!m) continue;

    const processingDate = parseDate(m[1], year);
    const valueDate = parseDate(m[2], year);
    if (!processingDate) continue;

    const amount = parseFloat(m[4].replace(/,/g, ""));
    // Clean trailing standalone * or single digit (format artifacts, not description content)
    const description = m[3].replace(/\s+\*\s*$/, "").replace(/\s+\d\s*$/, "").trim();

    // Determine debit vs credit using X position of the amount.
    // If we can't determine (missing headers), default to debit.
    let isCredit = false;
    if (columnThresholdX != null && line.amountX != null) {
      isCredit = line.amountX > columnThresholdX;
    }

    transactions.push({
      date: processingDate,
      valueDate: valueDate ?? undefined,
      description,
      debit: isCredit ? null : amount,
      credit: isCredit ? amount : null,
    });
  }

  return {
    transactions,
    period: extractPeriod(text),
    accountHolder: "",
    account: extractAccount(text),
    currency: "SOLES",
  };
}

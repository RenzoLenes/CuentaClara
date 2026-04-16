import type { Transaction, ParseResult, PositionedLine } from "./types";

function extractYear(text: string): number | null {
  // Match the period header specifically: "DEL DD/MM/YYYY" or standalone "DD/MM/YYYY DD/MM/YYYY"
  const periodMatch = text.match(/(?:DEL\s+)?\d{2}\/\d{2}\/(\d{4})\s+\d{2}\/\d{2}\/\d{4}/);
  if (periodMatch) return parseInt(periodMatch[1]);
  // Fallback: first DD/MM/YYYY
  const match = text.match(/\d{2}\/\d{2}\/(\d{4})/);
  return match ? parseInt(match[1]) : null;
}

function extractPeriod(text: string): string {
  const match = text.match(/(\d{2}\/\d{2}\/\d{4})\s+(\d{2}\/\d{2}\/\d{4})/);
  return match ? `${match[1]} - ${match[2]}` : "";
}

function extractAccountHolder(text: string): string {
  const match = text.match(/PAGINA\s*\n([A-ZÁÉÍÓÚÑ\.\s]+(?:S\.A\.C|S\.R\.L|E\.I\.R\.L)?)\s*\n/);
  return match ? match[1].trim() : "";
}

function extractAccount(text: string): string {
  const match = text.match(/(191-\d+-\d+-\d+)/);
  return match ? match[1] : "";
}

/**
 * Same approach as the Python parser:
 * 1. Line starts with DD-MM
 * 2. Amount at the end (with optional - suffix for debits)
 * 3. Description between date and first multiple-space gap
 *
 * The SALDO column is filtered out at the extraction level,
 * so lines here should NOT include the balance.
 */
export function parseBCPCheckingAccount(
  text: string,
  lines: PositionedLine[]
): ParseResult {
  const year = extractYear(text);
  if (!year) {
    return { transactions: [], period: "", accountHolder: "", account: "", currency: "SOLES" };
  }

  const transactions: Transaction[] = [];

  for (const line of lines) {
    let lineText = line.text.trimEnd();

    if (!/^\d{2}-\d{2}\s/.test(lineText)) continue;

    // Clean page header garbage
    lineText = lineText.replace(/\s+CONTABLE SUC-AGE.*$/, "");

    // Amount at end: supports .25- and 1,234.56- and 40.00
    // Requires at least a digit before or after the decimal point
    const amountMatch = lineText.match(/(\d[\d,]*\.\d{2}|\.\d{2})(-?)\s*$/);
    if (!amountMatch) continue;

    const amount = parseFloat(amountMatch[1].replace(/,/g, ""));
    const isDebit = amountMatch[2] === "-";

    // Date
    const day = parseInt(lineText.substring(0, 2));
    const month = parseInt(lineText.substring(3, 5)) - 1;
    let date: Date;
    try {
      date = new Date(year, month, day);
      if (isNaN(date.getTime())) continue;
    } catch {
      continue;
    }

    // Description: everything between date and amount
    const descMatch = lineText.match(/^\d{2}-\d{2}\s+(.+)\s+(\d[\d,]*\.\d{2}|\.\d{2})-?\s*$/);
    // Clean trailing MED AT codes that may leak from the next column
    const description = descMatch
      ? descMatch[1].replace(/\s+(BPI|POS|VEN|INT|CAJ)$/, "").trim()
      : "?";

    transactions.push({
      date,
      description,
      debit: isDebit ? amount : null,
      credit: isDebit ? null : amount,
    });
  }

  transactions.sort((a, b) => a.date.getTime() - b.date.getTime());

  return {
    transactions,
    period: extractPeriod(text),
    accountHolder: extractAccountHolder(text),
    account: extractAccount(text),
    currency: "SOLES",
  };
}

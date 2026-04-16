import { parseBCPSavings } from "./bcp-ahorros";
import { parseBCPCheckingAccount } from "./bcp-cuenta-corriente";
import type { ParseResult, StatementType, PositionedLine } from "./types";

export type { Transaction, ParseResult, StatementType, PositionedLine } from "./types";

interface ParseOptions {
  debitHeaderX: number | null;
  creditHeaderX: number | null;
}

export function parseStatement(
  text: string,
  lines: PositionedLine[],
  type: StatementType,
  options: ParseOptions
): ParseResult {
  switch (type) {
    case "bcp-ahorros":
      return parseBCPSavings(text, lines, options);
    case "bcp-cuenta-corriente":
      return parseBCPCheckingAccount(text, lines);
    default:
      throw new Error(`Unsupported statement type: ${type}`);
  }
}

export function detectStatementType(text: string): StatementType | null {
  if (/Estado de Cuenta de Ahorros/i.test(text)) return "bcp-ahorros";
  if (/ESTADO DE CUENTA CORRIENTE/i.test(text)) return "bcp-cuenta-corriente";
  if (/Cuenta Digital BCP/i.test(text)) return "bcp-ahorros";
  if (/\d{2}-\d{2}\s+.*?(BPI|VEN|INT|POS|CAJ)\s/i.test(text)) return "bcp-cuenta-corriente";
  return null;
}

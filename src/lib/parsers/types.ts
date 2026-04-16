export interface Transaction {
  date: Date;
  valueDate?: Date;
  description: string;
  debit: number | null;
  credit: number | null;
}

export interface ParseResult {
  transactions: Transaction[];
  period: string;
  accountHolder: string;
  account: string;
  currency: string;
}

export type StatementType = "bcp-ahorros" | "bcp-cuenta-corriente";

/** A text line with positional metadata from the PDF extractor */
export interface PositionedLine {
  text: string;
  amountX: number | null;
}

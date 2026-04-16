import type { Transaction } from "./parsers/types";

interface ExcelSheet {
  name: string;
  transactions: Transaction[];
  hasValueDateColumn: boolean;
}

export async function generateExcel(sheets: ExcelSheet[]): Promise<Blob> {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();

  const headerFill = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FF4472C4" },
  };
  const debitFill = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FFFFF2CC" },
  };
  const creditFill = {
    type: "pattern" as const,
    pattern: "solid" as const,
    fgColor: { argb: "FFE2EFDA" },
  };
  const thinBorder = {
    top: { style: "thin" as const },
    bottom: { style: "thin" as const },
    left: { style: "thin" as const },
    right: { style: "thin" as const },
  };
  const headerFont = {
    bold: true,
    size: 11,
    color: { argb: "FFFFFFFF" },
  };

  for (const sheet of sheets) {
    const ws = workbook.addWorksheet(sheet.name);

    const headers = sheet.hasValueDateColumn
      ? ["Fecha Proc.", "Fecha Valor", "Descripcion", "Cargo (S/)", "Abono (S/)"]
      : ["Fecha", "Descripcion", "Cargo (S/)", "Abono (S/)"];

    const headerRow = ws.addRow(headers);
    headerRow.eachCell((cell) => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { horizontal: "center" };
      cell.border = thinBorder;
    });

    for (const tx of sheet.transactions) {
      const rowData = sheet.hasValueDateColumn
        ? [tx.date, tx.valueDate ?? null, tx.description, tx.debit, tx.credit]
        : [tx.date, tx.description, tx.debit, tx.credit];

      const row = ws.addRow(rowData);

      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        cell.border = thinBorder;

        const debitCol = sheet.hasValueDateColumn ? 4 : 3;
        const creditCol = sheet.hasValueDateColumn ? 5 : 4;

        if (colNumber <= (sheet.hasValueDateColumn ? 2 : 1)) {
          cell.numFmt = "DD/MM/YYYY";
        }
        if (colNumber === debitCol || colNumber === creditCol) {
          cell.numFmt = "#,##0.00";
        }
        if (colNumber === debitCol && tx.debit !== null) {
          cell.fill = debitFill;
        }
        if (colNumber === creditCol && tx.credit !== null) {
          cell.fill = creditFill;
        }
      });
    }

    const lastDataRow = sheet.transactions.length + 1;
    const debitColLetter = sheet.hasValueDateColumn ? "D" : "C";
    const creditColLetter = sheet.hasValueDateColumn ? "E" : "D";
    const labelCol = sheet.hasValueDateColumn ? 3 : 2;
    const debitColNum = sheet.hasValueDateColumn ? 4 : 3;
    const creditColNum = sheet.hasValueDateColumn ? 5 : 4;

    const totalRow = ws.addRow([]);
    totalRow.getCell(labelCol).value = "TOTAL";
    totalRow.getCell(labelCol).font = { bold: true };

    totalRow.getCell(debitColNum).value = {
      formula: `SUM(${debitColLetter}2:${debitColLetter}${lastDataRow})`,
    };
    totalRow.getCell(debitColNum).numFmt = "#,##0.00";
    totalRow.getCell(debitColNum).font = { bold: true };

    totalRow.getCell(creditColNum).value = {
      formula: `SUM(${creditColLetter}2:${creditColLetter}${lastDataRow})`,
    };
    totalRow.getCell(creditColNum).numFmt = "#,##0.00";
    totalRow.getCell(creditColNum).font = { bold: true };

    totalRow.eachCell({ includeEmpty: true }, (cell) => {
      cell.border = thinBorder;
    });

    if (sheet.hasValueDateColumn) {
      ws.getColumn(1).width = 14;
      ws.getColumn(2).width = 14;
      ws.getColumn(3).width = 35;
      ws.getColumn(4).width = 15;
      ws.getColumn(5).width = 15;
    } else {
      ws.getColumn(1).width = 14;
      ws.getColumn(2).width = 35;
      ws.getColumn(3).width = 15;
      ws.getColumn(4).width = 15;
    }
  }

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

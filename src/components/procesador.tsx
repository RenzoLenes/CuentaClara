"use client";

import { useState, useCallback } from "react";
import type { ParseResult, StatementType } from "@/lib/parsers";

type Status = "idle" | "processing" | "done" | "error";

interface FileResult {
  name: string;
  result: ParseResult;
}

export function Processor() {
  const [files, setFiles] = useState<File[]>([]);
  const [password, setPassword] = useState("");
  const [type, setType] = useState<StatementType>("bcp-ahorros");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [results, setResults] = useState<FileResult[]>([]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const dropped = Array.from(e.dataTransfer.files).filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
    );
    if (dropped.length > 0) setFiles((prev) => [...prev, ...dropped]);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).filter(
      (f) => f.type === "application/pdf" || f.name.endsWith(".pdf")
    );
    if (selected.length > 0) setFiles((prev) => [...prev, ...selected]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const process = async () => {
    if (files.length === 0) return;
    setStatus("processing");
    setError("");

    try {
      const [pdfModule, parsersModule] = await Promise.all([
        import("@/lib/pdf-processor"),
        import("@/lib/parsers"),
      ]);
      const { extractTextFromPdf } = pdfModule;
      const { parseStatement, detectStatementType } = parsersModule;

      const tempResults: FileResult[] = [];

      for (const file of files) {
        const buffer = await file.arrayBuffer();
        const extracted = await extractTextFromPdf(buffer, password || undefined);

        const detectedType = detectStatementType(extracted.text) ?? type;
        const result = parseStatement(
          extracted.text,
          extracted.lines,
          detectedType,
          {
            debitHeaderX: extracted.debitHeaderX,
            creditHeaderX: extracted.creditHeaderX,
          }
        );

        if (result.transactions.length === 0) {
          throw new Error(
            `No se encontraron movimientos en ${file.name}. Verifica la contrasena y el tipo de estado de cuenta.`
          );
        }

        tempResults.push({ name: file.name, result });
      }

      setResults(tempResults);
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setStatus("error");
    }
  };

  const download = async () => {
    const { generateExcel, downloadBlob } = await import(
      "@/lib/excel-generator"
    );

    const sheets = results.map((r) => ({
      name: r.name.replace(/\.pdf$/i, "").substring(0, 31),
      transactions: r.result.transactions,
      hasValueDateColumn: r.result.transactions.some(
        (t) => t.valueDate !== undefined
      ),
    }));

    const blob = await generateExcel(sheets);
    const filename =
      results.length === 1
        ? results[0].name.replace(/\.pdf$/i, ".xlsx")
        : "CuentaClara_movimientos.xlsx";
    downloadBlob(blob, filename);
  };

  const reset = () => {
    setFiles([]);
    setPassword("");
    setResults([]);
    setStatus("idle");
    setError("");
  };

  return (
    <div className="space-y-10">
      {/* Title */}
      <div>
        <p className="text-muted-fg text-xs tracking-wider mb-4">
          ~/dashboard/convertir
        </p>
        <h2 className="text-3xl font-bold uppercase" style={{ letterSpacing: "2px" }}>
          Convertir
        </h2>
      </div>

      {status !== "done" && (
        <>
          {/* Drop zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="flex flex-col items-center justify-center bg-surface border border-dashed border-border py-14 px-8 text-center transition hover:border-accent"
            style={{ borderRadius: "var(--radius)" }}
          >
            <div className="w-14 h-14 flex items-center justify-center bg-muted rounded-full mb-5">
              <svg className="w-6 h-6 text-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                <path d="M12 18v-6" />
                <path d="m9 15 3-3 3 3" />
              </svg>
            </div>
            <p className="text-sm font-semibold">
              Arrastra tus PDFs aqui o{" "}
              <label className="cursor-pointer text-accent hover:underline">
                seleccionalos
                <input
                  type="file"
                  accept=".pdf"
                  multiple
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </label>
            </p>
            <p className="text-[11px] text-muted-fg mt-2">
              Tus archivos nunca salen de tu computadora
            </p>
            <div className="flex items-center gap-1.5 mt-4 text-accent text-[11px] font-semibold">
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
              procesamiento 100% local
            </div>
          </div>

          {/* Files list */}
          {files.length > 0 ? (
            <div className="space-y-2">
              {files.map((f, i) => (
                <div
                  key={`${f.name}-${f.size}-${f.lastModified}`}
                  className="flex items-center justify-between bg-surface border border-border px-4 py-3 text-xs"
                  style={{ borderRadius: "var(--radius-sm)" }}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-4 h-4 text-accent" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                      <path d="M10 13H8" /><path d="M16 17H8" /><path d="M16 13h-2" />
                    </svg>
                    <span className="font-medium">{f.name}</span>
                  </div>
                  <button
                    onClick={() => removeFile(i)}
                    className="flex items-center gap-1 text-danger hover:underline"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
                    </svg>
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          ) : null}

          {/* Password & Type */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-semibold mb-2 uppercase tracking-wider">
                Contrasena del PDF
              </label>
              <div className="flex items-center gap-2 bg-surface border border-border px-4 py-3" style={{ borderRadius: "var(--radius)" }}>
                <svg className="w-4 h-4 text-muted-fg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ej: 72299789"
                  className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-fg/50"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold mb-2 uppercase tracking-wider">
                Tipo de estado
              </label>
              <div className="bg-surface border border-border px-4 py-3" style={{ borderRadius: "var(--radius)" }}>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as StatementType)}
                  className="w-full bg-transparent text-sm outline-none cursor-pointer"
                >
                  <option value="bcp-ahorros">BCP - Personas</option>
                  <option value="bcp-cuenta-corriente">BCP - Empresas</option>
                </select>
              </div>
              <p className="mt-2 text-[10px] text-muted-fg">
                se detecta automaticamente si es posible
              </p>
            </div>
          </div>

          {/* Process button */}
          <button
            onClick={process}
            disabled={files.length === 0 || status === "processing"}
            className="w-full bg-primary text-primary-fg py-3.5 text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            style={{ borderRadius: "var(--radius)" }}
          >
            {status === "processing" ? (
              "procesando..."
            ) : (
              <>
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                procesar
              </>
            )}
          </button>
        </>
      )}

      {/* Error */}
      {status === "error" ? (
        <div
          className="flex items-center gap-3 bg-danger-bg border border-danger/20 px-5 py-4 text-xs text-danger"
          style={{ borderRadius: "var(--radius)" }}
        >
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" x2="12" y1="8" y2="12" />
            <line x1="12" x2="12.01" y1="16" y2="16" />
          </svg>
          {error}
        </div>
      ) : null}

      {/* Results */}
      {status === "done" && results.length > 0 ? (
        <div className="space-y-8">
          {results.map((r) => (
            <div
              key={r.name}
              className="bg-surface border border-border"
              style={{ borderRadius: "var(--radius)" }}
            >
              {/* Result header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-border">
                <div>
                  <h3 className="font-bold text-sm">{r.name}</h3>
                  {r.result.period ? (
                    <p className="text-xs text-muted-fg mt-1">
                      periodo: {r.result.period}
                    </p>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 border border-credit/30 px-3 py-1.5 text-[11px] font-semibold text-credit">
                  <span className="w-1.5 h-1.5 bg-credit shadow-[0_0_6px_#00D08466]" />
                  {r.result.transactions.length} movimientos
                </div>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 gap-px bg-border">
                <div className="bg-surface px-6 py-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-fg">total cargos</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-debit shadow-[0_0_6px_#FF444466]" />
                      <span className="text-[9px] font-semibold text-debit">EGRESOS</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    S/{" "}
                    {r.result.transactions
                      .reduce((sum, t) => sum + (t.debit ?? 0), 0)
                      .toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="bg-surface px-6 py-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs text-muted-fg">total abonos</span>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-credit shadow-[0_0_6px_#00D08466]" />
                      <span className="text-[9px] font-semibold text-credit">INGRESOS</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold">
                    S/{" "}
                    {r.result.transactions
                      .reduce((sum, t) => sum + (t.credit ?? 0), 0)
                      .toLocaleString("es-PE", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="px-6 py-5">
                <div className="flex items-center justify-between mb-5">
                  <span className="text-sm font-semibold">
                    movimientos :: {r.name.replace(/\.pdf$/i, "")}
                  </span>
                  <span className="text-[11px] text-muted-fg">
                    $ export --xlsx
                  </span>
                </div>
                <div className="max-h-72 overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-foreground">
                        <th className="text-left py-3 text-[10px] font-medium text-muted-fg">fecha</th>
                        <th className="text-left py-3 text-[10px] font-medium text-muted-fg">descripcion</th>
                        <th className="text-right py-3 text-[10px] font-medium text-debit">cargo</th>
                        <th className="text-right py-3 text-[10px] font-medium text-credit">abono</th>
                      </tr>
                    </thead>
                    <tbody>
                      {r.result.transactions.slice(0, 20).map((t, j) => (
                        <tr key={j} className="border-b border-muted hover:bg-muted/50 transition-colors">
                          <td className="py-3 font-medium">
                            {t.date.toLocaleDateString("es-PE")}
                          </td>
                          <td className="py-3 font-medium">{t.description}</td>
                          <td className="py-3 text-right text-debit font-semibold">
                            {t.debit?.toFixed(2) ?? ""}
                          </td>
                          <td className="py-3 text-right text-credit font-semibold">
                            {t.credit?.toFixed(2) ?? ""}
                          </td>
                        </tr>
                      ))}
                      {r.result.transactions.length > 20 ? (
                        <tr>
                          <td colSpan={4} className="py-3 text-center text-muted-fg">
                            ... y {r.result.transactions.length - 20} mas
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}

          {/* Actions */}
          <div className="flex gap-4">
            <button
              onClick={download}
              className="flex-1 bg-credit text-white py-3.5 text-sm font-semibold hover:bg-credit/90 transition-colors flex items-center justify-center gap-2"
              style={{ borderRadius: "var(--radius)" }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" x2="12" y1="15" y2="3" />
              </svg>
              descargar excel
            </button>
            <button
              onClick={reset}
              className="border border-foreground px-8 py-3.5 text-sm font-medium hover:bg-muted transition-colors flex items-center gap-2"
              style={{ borderRadius: "var(--radius)" }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              nuevo archivo
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

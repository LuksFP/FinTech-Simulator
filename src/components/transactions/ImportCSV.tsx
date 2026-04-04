import { useState, useRef, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { parse, format, isValid } from 'date-fns';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { assertValid, transactionSchema } from '@/lib/validation';
import type { TransactionFormData } from '@/types/transaction';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImportCSVProps {
  createTransaction: (data: TransactionFormData) => Promise<void>;
}

interface ColumnMapping {
  date: string;
  description: string;
  amount: string;
  type: string;
}

type RawRow = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DATE_FORMATS = [
  'yyyy-MM-dd',
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'dd-MM-yyyy',
  'MM-dd-yyyy',
  'd/M/yyyy',
  'M/d/yyyy',
  'dd/MM/yy',
  'MM/dd/yy',
  'yyyy/MM/dd',
];

function parseDate(raw: unknown): string {
  const today = format(new Date(), 'yyyy-MM-dd');
  if (raw === null || raw === undefined || raw === '') return today;

  // Excel serial number
  if (typeof raw === 'number') {
    try {
      const date = XLSX.SSF.parse_date_code(raw);
      if (date) {
        const d = new Date(date.y, date.m - 1, date.d);
        if (isValid(d)) return format(d, 'yyyy-MM-dd');
      }
    } catch {
      // fall through
    }
    return today;
  }

  const str = String(raw).trim();
  for (const fmt of DATE_FORMATS) {
    try {
      const parsed = parse(str, fmt, new Date());
      if (isValid(parsed)) return format(parsed, 'yyyy-MM-dd');
    } catch {
      // try next format
    }
  }

  // Native Date parse as last resort
  const native = new Date(str);
  if (isValid(native)) return format(native, 'yyyy-MM-dd');

  return today;
}

function parseAmount(raw: unknown): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return Math.abs(raw);
  const str = String(raw)
    .trim()
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : Math.abs(num);
}

function detectType(raw: unknown, amountRaw: unknown): 'entrada' | 'saida' {
  // Sign convention: negative amount → saida
  if (typeof amountRaw === 'number' && amountRaw < 0) return 'saida';
  if (typeof amountRaw === 'string') {
    const cleaned = String(amountRaw).replace(/[R$\s.]/g, '').replace(',', '.');
    if (parseFloat(cleaned) < 0) return 'saida';
  }

  const str = String(raw ?? '').toLowerCase().trim();
  if (/d[eé]bit|saida|saída|despesa|expense|out|pagamento|withdraw/.test(str)) return 'saida';
  return 'entrada';
}

const DEBIT_KEYWORDS = /d[eé]bit|saida|saída|despesa|expense|out|pagamento|withdraw/i;
const CREDIT_KEYWORDS = /credit|entrada|receita|income|deposit|in/i;

/** Heuristic: if >50 % of non-empty values in a column look like debit labels → it's a type column */
function looksLikeTypeColumn(rows: RawRow[], key: string): boolean {
  const values = rows.map((r) => String(r[key] ?? '')).filter(Boolean);
  if (values.length === 0) return false;
  const hits = values.filter((v) => DEBIT_KEYWORDS.test(v) || CREDIT_KEYWORDS.test(v));
  return hits.length / values.length > 0.4;
}

/** Auto-detect column mappings from header names */
function autoDetect(headers: string[], rows: RawRow[]): ColumnMapping {
  const mapping: ColumnMapping = { date: '', description: '', amount: '', type: '' };

  const normalized = headers.map((h) => ({ original: h, lower: h.toLowerCase().trim() }));

  for (const { original, lower } of normalized) {
    if (!mapping.date && /^(data|date|fecha|dat[ae])$/.test(lower)) {
      mapping.date = original;
    } else if (!mapping.description && /descri|description|historico|histórico|memo|detail|narrat|particulars/.test(lower)) {
      mapping.description = original;
    } else if (!mapping.amount && /^(valor|amount|value|monto|importe|vlr|val|quantia|price)$/.test(lower)) {
      mapping.amount = original;
    } else if (!mapping.type && /^(tipo|type|categoria|natureza|dc|d\/c|cr\/dr)$/.test(lower)) {
      mapping.type = original;
    }
  }

  // Fallback: partial match
  for (const { original, lower } of normalized) {
    if (!mapping.date && lower.includes('dat')) mapping.date = original;
    if (!mapping.description && (lower.includes('desc') || lower.includes('hist'))) mapping.description = original;
    if (!mapping.amount && (lower.includes('val') || lower.includes('amo') || lower.includes('vlr'))) mapping.amount = original;
    if (!mapping.type && (lower.includes('tip') || lower.includes('type'))) mapping.type = original;
  }

  // Further fallback: scan column values
  if (!mapping.type) {
    for (const h of headers) {
      if (looksLikeTypeColumn(rows, h)) {
        mapping.type = h;
        break;
      }
    }
  }

  return mapping;
}

const NONE = '__none__';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportCSV({ createTransaction }: ImportCSVProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ date: '', description: '', amount: '', type: '' });
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  // -------------------------------------------------------------------------
  // Reset state
  // -------------------------------------------------------------------------

  function resetState() {
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setMapping({ date: '', description: '', amount: '', type: '' });
    setImporting(false);
    setProgress(0);
    setDone(false);
    setErrors([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleOpenChange(value: boolean) {
    setOpen(value);
    if (!value) resetState();
  }

  // -------------------------------------------------------------------------
  // File parsing
  // -------------------------------------------------------------------------

  function processFile(file: File) {
    if (!file) return;

    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    const validExts = ['.csv', '.xls', '.xlsx'];
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      toast({
        variant: 'destructive',
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo CSV, XLS ou XLSX.',
      });
      return;
    }

    setFileName(file.name);
    setDone(false);
    setErrors([]);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        if (!data) throw new Error('Arquivo vazio ou ilegível.');

        const wb = XLSX.read(data, { type: 'binary', cellDates: false });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '' });

        if (rawRows.length === 0) {
          toast({
            variant: 'destructive',
            title: 'Arquivo vazio',
            description: 'Nenhuma linha encontrada no arquivo.',
          });
          return;
        }

        const detectedHeaders = Object.keys(rawRows[0]);
        const detectedMapping = autoDetect(detectedHeaders, rawRows);

        setHeaders(detectedHeaders);
        setRows(rawRows);
        setMapping(detectedMapping);
      } catch (err) {
        toast({
          variant: 'destructive',
          title: 'Erro ao ler arquivo',
          description: err instanceof Error ? err.message : 'Falha ao processar o arquivo.',
        });
        setFileName(null);
      }
    };
    reader.readAsBinaryString(file);
  }

  // -------------------------------------------------------------------------
  // Drag and drop
  // -------------------------------------------------------------------------

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  // -------------------------------------------------------------------------
  // Import
  // -------------------------------------------------------------------------

  async function handleImport() {
    if (!mapping.description || !mapping.amount) {
      toast({
        variant: 'destructive',
        title: 'Mapeamento incompleto',
        description: 'Os campos Descrição e Valor são obrigatórios.',
      });
      return;
    }

    setImporting(true);
    setProgress(0);
    setErrors([]);
    const importErrors: string[] = [];
    let successCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      const rawAmount = row[mapping.amount];
      const rawDate = mapping.date ? row[mapping.date] : undefined;
      const rawType = mapping.type ? row[mapping.type] : undefined;
      const rawDescription = row[mapping.description];

      const description = String(rawDescription ?? '').trim() || `Transação ${i + 1}`;
      const amount = parseAmount(rawAmount);
      const date = parseDate(rawDate);
      const type = detectType(rawType, rawAmount);

      if (amount === 0) {
        importErrors.push(`Linha ${i + 2}: valor inválido ("${rawAmount}") — ignorada.`);
        setProgress(Math.round(((i + 1) / rows.length) * 100));
        continue;
      }

      const transactionData: TransactionFormData = { description, amount, type, date };

      try {
        assertValid(transactionSchema, transactionData);
        await createTransaction(transactionData);
        successCount++;
      } catch (err) {
        importErrors.push(
          `Linha ${i + 2}: "${description}" — ${err instanceof Error ? err.message : 'erro desconhecido'}`
        );
      }

      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    setImporting(false);
    setDone(true);
    setErrors(importErrors);

    if (successCount > 0) {
      toast({
        title: 'Importação concluída',
        description: `${successCount} transaç${successCount === 1 ? 'ão importada' : 'ões importadas'} com sucesso.${importErrors.length > 0 ? ` ${importErrors.length} ignorada(s).` : ''}`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Nenhuma transação importada',
        description: 'Verifique o mapeamento de colunas e tente novamente.',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const previewRows = rows.slice(0, 5);
  const canImport = rows.length > 0 && !!mapping.description && !!mapping.amount && !importing && !done;

  function mappedValue(key: keyof ColumnMapping): string {
    return mapping[key] || NONE;
  }

  function setMappingField(field: keyof ColumnMapping, value: string) {
    setMapping((prev) => ({ ...prev, [field]: value === NONE ? '' : value }));
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="border-white/20 bg-white/5 hover:bg-white/10 text-white gap-2"
        >
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
            Importar Transações
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* ---------------------------------------------------------------- */}
          {/* Drop zone                                                         */}
          {/* ---------------------------------------------------------------- */}
          {!fileName && (
            <div
              className={`relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors cursor-pointer ${
                dragging
                  ? 'border-emerald-400 bg-emerald-400/10'
                  : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className={`h-10 w-10 ${dragging ? 'text-emerald-400' : 'text-white/40'}`} />
              <div className="text-center">
                <p className="text-sm font-medium text-white/80">
                  Arraste o arquivo aqui ou clique para selecionar
                </p>
                <p className="text-xs text-white/40 mt-1">Suporta CSV, XLS e XLSX</p>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* File selected — header                                            */}
          {/* ---------------------------------------------------------------- */}
          {fileName && (
            <div className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white truncate max-w-xs">{fileName}</p>
                  <p className="text-xs text-white/50">{rows.length} linha(s) encontrada(s)</p>
                </div>
              </div>
              {!importing && (
                <button
                  onClick={resetState}
                  className="text-white/40 hover:text-white/80 transition-colors"
                  aria-label="Remover arquivo"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Column mapping                                                    */}
          {/* ---------------------------------------------------------------- */}
          {headers.length > 0 && !done && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">
                Mapeamento de Colunas
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {(
                  [
                    { field: 'date', label: 'Data', required: false },
                    { field: 'description', label: 'Descrição', required: true },
                    { field: 'amount', label: 'Valor', required: true },
                    { field: 'type', label: 'Tipo (entrada/saída)', required: false },
                  ] as { field: keyof ColumnMapping; label: string; required: boolean }[]
                ).map(({ field, label, required }) => (
                  <div key={field} className="space-y-1.5">
                    <Label className="text-white/70 text-xs">
                      {label}
                      {required && <span className="text-red-400 ml-1">*</span>}
                    </Label>
                    <Select
                      value={mappedValue(field)}
                      onValueChange={(v) => setMappingField(field, v)}
                      disabled={importing}
                    >
                      <SelectTrigger className="bg-white/5 border-white/20 text-white text-sm h-9">
                        <SelectValue placeholder="Selecionar coluna" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-900 border-white/20 text-white">
                        <SelectItem value={NONE} className="text-white/40">
                          — nenhuma —
                        </SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h} className="text-white">
                            {h}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              {(!mapping.description || !mapping.amount) && (
                <p className="flex items-center gap-1.5 text-xs text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Descrição e Valor são obrigatórios para importar.
                </p>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Preview table                                                     */}
          {/* ---------------------------------------------------------------- */}
          {previewRows.length > 0 && !done && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">
                Pré-visualização (primeiras {previewRows.length} linhas)
              </h3>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      {[
                        { key: 'description', label: 'Descrição' },
                        { key: 'amount', label: 'Valor' },
                        { key: 'date', label: 'Data' },
                        { key: 'type', label: 'Tipo' },
                      ].map(({ key, label }) => (
                        <th
                          key={key}
                          className="px-3 py-2 text-left text-white/50 font-medium whitespace-nowrap"
                        >
                          {label}
                          {mapping[key as keyof ColumnMapping] && (
                            <span className="ml-1 text-emerald-400">
                              ← {mapping[key as keyof ColumnMapping]}
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => {
                      const rawAmount = mapping.amount ? row[mapping.amount] : '';
                      const rawDate = mapping.date ? row[mapping.date] : undefined;
                      const rawType = mapping.type ? row[mapping.type] : undefined;
                      const rawDesc = mapping.description ? row[mapping.description] : '';

                      const desc = String(rawDesc ?? '').trim() || `—`;
                      const amount = mapping.amount ? parseAmount(rawAmount) : null;
                      const date = mapping.date ? parseDate(rawDate) : '—';
                      const type = mapping.amount
                        ? detectType(rawType, rawAmount)
                        : null;

                      return (
                        <tr
                          key={idx}
                          className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                        >
                          <td className="px-3 py-2 text-white/80 max-w-[180px] truncate">{desc}</td>
                          <td className="px-3 py-2 text-white/80 whitespace-nowrap">
                            {amount !== null ? (
                              <span
                                className={
                                  type === 'entrada' ? 'text-emerald-400' : 'text-red-400'
                                }
                              >
                                {type === 'saida' ? '- ' : '+ '}
                                R$ {amount.toFixed(2)}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-3 py-2 text-white/60 whitespace-nowrap">{date}</td>
                          <td className="px-3 py-2 whitespace-nowrap">
                            {type ? (
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  type === 'entrada'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-red-500/20 text-red-400'
                                }`}
                              >
                                {type === 'entrada' ? 'Entrada' : 'Saída'}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {rows.length > 5 && (
                <p className="text-xs text-white/40 text-right">
                  + {rows.length - 5} linha(s) não exibida(s)
                </p>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Progress                                                          */}
          {/* ---------------------------------------------------------------- */}
          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/60">
                <span>Importando transações…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-white/10" />
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Done state                                                        */}
          {/* ---------------------------------------------------------------- */}
          {done && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">Importação concluída!</span>
              </div>

              {errors.length > 0 && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 space-y-1 max-h-36 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-400 mb-1">
                    {errors.length} linha(s) ignorada(s):
                  </p>
                  {errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-300/80">
                      {err}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* Action buttons                                                    */}
          {/* ---------------------------------------------------------------- */}
          <div className="flex justify-end gap-3 pt-2 border-t border-white/10">
            <Button
              variant="ghost"
              className="text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => handleOpenChange(false)}
              disabled={importing}
            >
              {done ? 'Fechar' : 'Cancelar'}
            </Button>

            {!done && (
              <Button
                onClick={handleImport}
                disabled={!canImport}
                className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2 disabled:opacity-50"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importando…
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Importar {rows.length > 0 ? `${rows.length} transaç${rows.length === 1 ? 'ão' : 'ões'}` : ''}
                  </>
                )}
              </Button>
            )}

            {done && (
              <Button
                onClick={resetState}
                variant="outline"
                className="border-white/20 bg-white/5 hover:bg-white/10 text-white gap-2"
              >
                <Upload className="h-4 w-4" />
                Importar outro arquivo
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

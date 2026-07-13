import { useState, useRef, useCallback, useMemo } from 'react';
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle2, Loader2, Landmark } from 'lucide-react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useCategories } from '@/hooks/useCategories';
import { useAccounts } from '@/hooks/useAccounts';
import { suggestCategory } from '@/services/autoCategoryService';
import {
  parseDate,
  parseAmount,
  detectType,
  autoDetect,
  parseOFX,
  decodeOFXBuffer,
  isOFXFile,
  duplicateKey,
  type RawRow,
  type ColumnMapping,
  type StatementRow,
} from '@/lib/statementParser';
import type { Transaction, TransactionFormData, Category } from '@/types/transaction';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ImportCSVProps {
  createTransactions: (data: TransactionFormData[]) => Promise<unknown>;
  existingTransactions: Transaction[];
}

interface EnrichedRow extends StatementRow {
  suggestedCategory: Category | null;
  isDuplicate: boolean;
}

// xlsx is heavy (~400 KB) and only needed when the user actually imports a
// spreadsheet, so it is loaded on demand instead of in the main bundle.
let xlsxMod: typeof import('xlsx') | null = null;
async function loadXLSX() {
  if (!xlsxMod) xlsxMod = await import('xlsx');
  return xlsxMod;
}

function excelSerialToDate(serial: number): Date | null {
  try {
    const d = xlsxMod?.SSF.parse_date_code(serial);
    return d ? new Date(d.y, d.m - 1, d.d) : null;
  } catch {
    return null;
  }
}

const NONE = '__none__';
const NO_ACCOUNT = '__no_account__';
const IMPORT_CHUNK_SIZE = 40;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ImportCSV({ createTransactions, existingTransactions }: ImportCSVProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { categories } = useCategories();
  const { accounts } = useAccounts();

  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  // CSV/XLSX: linhas cruas + mapeamento de colunas; OFX: linhas já estruturadas
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<RawRow[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({ date: '', description: '', amount: '', type: '' });
  const [ofxRows, setOfxRows] = useState<StatementRow[] | null>(null);
  // Opções de importação
  const [accountId, setAccountId] = useState<string>('');
  const [autoCategorize, setAutoCategorize] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  // Execução
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);

  const defaultAccountId = accounts.find((a) => a.is_default)?.id ?? '';
  const effectiveAccountId = accountId || defaultAccountId;

  // -------------------------------------------------------------------------
  // Reset state
  // -------------------------------------------------------------------------

  function resetState() {
    setFileName(null);
    setHeaders([]);
    setRows([]);
    setMapping({ date: '', description: '', amount: '', type: '' });
    setOfxRows(null);
    setImporting(false);
    setProgress(0);
    setDone(false);
    setImportedCount(0);
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

  async function processFile(file: File) {
    if (!file) return;

    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

    if (isOFXFile(file.name)) {
      setDone(false);
      setErrors([]);
      try {
        const buffer = await file.arrayBuffer();
        const parsed = parseOFX(decodeOFXBuffer(buffer));
        if (parsed.length === 0) {
          toast({
            variant: 'destructive',
            title: 'Nenhuma transação encontrada',
            description: 'O arquivo OFX não contém transações legíveis.',
          });
          return;
        }
        setFileName(file.name);
        setOfxRows(parsed);
      } catch {
        toast({
          variant: 'destructive',
          title: 'Erro ao ler arquivo',
          description: 'Falha ao processar o arquivo OFX.',
        });
      }
      return;
    }

    const validExts = ['.csv', '.xls', '.xlsx'];
    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ];
    if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
      toast({
        variant: 'destructive',
        title: 'Formato inválido',
        description: 'Por favor, selecione um arquivo OFX, CSV, XLS ou XLSX.',
      });
      return;
    }

    const XLSX = await loadXLSX();

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
          setFileName(null);
          return;
        }

        const detectedHeaders = Object.keys(rawRows[0]);
        setHeaders(detectedHeaders);
        setRows(rawRows);
        setMapping(autoDetect(detectedHeaders, rawRows));
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
  // Linhas normalizadas + enriquecidas (categoria sugerida, duplicata)
  // -------------------------------------------------------------------------

  const isOFX = ofxRows !== null;
  const needsMapping = !isOFX && headers.length > 0;
  const mappingReady = isOFX || (!!mapping.description && !!mapping.amount);

  const statementRows: StatementRow[] = useMemo(() => {
    if (ofxRows) return ofxRows;
    if (!mapping.description || !mapping.amount) return [];

    return rows.map((row, i) => {
      const rawAmount = row[mapping.amount];
      const description =
        String(row[mapping.description] ?? '').trim() || `Transação ${i + 1}`;
      return {
        date: parseDate(mapping.date ? row[mapping.date] : undefined, excelSerialToDate),
        description,
        amount: parseAmount(rawAmount),
        type: detectType(mapping.type ? row[mapping.type] : undefined, rawAmount),
      };
    });
  }, [ofxRows, rows, mapping]);

  const enrichedRows: EnrichedRow[] = useMemo(() => {
    const existingKeys = new Set(existingTransactions.map(duplicateKey));
    return statementRows.map((r) => ({
      ...r,
      suggestedCategory: autoCategorize ? suggestCategory(r.description, r.type, categories) : null,
      isDuplicate: existingKeys.has(duplicateKey(r)),
    }));
  }, [statementRows, existingTransactions, categories, autoCategorize]);

  const validRows = enrichedRows.filter((r) => r.amount > 0);
  const duplicateCount = validRows.filter((r) => r.isDuplicate).length;
  const invalidCount = enrichedRows.length - validRows.length;
  const rowsToImport = skipDuplicates ? validRows.filter((r) => !r.isDuplicate) : validRows;

  // -------------------------------------------------------------------------
  // Import
  // -------------------------------------------------------------------------

  async function handleImport() {
    if (rowsToImport.length === 0) return;

    setImporting(true);
    setProgress(0);
    setErrors([]);
    const importErrors: string[] = [];
    let successCount = 0;

    const payload: TransactionFormData[] = rowsToImport.map((r) => ({
      description: r.description.slice(0, 200),
      amount: r.amount,
      type: r.type,
      date: r.date,
      category_id: r.suggestedCategory?.id,
      account_id: effectiveAccountId || null,
    }));

    for (let i = 0; i < payload.length; i += IMPORT_CHUNK_SIZE) {
      const chunk = payload.slice(i, i + IMPORT_CHUNK_SIZE);
      try {
        await createTransactions(chunk);
        successCount += chunk.length;
      } catch (err) {
        importErrors.push(
          `Linhas ${i + 1}–${i + chunk.length}: ${err instanceof Error ? err.message : 'erro desconhecido'}`
        );
      }
      setProgress(Math.round(Math.min(i + IMPORT_CHUNK_SIZE, payload.length) / payload.length * 100));
    }

    setImporting(false);
    setDone(true);
    setImportedCount(successCount);
    setErrors(importErrors);

    if (successCount > 0) {
      const skipped = skipDuplicates && duplicateCount > 0 ? ` ${duplicateCount} duplicata(s) ignorada(s).` : '';
      toast({
        title: 'Importação concluída',
        description: `${successCount} transaç${successCount === 1 ? 'ão importada' : 'ões importadas'} com sucesso.${skipped}`,
      });
    } else {
      toast({
        variant: 'destructive',
        title: 'Nenhuma transação importada',
        description: 'Verifique o arquivo e tente novamente.',
      });
    }
  }

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------

  const previewRows = enrichedRows.slice(0, 5);
  const canImport = rowsToImport.length > 0 && mappingReady && !importing && !done;

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
          Importar Extrato
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gray-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
            Importar Extrato
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          {/* Drop zone */}
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
                accept=".ofx,.qfx,.csv,.xls,.xlsx"
                className="hidden"
                onChange={handleFileChange}
              />
              <Upload className={`h-10 w-10 ${dragging ? 'text-emerald-400' : 'text-white/40'}`} />
              <div className="text-center">
                <p className="text-sm font-medium text-white/80">
                  Arraste o extrato aqui ou clique para selecionar
                </p>
                <p className="text-xs text-white/40 mt-1">
                  Suporta OFX (extrato do banco), CSV, XLS e XLSX
                </p>
              </div>
            </div>
          )}

          {/* File selected — header */}
          {fileName && (
            <div className="flex items-center justify-between rounded-lg bg-white/5 border border-white/10 px-4 py-3">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-5 w-5 text-emerald-400 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-white truncate max-w-xs">{fileName}</p>
                  <p className="text-xs text-white/50">
                    {enrichedRows.length > 0 || !needsMapping
                      ? `${enrichedRows.length} transaç${enrichedRows.length === 1 ? 'ão' : 'ões'} encontrada(s)`
                      : `${rows.length} linha(s) encontrada(s)`}
                    {isOFX && <span className="ml-1 text-emerald-400/80">· OFX</span>}
                  </p>
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

          {/* Column mapping (só CSV/XLSX) */}
          {needsMapping && !done && (
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

              {!mappingReady && (
                <p className="flex items-center gap-1.5 text-xs text-amber-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  Descrição e Valor são obrigatórios para importar.
                </p>
              )}
            </div>
          )}

          {/* Opções de importação */}
          {fileName && mappingReady && !done && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">
                Opções
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-white/70 text-xs flex items-center gap-1.5">
                    <Landmark className="h-3.5 w-3.5" />
                    Conta de destino
                  </Label>
                  <Select
                    value={effectiveAccountId || NO_ACCOUNT}
                    onValueChange={(v) => setAccountId(v === NO_ACCOUNT ? '' : v)}
                    disabled={importing}
                  >
                    <SelectTrigger className="bg-white/5 border-white/20 text-white text-sm h-9">
                      <SelectValue placeholder="Sem conta" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-900 border-white/20 text-white">
                      <SelectItem value={NO_ACCOUNT} className="text-white/40">
                        — sem conta —
                      </SelectItem>
                      {accounts.map((a) => (
                        <SelectItem key={a.id} value={a.id} className="text-white">
                          {a.name}
                          {a.is_default ? ' (padrão)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2.5 pt-1 sm:pt-6">
                  <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                    <Checkbox
                      checked={autoCategorize}
                      onCheckedChange={(v) => setAutoCategorize(v === true)}
                      disabled={importing}
                      className="border-white/30 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    Categorizar automaticamente
                  </label>
                  <label className="flex items-center gap-2 text-sm text-white/80 cursor-pointer">
                    <Checkbox
                      checked={skipDuplicates}
                      onCheckedChange={(v) => setSkipDuplicates(v === true)}
                      disabled={importing}
                      className="border-white/30 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                    />
                    Ignorar duplicatas
                    {duplicateCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded-full text-xs bg-amber-500/20 text-amber-400">
                        {duplicateCount}
                      </span>
                    )}
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Preview table */}
          {previewRows.length > 0 && !done && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wide">
                Pré-visualização (primeiras {previewRows.length} linhas)
              </h3>
              <div className="overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-white/5 border-b border-white/10">
                      <th className="px-3 py-2 text-left text-white/50 font-medium whitespace-nowrap">Descrição</th>
                      <th className="px-3 py-2 text-left text-white/50 font-medium whitespace-nowrap">Valor</th>
                      <th className="px-3 py-2 text-left text-white/50 font-medium whitespace-nowrap">Data</th>
                      <th className="px-3 py-2 text-left text-white/50 font-medium whitespace-nowrap">Categoria</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => (
                      <tr
                        key={idx}
                        className={`border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${
                          row.isDuplicate && skipDuplicates ? 'opacity-40' : ''
                        }`}
                      >
                        <td className="px-3 py-2 text-white/80 max-w-[180px]">
                          <span className="block truncate">{row.description}</span>
                          {row.isDuplicate && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400">
                              duplicada
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.amount > 0 ? (
                            <span className={row.type === 'entrada' ? 'text-emerald-400' : 'text-red-400'}>
                              {row.type === 'saida' ? '- ' : '+ '}
                              R$ {row.amount.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-red-400/70">inválido</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-white/60 whitespace-nowrap">{row.date}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {row.suggestedCategory ? (
                            <span className="inline-flex items-center gap-1.5 text-white/80">
                              <span
                                className="h-2 w-2 rounded-full shrink-0"
                                style={{ backgroundColor: row.suggestedCategory.color }}
                              />
                              {row.suggestedCategory.name}
                            </span>
                          ) : (
                            <span className="text-white/30">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-white/40 text-right">
                {rowsToImport.length} a importar
                {skipDuplicates && duplicateCount > 0 && ` · ${duplicateCount} duplicata(s) ignorada(s)`}
                {invalidCount > 0 && ` · ${invalidCount} inválida(s)`}
                {enrichedRows.length > 5 && ` · +${enrichedRows.length - 5} linha(s) não exibida(s)`}
              </p>
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-white/60">
                <span>Importando transações…</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2 bg-white/10" />
            </div>
          )}

          {/* Done state */}
          {done && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-5 w-5 shrink-0" />
                <span className="text-sm font-medium">
                  {importedCount} transaç{importedCount === 1 ? 'ão importada' : 'ões importadas'}!
                </span>
              </div>

              {errors.length > 0 && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-3 space-y-1 max-h-36 overflow-y-auto">
                  <p className="text-xs font-semibold text-red-400 mb-1">
                    {errors.length} erro(s):
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

          {/* Action buttons */}
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
                    Importar {rowsToImport.length > 0 ? `${rowsToImport.length} transaç${rowsToImport.length === 1 ? 'ão' : 'ões'}` : ''}
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

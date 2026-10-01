import { useCallback, useMemo, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, AlertTriangle,
  XCircle, Loader2, Search, Store, RefreshCw, Download, EyeOff, RotateCcw, Tag,
} from 'lucide-react';
import { toast } from 'react-toastify';
import {
  parseSpreadsheet, matchCategories, toCsv, downloadTextFile, type ParsedSheet,
} from '../utils/bulk-import';
import { useCategoryTree } from '../hooks/useCategories';
import { providersService } from '../services/providers.service';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import {
  bulkValidateProducts, bulkImportProducts,
  type ProductBulkRow, type ProductRowVerdict, type ProductImportResult,
} from '../services/products.service';

type Step = 'upload' | 'map' | 'review' | 'done';

/** What a sheet column can become. */
const FIELDS = [
  { key: 'providerRef', label: 'Business', hint: 'Name, phone or id of the shop this belongs to', synonyms: ['business', 'provider', 'shop', 'store', 'brand', 'seller', 'vendor', 'business name', 'brand name'] },
  { key: 'name', label: 'Item name', required: true, synonyms: ['name', 'product', 'item', 'service', 'title', 'product name', 'item name'] },
  { key: 'description', label: 'Description', synonyms: ['description', 'details', 'about', 'desc'] },
  { key: 'price', label: 'Price', synonyms: ['price', 'rate', 'cost', 'amount', 'mrp'] },
  { key: 'productType', label: 'Product or service', synonyms: ['type', 'kind', 'product type', 'category type'] },
  { key: 'photoUrl', label: 'Photo link', synonyms: ['photo', 'image', 'picture', 'image url', 'photo url'] },
  { key: 'categoryText', label: 'Category', hint: 'Matched to your category list by name or keyword', synonyms: ['category', 'categories', 'segment', 'department'] },
] as const;

type FieldKey = (typeof FIELDS)[number]['key'];
type Mapping = Partial<Record<FieldKey, string>>;

const CHUNK = 100;
const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function autoMap(headers: string[]): Mapping {
  const mapping: Mapping = {};
  const taken = new Set<string>();
  for (const pass of ['exact', 'contains'] as const) {
    for (const f of FIELDS) {
      if (mapping[f.key]) continue;
      const syns = f.synonyms.map(norm);
      const hit = headers.find((h) =>
        !taken.has(h) && (pass === 'exact' ? syns.includes(norm(h)) : syns.some((s) => s.length >= 4 && norm(h).includes(s))));
      if (hit) { mapping[f.key] = hit; taken.add(hit); }
    }
  }
  return mapping;
}

interface Row extends ProductBulkRow {
  include: boolean;
  verdict?: ProductRowVerdict;
  result?: ProductImportResult;
  /** What the sheet said, kept for the report when nothing matched. */
  categoryText?: string;
  categoryName?: string;
  unmatchedCategory?: string;
}

type RowFilter = 'all' | 'ready' | 'blocked' | 'duplicate' | 'skipped';

const cellCls = 'w-full px-2 py-1.5 text-sm rounded-md border focus:outline-none focus:ring-2';
const cellStyle = { background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' } as const;

/**
 * Bulk create products and services for businesses that already exist.
 *
 * The sheet names the shop; the server matches it on id, exact name, then
 * phone. Anything it cannot place is shown here so it can be picked by hand
 * rather than guessed at.
 */
export default function BulkImportProducts() {
  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState<Mapping>({});
  const [rows, setRows] = useState<Row[]>([]);
  const [parsing, setParsing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  /** Applied to rows whose sheet gives no business. */
  const [fallbackProvider, setFallbackProvider] = useState<{ id: string; name: string } | null>(null);
  const [filter, setFilter] = useState<RowFilter>('all');
  const [search, setSearch] = useState('');
  const [confirmImport, setConfirmImport] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: categoryTree } = useCategoryTree();
  const categories = useMemo(() => categoryTree ?? [], [categoryTree]);

  const sheet = sheets[sheetIndex];

  // ── Upload ───────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    if (!/\.(csv|xlsx|xls|xlsm)$/i.test(file.name)) { toast.error('Upload a .csv, .xlsx or .xls file'); return; }
    setParsing(true);
    try {
      const parsed = await parseSpreadsheet(file);
      if (parsed.length === 0) { toast.error('No data rows found in that file'); return; }
      setFileName(file.name);
      setSheets(parsed);
      setSheetIndex(0);
      setMapping(autoMap(parsed[0].headers));
      setRows([]);
      setStep('map');
    } catch (err) {
      toast.error(`Could not read the file: ${(err as Error).message}`);
    } finally {
      setParsing(false);
    }
  }, []);

  // ── Build ────────────────────────────────────────────────────────────
  const build = () => {
    if (!sheet) return;
    if (!mapping.name) { toast.error('Map the item name column first'); return; }
    const col = (key: FieldKey) => (mapping[key] ? sheet.headers.indexOf(mapping[key]!) : -1);
    const idx = Object.fromEntries(FIELDS.map((f) => [f.key, col(f.key)])) as Record<FieldKey, number>;

    const built: Row[] = sheet.rows.map((cells, i) => {
      const at = (k: FieldKey) => (idx[k] >= 0 ? (cells[idx[k]] ?? '').trim() : '');
      const catText = at('categoryText');
      const matched = catText ? matchCategories(catText, categories) : null;
      return {
        rowId: `r${i}`,
        include: true,
        providerRef: at('providerRef') || undefined,
        providerId: at('providerRef') ? undefined : fallbackProvider?.id,
        name: at('name'),
        description: at('description') || undefined,
        price: at('price') || undefined,
        productType: at('productType') || undefined,
        photoUrl: at('photoUrl') || undefined,
        categoryText: catText || undefined,
        categoryId: matched?.ids[0],
        categoryName: matched?.names[0],
        unmatchedCategory: matched && matched.ids.length === 0 ? catText : undefined,
      };
    }).filter((r) => (r.name ?? '').length > 0 || r.providerRef);

    if (built.length === 0) { toast.error('Every row was empty'); return; }
    setRows(built);
    setStep('review');
    void check(built);
  };

  // ── Dry run ──────────────────────────────────────────────────────────
  const check = async (target: Row[] = rows) => {
    setChecking(true);
    try {
      const verdicts = new Map<string, ProductRowVerdict>();
      for (let i = 0; i < target.length; i += CHUNK) {
        const slice = target.slice(i, i + CHUNK).map(stripRow);
        for (const v of await bulkValidateProducts(slice)) verdicts.set(v.rowId, v);
      }
      setRows((prev) => prev.map((r) => ({ ...r, verdict: verdicts.get(r.rowId) ?? r.verdict })));
    } catch (err) {
      toast.error(`Could not check the sheet: ${(err as Error).message}`);
    } finally {
      setChecking(false);
    }
  };

  // ── Import ───────────────────────────────────────────────────────────
  const runImport = async () => {
    const todo = rows.filter((r) => r.include && !r.result && (r.verdict?.errors.length ?? 1) === 0);
    if (todo.length === 0) { toast.info('Nothing is ready to import'); return; }
    setImporting(true);
    setProgress({ done: 0, total: todo.length });
    try {
      const results = new Map<string, ProductImportResult>();
      for (let i = 0; i < todo.length; i += CHUNK) {
        const slice = todo.slice(i, i + CHUNK).map(stripRow);
        for (const res of await bulkImportProducts(slice)) results.set(res.rowId, res);
        setProgress({ done: Math.min(i + CHUNK, todo.length), total: todo.length });
      }
      setRows((prev) => prev.map((r) => ({ ...r, result: results.get(r.rowId) ?? r.result })));
      const ok = Array.from(results.values()).filter((r) => r.ok).length;
      const bad = results.size - ok;
      toast.success(`Added ${ok} item${ok === 1 ? '' : 's'}${bad ? `, ${bad} failed` : ''}`);
      setStep('done');
    } catch (err) {
      toast.error(`Import failed: ${(err as Error).message}`);
    } finally {
      setImporting(false);
      setProgress(null);
    }
  };

  const setRow = (rowId: string, patch: Partial<Row>) =>
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? { ...r, ...patch, verdict: undefined } : r)));

  const counts = useMemo(() => {
    const c = { ready: 0, blocked: 0, duplicate: 0, skipped: 0, imported: 0, failed: 0 };
    for (const r of rows) {
      if (r.result) { if (r.result.ok) c.imported++; else c.failed++; continue; }
      if (!r.include) { c.skipped++; continue; }
      if ((r.verdict?.errors.length ?? 0) > 0) c.blocked++;
      else { c.ready++; if (r.verdict?.duplicate) c.duplicate++; }
    }
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !`${r.name ?? ''} ${r.providerRef ?? ''} ${r.verdict?.providerName ?? ''}`.toLowerCase().includes(q)) return false;
      switch (filter) {
        case 'ready': return r.include && !r.result && (r.verdict?.errors.length ?? 0) === 0;
        case 'blocked': return (r.verdict?.errors.length ?? 0) > 0;
        case 'duplicate': return !!r.verdict?.duplicate;
        case 'skipped': return !r.include;
        default: return true;
      }
    });
  }, [rows, filter, search]);

  /** Hide every row matching `pred` so a big sheet can be narrowed in one go. */
  const skipWhere = (pred: (r: Row) => boolean, what: string) => {
    const ids = new Set(rows.filter((r) => r.include && !r.result && pred(r)).map((r) => r.rowId));
    if (ids.size === 0) { toast.info(`No ${what} to skip`); return; }
    setRows((prev) => prev.map((r) => (ids.has(r.rowId) ? { ...r, include: false } : r)));
    toast.info(`Skipped ${ids.size} ${what}`);
  };

  const restoreSkipped = () => {
    const n = rows.filter((r) => !r.result && !r.include).length;
    if (n === 0) return;
    setRows((prev) => prev.map((r) => (r.result || r.include ? r : { ...r, include: true })));
    toast.info(`Restored ${n} row${n === 1 ? '' : 's'}`);
  };

  /** The same sheet back, with what happened to every row. */
  const downloadReport = () => {
    const header = ['Item', 'Business (sheet)', 'Business (matched)', 'Price', 'Type', 'Category', 'Status', 'Detail'];
    const body = rows.map((r) => [
      r.name ?? '',
      r.providerRef ?? '',
      r.verdict?.providerName ?? '',
      String(r.price ?? ''),
      (r.productType ?? '').toLowerCase() === 'service' ? 'service' : 'product',
      r.categoryName ?? r.categoryText ?? '',
      r.result ? (r.result.ok ? 'Added' : 'Failed') : !r.include ? 'Skipped' : (r.verdict?.errors.length ?? 0) > 0 ? 'Blocked' : 'Ready',
      r.result?.error ?? [...(r.verdict?.errors ?? []), ...(r.verdict?.warnings ?? [])].join('; '),
    ]);
    downloadTextFile(`tijarah-product-import-report-${new Date().toISOString().slice(0, 10)}.csv`, toCsv([header, ...body]));
  };

  const reset = () => {
    setStep('upload'); setFileName(''); setSheets([]); setMapping({}); setRows([]); setFallbackProvider(null);
  };

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div>
      {/* Steps */}
      <div className="flex items-center gap-2 mb-5 text-xs">
        {(['upload', 'map', 'review', 'done'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <span
              className="px-2.5 py-1 rounded-full font-medium capitalize"
              style={{
                background: step === s ? 'var(--color-primary)' : 'var(--surface-2)',
                color: step === s ? '#fff' : 'var(--text-muted)',
              }}
            >
              {i + 1}. {s === 'map' ? 'Match columns' : s === 'done' ? 'Report' : s}
            </span>
            {i < 3 && <ArrowRight className="h-3 w-3" style={{ color: 'var(--text-muted)' }} />}
          </div>
        ))}
      </div>

      {step === 'upload' && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) void handleFile(f); }}
          className="rounded-xl border-2 border-dashed p-10 text-center"
          style={{ borderColor: 'var(--border-default)', background: 'var(--surface-0)' }}
        >
          <FileSpreadsheet className="h-9 w-9 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            Drop a sheet of products or services here
          </p>
          <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-secondary)' }}>
            One row per item. Name it, and say which business it belongs to — by shop name, phone number or id.
          </p>
          <button
            onClick={() => fileInput.current?.click()}
            disabled={parsing}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: 'var(--color-primary)' }}
          >
            {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Choose a file
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".csv,.xlsx,.xls,.xlsm"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ''; }}
          />
        </div>
      )}

      {step === 'map' && sheet && (
        <div className="rounded-xl border p-5" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{fileName}</p>
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {sheet.rows.length} rows · {sheet.headers.length} columns
              </p>
            </div>
            {sheets.length > 1 && (
              <select
                value={sheetIndex}
                onChange={(e) => { const i = Number(e.target.value); setSheetIndex(i); setMapping(autoMap(sheets[i].headers)); }}
                className={cellCls} style={{ ...cellStyle, width: 'auto' }}
              >
                {sheets.map((s, i) => <option key={s.name} value={i}>{s.name}</option>)}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <label className="text-[10px] font-semibold uppercase block mb-1" style={{ color: 'var(--text-muted)' }}>
                  {f.label}{'required' in f && f.required ? ' *' : ''}
                </label>
                <select
                  value={mapping[f.key] ?? ''}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value || undefined }))}
                  className={cellCls} style={cellStyle}
                >
                  <option value="">— not in this sheet —</option>
                  {sheet.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
                {'hint' in f && f.hint && (
                  <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{f.hint}</p>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t" style={{ borderColor: 'var(--border-default)' }}>
            <label className="text-[10px] font-semibold uppercase block mb-1.5" style={{ color: 'var(--text-muted)' }}>
              {mapping.providerRef ? 'Business for rows the sheet leaves blank' : 'Business for every row'}
            </label>
            <ProviderPicker value={fallbackProvider} onChange={setFallbackProvider} />
          </div>

          <div className="flex items-center gap-2 mt-5">
            <button onClick={() => setStep('upload')} className="px-3 py-2 text-xs rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
              <ArrowLeft className="h-3.5 w-3.5 inline" /> Back
            </button>
            <button
              onClick={build}
              disabled={!mapping.name || (!mapping.providerRef && !fallbackProvider)}
              className="px-4 py-2 text-xs font-semibold rounded-lg text-white disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              Check {sheet.rows.length} rows
            </button>
            {!mapping.providerRef && !fallbackProvider && (
              <span className="text-[11px]" style={{ color: 'var(--color-warning-dark)' }}>
                Map a Business column, or pick one business for the whole sheet.
              </span>
            )}
          </div>
        </div>
      )}

      {(step === 'review' || step === 'done') && (
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <Pill label={`${counts.ready} ready`} tone="success" />
            {counts.blocked > 0 && <Pill label={`${counts.blocked} need attention`} tone="danger" />}
            {counts.duplicate > 0 && <Pill label={`${counts.duplicate} already listed`} tone="warning" />}
            {counts.skipped > 0 && <Pill label={`${counts.skipped} skipped`} tone="muted" />}
            {counts.imported > 0 && <Pill label={`${counts.imported} added`} tone="success" />}
            {counts.failed > 0 && <Pill label={`${counts.failed} failed`} tone="danger" />}

            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={downloadReport}
                className="px-3 py-2 text-xs rounded-lg"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                title="Download this sheet with the outcome of every row"
              >
                <Download className="h-3.5 w-3.5 inline" /> Report
              </button>
              <button
                onClick={() => skipWhere((r) => (r.verdict?.errors.length ?? 0) > 0, 'blocked rows')}
                className="px-3 py-2 text-xs rounded-lg"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
              >
                <EyeOff className="h-3.5 w-3.5 inline" /> Skip blocked
              </button>
              <button
                onClick={() => skipWhere((r) => !!r.verdict?.duplicate, 'duplicates')}
                className="px-3 py-2 text-xs rounded-lg"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
              >
                <EyeOff className="h-3.5 w-3.5 inline" /> Skip duplicates
              </button>
              {counts.skipped > 0 && (
                <button
                  onClick={restoreSkipped}
                  className="px-3 py-2 text-xs rounded-lg"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                >
                  <RotateCcw className="h-3.5 w-3.5 inline" /> Restore
                </button>
              )}
              <button
                onClick={() => void check()}
                disabled={checking || importing}
                className="px-3 py-2 text-xs rounded-lg disabled:opacity-50"
                style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
              >
                {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin inline" /> : <RefreshCw className="h-3.5 w-3.5 inline" />} Re-check
              </button>
              {step === 'review' ? (
                <button
                  onClick={() => setConfirmImport(true)}
                  disabled={importing || checking || counts.ready === 0}
                  className="px-4 py-2 text-xs font-semibold rounded-lg text-white disabled:opacity-50"
                  style={{ background: 'var(--color-primary)' }}
                >
                  {importing ? <Loader2 className="h-3.5 w-3.5 animate-spin inline mr-1" /> : null}
                  {progress ? `Adding ${progress.done}/${progress.total}…` : `Add ${counts.ready} items`}
                </button>
              ) : (
                <button onClick={reset} className="px-4 py-2 text-xs font-semibold rounded-lg text-white" style={{ background: 'var(--color-primary)' }}>
                  Import another sheet
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-3">
            {(['all', 'ready', 'blocked', 'duplicate', 'skipped'] as RowFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-2.5 py-1 text-[11px] font-medium rounded-full capitalize"
                style={{
                  background: filter === f ? 'var(--color-primary)' : 'var(--surface-2)',
                  color: filter === f ? '#fff' : 'var(--text-muted)',
                }}
              >
                {f}
              </button>
            ))}
            <div className="flex items-center gap-1.5 px-2 rounded-lg border ml-auto" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-0)' }}>
              <Search className="h-3.5 w-3.5" style={{ color: 'var(--text-muted)' }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find an item or business…"
                className="py-1.5 text-xs bg-transparent focus:outline-none"
                style={{ color: 'var(--text-primary)', width: 190 }}
              />
            </div>
            <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
              {visible.length} of {rows.length} shown
            </span>
          </div>

          <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surface-1)' }}>
                  {['', 'Item', 'Business', 'Price', 'Type', 'Category', 'Status'].map((h) => (
                    <th key={h} className="text-left px-3 py-2 text-[10px] font-semibold uppercase" style={{ color: 'var(--text-muted)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => (
                  <tr key={r.rowId} className="border-t" style={{ borderColor: 'var(--border-default)', opacity: r.include ? 1 : 0.45 }}>
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={r.include}
                        disabled={!!r.result}
                        onChange={() => setRows((prev) => prev.map((x) => (x.rowId === r.rowId ? { ...x, include: !x.include } : x)))}
                      />
                    </td>
                    <td className="px-3 py-2" style={{ minWidth: 200 }}>
                      <input
                        value={r.name ?? ''}
                        disabled={!!r.result}
                        onChange={(e) => setRow(r.rowId, { name: e.target.value })}
                        className={cellCls} style={cellStyle}
                      />
                    </td>
                    <td className="px-3 py-2" style={{ minWidth: 220 }}>
                      <BusinessCell row={r} onPick={(p) => setRow(r.rowId, { providerId: p.id, providerRef: p.name })} />
                    </td>
                    <td className="px-3 py-2" style={{ width: 110 }}>
                      <input
                        value={String(r.price ?? '')}
                        disabled={!!r.result}
                        onChange={(e) => setRow(r.rowId, { price: e.target.value })}
                        className={cellCls} style={cellStyle}
                      />
                    </td>
                    <td className="px-3 py-2" style={{ width: 120 }}>
                      <select
                        value={(r.productType ?? '').toLowerCase() === 'service' ? 'service' : 'product'}
                        disabled={!!r.result}
                        onChange={(e) => setRow(r.rowId, { productType: e.target.value })}
                        className={cellCls} style={cellStyle}
                      >
                        <option value="product">Product</option>
                        <option value="service">Service</option>
                      </select>
                    </td>
                    <td className="px-3 py-2" style={{ minWidth: 150 }}>
                      {r.categoryName ? (
                        <span className="text-[11px] flex items-center gap-1" style={{ color: 'var(--text-primary)' }}>
                          <Tag className="h-3 w-3 shrink-0" style={{ color: 'var(--color-primary)' }} />{r.categoryName}
                        </span>
                      ) : r.unmatchedCategory ? (
                        <span className="text-[11px]" style={{ color: 'var(--color-warning-dark)' }} title={`"${r.unmatchedCategory}" is not in your category list`}>
                          {r.unmatchedCategory} — no match
                        </span>
                      ) : (
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td className="px-3 py-2" style={{ minWidth: 220 }}>
                      <RowStatus row={r} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmImport}
        onClose={() => setConfirmImport(false)}
        onConfirm={() => { setConfirmImport(false); void runImport(); }}
        title={`Add ${counts.ready} item${counts.ready === 1 ? '' : 's'}?`}
        description={
          `They will go live on their businesses straight away.` +
          (counts.duplicate > 0 ? ` ${counts.duplicate} of them already exist under the same name.` : '') +
          (counts.blocked > 0 ? ` ${counts.blocked} blocked row${counts.blocked === 1 ? '' : 's'} will be left out.` : '')
        }
        confirmLabel="Add them"
        variant={counts.duplicate > 0 ? 'warning' : 'default'}
      />
    </div>
  );
}

/** Only the fields the server takes — the UI's own bookkeeping stays here. */
function stripRow(r: Row): ProductBulkRow {
  /* eslint-disable @typescript-eslint/no-unused-vars */
  const { include, verdict, result, categoryText, categoryName, unmatchedCategory, ...rest } = r;
  /* eslint-enable @typescript-eslint/no-unused-vars */
  return rest;
}

function Pill({ label, tone }: { label: string; tone: 'success' | 'danger' | 'warning' | 'muted' }) {
  const tones = {
    success: { background: 'var(--color-success-light)', color: 'var(--color-success-dark)' },
    danger: { background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' },
    warning: { background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' },
    muted: { background: 'var(--surface-2)', color: 'var(--text-muted)' },
  } as const;
  return <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full" style={tones[tone]}>{label}</span>;
}

function RowStatus({ row }: { row: Row }) {
  if (row.result) {
    return row.result.ok
      ? <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-success-dark)' }}><Check className="h-3.5 w-3.5" /> Added</span>
      : <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-danger-dark)' }}><XCircle className="h-3.5 w-3.5" /> {row.result.error}</span>;
  }
  const v = row.verdict;
  if (!v) return <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Not checked yet</span>;
  if (v.errors.length) {
    return <span className="text-xs flex items-start gap-1" style={{ color: 'var(--color-danger-dark)' }}><XCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{v.errors.join('; ')}</span>;
  }
  if (v.warnings.length) {
    return <span className="text-xs flex items-start gap-1" style={{ color: 'var(--color-warning-dark)' }}><AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />{v.warnings.join('; ')}</span>;
  }
  return <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-success-dark)' }}><Check className="h-3.5 w-3.5" /> Ready</span>;
}

/** The business a row landed on, and a way to fix it when it landed nowhere. */
function BusinessCell({ row, onPick }: { row: Row; onPick: (p: { id: string; name: string }) => void }) {
  const v = row.verdict;
  const [picking, setPicking] = useState(false);

  if (v?.providerMatch === 'matched' && !picking) {
    return (
      <button onClick={() => setPicking(true)} disabled={!!row.result} className="text-xs text-left flex items-center gap-1 hover:underline" style={{ color: 'var(--text-primary)' }}>
        <Store className="h-3 w-3 shrink-0" style={{ color: 'var(--color-success)' }} />
        {v.providerName}
      </button>
    );
  }

  if (v?.providerMatch === 'ambiguous' && v.candidates && !picking) {
    return (
      <div className="space-y-1">
        <p className="text-[11px]" style={{ color: 'var(--color-warning-dark)' }}>
          "{row.providerRef}" matches {v.candidates.length}:
        </p>
        <div className="flex flex-wrap gap-1">
          {v.candidates.map((c) => (
            <button
              key={c.id}
              onClick={() => onPick({ id: c.id, name: c.brandName })}
              className="text-[11px] px-1.5 py-0.5 rounded border"
              style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
            >
              {c.brandName}{c.city ? ` · ${c.city}` : ''}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return <ProviderPicker value={null} placeholder={row.providerRef || 'Find the business'} onChange={(p) => { if (p) { onPick({ id: p.id, name: p.name }); setPicking(false); } }} />;
}

/** Type-ahead over the real provider list — never a free-text guess. */
function ProviderPicker({
  value, onChange, placeholder = 'Search businesses…',
}: {
  value: { id: string; name: string } | null;
  onChange: (p: { id: string; name: string } | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const { data, isFetching } = useQuery({
    queryKey: ['admin-providers-search', query],
    queryFn: () => providersService.list({ search: query, limit: 8, page: 1 }),
    enabled: open && query.trim().length >= 2,
    staleTime: 60_000,
  });

  if (value) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs flex items-center gap-1 px-2 py-1 rounded-md" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
          <Store className="h-3 w-3" /> {value.name}
        </span>
        <button onClick={() => onChange(null)} className="text-[11px]" style={{ color: 'var(--color-danger)' }}>Change</button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-1.5 px-2 rounded-md border" style={{ borderColor: 'var(--border-default)', background: 'var(--surface-0)' }}>
        <Search className="h-3.5 w-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
        <input
          value={query}
          placeholder={placeholder}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          className="w-full py-1.5 text-sm bg-transparent focus:outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        {isFetching && <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" style={{ color: 'var(--text-muted)' }} />}
      </div>
      {open && query.trim().length >= 2 && (
        <div className="absolute z-20 mt-1 w-full rounded-lg border shadow-lg max-h-56 overflow-auto" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
          {(data?.items ?? []).length === 0 && !isFetching && (
            <p className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>No business by that name</p>
          )}
          {(data?.items ?? []).map((p) => (
            <button
              key={p.id}
              onClick={() => { onChange({ id: p.id, name: p.brandName }); setOpen(false); setQuery(''); }}
              className="w-full text-left px-3 py-2 text-xs hover:opacity-80"
              style={{ color: 'var(--text-primary)' }}
            >
              <span className="font-medium">{p.brandName}</span>
              <span style={{ color: 'var(--text-muted)' }}>{p.city ? ` · ${p.city}` : ''}{p.contactNumber ? ` · ${p.contactNumber}` : ''}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

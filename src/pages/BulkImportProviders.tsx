import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, FileSpreadsheet, ArrowRight, ArrowLeft, CheckCircle2, AlertTriangle, XCircle, Search, Eye, X,
  Download, DatabaseZap, Loader2, RotateCcw, Ban, Check, Plus, Info, Users, Store, Sparkles,
  Wand2, EyeOff, SlidersHorizontal, ChevronDown, CircleSlash, Undo2, ShieldAlert, BadgeCheck, UserRound,
  ImagePlus, FolderOpen, FileArchive, Trash2, Image as ImageIcon,
} from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useFlatCategories } from '../hooks/useCategories';
import { useServiceableCities } from '../hooks/useServiceableCities';
import { useBulkValidateProviders, useBulkImportProviders } from '../hooks/useAdminCreate';
import { ROUTES } from '../utils/constants';
import { toast } from 'react-toastify';
import type { Category, Gender } from '../types';
import type { BulkImportRowResult } from '../services/bulk-import.service';
import { providersService } from '../services/providers.service';
import { ImagesCell, ImageList } from '../components/bulk-import/ImagesCell';
import {
  allImages, countImages, expandImageSources, filesFromDrop, imagesToSend, matchImageFiles, revokeImages,
  summarizeImages, uploadRowImages, withStatus, withRateLimitRetry, MAX_GALLERY_PHOTOS,
  type ImageMatchSummary, type ImageUploadApi, type RowImage, type RowImages,
} from '../utils/bulk-import-images';
import {
  parseSpreadsheet, autoMapColumns, buildRows, validateRows, toPayload, toCsv, downloadTextFile, templateCsv,
  TARGET_FIELDS, getDbStatus, isDbDuplicate, type ParsedSheet, type ColumnMapping, type ImportRow, type RowFieldKey,
  type RowValidation, type BuildDefaults, type TargetField, type DbStatus,
} from '../utils/bulk-import';

type Step = 'upload' | 'map' | 'review' | 'done';
type RowFilter = 'all' | 'ready' | 'warning' | 'error' | 'excluded' | 'db';
type ImportMode = 'ready' | 'readyAndWarnings';

/** Column order and widths. The leading `sticky` columns stay frozen while scrolling sideways. */
const COLUMNS: { key: string; label: string; width: number; required?: boolean; sticky?: boolean }[] = [
  { key: 'select', label: '', width: 44, sticky: true },
  { key: 'row', label: '#', width: 56, sticky: true },
  { key: 'status', label: 'Status', width: 132, sticky: true },
  { key: 'brandName', label: 'Brand', width: 220, required: true, sticky: true },
  { key: 'userName', label: 'Owner', width: 180, required: true },
  { key: 'mobile', label: 'Mobile', width: 140, required: true },
  { key: 'whatsapp', label: 'Alt WhatsApp', width: 140 },
  { key: 'email', label: 'Email', width: 210 },
  { key: 'city', label: 'City', width: 150, required: true },
  { key: 'area', label: 'Area', width: 150 },
  { key: 'pincode', label: 'Pincode', width: 104 },
  { key: 'images', label: 'Images', width: 190 },
  { key: 'categories', label: 'Categories', width: 290 },
  { key: 'instagram', label: 'Instagram', width: 170 },
  { key: 'gender', label: 'Gender', width: 110 },
  { key: 'isWomenLed', label: 'Women-led', width: 100 },
  { key: 'providerStatus', label: 'Listing status', width: 140 },
  { key: 'description', label: 'Description', width: 280 },
  { key: 'db', label: 'Database', width: 170 },
  { key: 'issues', label: 'Issues', width: 320 },
];
const LAST_STICKY = 'brandName';
const STICKY_LEFT: Record<string, number> = (() => {
  const out: Record<string, number> = {};
  let x = 0;
  for (const c of COLUMNS) {
    if (!c.sticky) break;
    out[c.key] = x;
    x += c.width;
  }
  return out;
})();
const TABLE_MIN_WIDTH = COLUMNS.reduce((sum, c) => sum + c.width, 0);

const DB_META: Record<DbStatus, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  unchecked: { label: 'Not checked', color: 'var(--text-muted)', bg: 'var(--surface-2)', icon: DatabaseZap },
  new: { label: 'New business', color: 'var(--color-success-dark)', bg: 'var(--color-success-light)', icon: BadgeCheck },
  reuses_user: { label: 'Reuses login', color: 'var(--color-info-dark)', bg: 'var(--color-info-light)', icon: UserRound },
  existing_provider: { label: 'Already listed', color: 'var(--color-danger-dark)', bg: 'var(--color-danger-light)', icon: ShieldAlert },
  contact_in_use: { label: 'Number in use', color: 'var(--color-warning-dark)', bg: 'var(--color-warning-light)', icon: AlertTriangle },
  brand_exists: { label: 'Brand exists', color: 'var(--color-warning-dark)', bg: 'var(--color-warning-light)', icon: AlertTriangle },
};

const STEPS: { key: Step; label: string; icon: React.ElementType }[] = [
  { key: 'upload', label: 'Upload sheet', icon: Upload },
  { key: 'map', label: 'Map columns', icon: FileSpreadsheet },
  { key: 'review', label: 'Vet & fix', icon: Eye },
  { key: 'done', label: 'Import', icon: CheckCircle2 },
];

const CHUNK = 25;

/** Rows whose images upload in parallel once their providers exist. */
const IMAGE_CONCURRENCY = 3;

// Every image call rides out a rate limit instead of failing the image.
const imageApi: ImageUploadApi = {
  updateImages: (id, payload) => withRateLimitRetry(() => providersService.updateImages(id, payload)),
  uploadPhotos: (id, files) => withRateLimitRetry(() => providersService.uploadPhotos(id, files)),
  importImageUrls: (id, body) => withRateLimitRetry(() => providersService.importImageUrls(id, body)),
};

/** Message from an axios error body, or the fallback. */
const apiError = (err: unknown, fallback: string) => {
  const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  return Array.isArray(msg) ? msg.join('; ') : typeof msg === 'string' ? msg : fallback;
};

const inputCls = 'w-full px-2 py-1.5 text-sm rounded-md border focus:outline-none focus:ring-2';
const inputStyle = { background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' } as const;

const STATUS_META: Record<RowValidation['status'], { label: string; color: string; bg: string; icon: React.ElementType }> = {
  ready: { label: 'Ready', color: 'var(--color-success-dark)', bg: 'var(--color-success-light)', icon: CheckCircle2 },
  warning: { label: 'Needs a look', color: 'var(--color-warning-dark)', bg: 'var(--color-warning-light)', icon: AlertTriangle },
  error: { label: 'Error', color: 'var(--color-danger-dark)', bg: 'var(--color-danger-light)', icon: XCircle },
  excluded: { label: 'Skipped', color: 'var(--text-muted)', bg: 'var(--surface-2)', icon: Ban },
  imported: { label: 'Imported', color: 'var(--color-success-dark)', bg: 'var(--color-success-light)', icon: Check },
  failed: { label: 'Failed', color: 'var(--color-danger-dark)', bg: 'var(--color-danger-light)', icon: XCircle },
};

export default function BulkImportProviders() {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>('upload');
  const [fileName, setFileName] = useState('');
  const [sheets, setSheets] = useState<ParsedSheet[]>([]);
  const [sheetIndex, setSheetIndex] = useState(0);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  // New listings default to Unverified — they go live only after someone verifies them.
  const [defaults, setDefaults] = useState<BuildDefaults>({ gender: 'female', providerStatus: 'unverified', womenLed: 'auto', city: '' });
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [filter, setFilter] = useState<RowFilter>('all');
  // Default to importing only rows with no problems at all.
  const [importMode, setImportMode] = useState<ImportMode>('ready');
  const [search, setSearch] = useState('');
  const [detailRowId, setDetailRowId] = useState<string | null>(null);
  const [confirmImport, setConfirmImport] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [imageProgress, setImageProgress] = useState<{ done: number; total: number } | null>(null);
  const [imageMatch, setImageMatch] = useState<ImageMatchSummary | null>(null);
  const [matchingImages, setMatchingImages] = useState(false);
  const [tableDragOver, setTableDragOver] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const imageFilesInputRef = useRef<HTMLInputElement>(null);

  const { data: categories } = useFlatCategories();
  const { data: citiesData } = useServiceableCities();
  const validateMutation = useBulkValidateProviders();
  const importMutation = useBulkImportProviders();

  const cities = useMemo(() => citiesData ?? [], [citiesData]);
  const sheet = sheets[sheetIndex];

  const validation = useMemo(() => validateRows(rows, cities), [rows, cities]);

  const counts = useMemo(() => {
    const c = { total: rows.length, ready: 0, warning: 0, error: 0, excluded: 0, imported: 0, failed: 0, db: 0 };
    for (const r of rows) {
      c[validation.get(r.rowId)?.status ?? 'ready']++;
      if (isDbDuplicate(r)) c.db++;
    }
    return c;
  }, [rows, validation]);

  const importable = useMemo(
    () => rows.filter((r) => {
      const s = validation.get(r.rowId)?.status;
      return s === 'ready' || (importMode === 'readyAndWarnings' && s === 'warning');
    }),
    [rows, validation, importMode],
  );

  /** How many still-included, not-yet-imported rows each skip action would remove. */
  const skipCounts = useMemo(() => {
    const c = { errorsOrDb: 0, errors: 0, db: 0, warnings: 0, skipped: 0 };
    for (const r of rows) {
      if (r.importResult) continue;
      if (!r.include) { c.skipped++; continue; }
      const s = validation.get(r.rowId)?.status;
      const dup = isDbDuplicate(r);
      if (s === 'error') c.errors++;
      if (s === 'warning') c.warnings++;
      if (dup) c.db++;
      if (s === 'error' || dup) c.errorsOrDb++;
    }
    return c;
  }, [rows, validation]);

  const visibleRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      const s = validation.get(r.rowId)?.status ?? 'ready';
      if (filter === 'db') {
        if (!isDbDuplicate(r)) return false;
      } else if (filter !== 'all' && s !== filter && !(filter === 'error' && s === 'failed') && !(filter === 'ready' && s === 'imported')) {
        return false;
      }
      if (!q) return true;
      return [r.fields.brandName, r.fields.userName, r.fields.mobile, r.fields.city, r.fields.instagram, r.categoryText].some((v) => v.toLowerCase().includes(q));
    });
  }, [rows, validation, filter, search]);

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
      setMapping(autoMapColumns(parsed[0].headers));
      setRows([]);
      setStep('map');
    } catch (err) {
      toast.error(`Could not read the file: ${(err as Error).message}`);
    } finally {
      setParsing(false);
    }
  }, []);

  const pickSheet = (i: number) => {
    setSheetIndex(i);
    setMapping(autoMapColumns(sheets[i].headers));
  };

  // ── Build & edit ─────────────────────────────────────────────────────
  const build = () => {
    if (!sheet) return;
    const missing = TARGET_FIELDS.filter((f) => f.required && !mapping[f.key] && !(f.key === 'city' && defaults.city.trim()));
    if (missing.length) { toast.error(`Map these columns first: ${missing.map((m) => m.label).join(', ')}`); return; }
    const built = buildRows(sheet, mapping, { cities, categories, defaults });
    revokeImages(rows.flatMap((r) => allImages(r.images)));
    setRows(built);
    setFilter('all');
    setSearch('');
    setStep('review');
  };

  const updateRow = (rowId: string, patch: (r: ImportRow) => ImportRow) =>
    setRows((prev) => prev.map((r) => (r.rowId === rowId ? patch(r) : r)));

  const setField = <K extends RowFieldKey>(rowId: string, key: K, value: ImportRow['fields'][K]) =>
    updateRow(rowId, (r) => ({ ...r, fields: { ...r.fields, [key]: value } as ImportRow['fields'], serverCheck: undefined }));

  const setCategories = (rowId: string, ids: string[]) =>
    updateRow(rowId, (r) => ({ ...r, categoryIds: ids, unmatchedCategories: ids.length ? [] : r.unmatchedCategories, serverCheck: undefined }));

  const toggleInclude = (rowId: string) => updateRow(rowId, (r) => ({ ...r, include: !r.include }));

  /** Skip every included, not-yet-imported row matching `pred`, and say how many. */
  const skipWhere = (pred: (r: ImportRow, status: RowValidation['status'] | undefined) => boolean, what: string) => {
    const ids = new Set(rows.filter((r) => !r.importResult && r.include && pred(r, validation.get(r.rowId)?.status)).map((r) => r.rowId));
    if (ids.size === 0) return;
    setRows((prev) => prev.map((r) => (ids.has(r.rowId) ? { ...r, include: false } : r)));
    toast.info(`Skipped ${ids.size} ${what}`);
  };

  const restoreSkipped = () => {
    const n = rows.filter((r) => !r.importResult && !r.include).length;
    if (n === 0) return;
    setRows((prev) => prev.map((r) => (r.importResult || r.include ? r : { ...r, include: true })));
    toast.info(`Restored ${n} skipped row${n === 1 ? '' : 's'}`);
  };

  // ── Images ───────────────────────────────────────────────────────────
  const setRowImages = (rowId: string, images: RowImages, discarded: RowImage[]) => {
    revokeImages(discarded);
    updateRow(rowId, (r) => ({ ...r, images }));
  };

  /** Match a folder, ZIP or loose files to rows by the mobile number in each file name. */
  const attachImageFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setMatchingImages(true);
    try {
      const sources = await expandImageSources(files);
      if (sources.length === 0) { toast.info('No images found in that selection'); return; }
      const { rows: next, summary, discarded } = matchImageFiles(sources, rows);
      revokeImages(discarded);
      setRows(next);
      setImageMatch(summary);
    } catch (err) {
      toast.error(`Couldn't read those files: ${(err as Error).message}`);
    } finally {
      setMatchingImages(false);
    }
  };

  const clearAllImages = () => {
    const removable = rows.filter((r) => !r.importResult?.ok).flatMap((r) => allImages(r.images));
    revokeImages(removable);
    setRows((prev) => prev.map((r) => (r.importResult?.ok ? r : { ...r, images: { gallery: [] } })));
    toast.info(`Removed ${removable.length} image${removable.length === 1 ? '' : 's'}`);
  };

  /** Upload images for created providers, a few rows at a time. Returns how many failed. */
  const uploadImagesFor = async (jobs: { rowId: string; providerId: string; images: RowImages }[], onlyFailed: boolean) => {
    const work = jobs.filter((j) => imagesToSend(j.images, onlyFailed).length > 0);
    const total = work.reduce((n, j) => n + imagesToSend(j.images, onlyFailed).length, 0);
    if (total === 0) return 0;
    let done = 0;
    let failed = 0;
    let cursor = 0;
    setImageProgress({ done: 0, total });
    const worker = async () => {
      while (cursor < work.length) {
        const job = work[cursor++];
        const sending = imagesToSend(job.images, onlyFailed);
        const sentIds = new Set(sending.map((i) => i.id));
        setRows((prev) => prev.map((r) => (r.rowId === job.rowId ? { ...r, images: withStatus(r.images, [...sentIds], 'uploading') } : r)));
        const updated = await uploadRowImages(job.providerId, job.images, imageApi, onlyFailed);
        failed += allImages(updated).filter((i) => sentIds.has(i.id) && i.status === 'failed').length;
        done += sending.length;
        setImageProgress({ done, total });
        setRows((prev) => prev.map((r) => (r.rowId === job.rowId ? { ...r, images: updated } : r)));
      }
    };
    await Promise.all(Array.from({ length: Math.min(IMAGE_CONCURRENCY, work.length) }, () => worker()));
    setImageProgress(null);
    return failed;
  };

  const retryFailedImages = async () => {
    const jobs = rows
      .filter((r) => r.importResult?.ok && r.importResult.providerId && allImages(r.images).some((i) => i.status === 'failed'))
      .map((r) => ({ rowId: r.rowId, providerId: r.importResult?.providerId as string, images: r.images }));
    const failed = await uploadImagesFor(jobs, true);
    if (failed) toast.warn(`${failed} image${failed === 1 ? '' : 's'} still failed — see the Issues column`);
    else toast.success('All images uploaded');
  };

  const applyToAll = (key: RowFieldKey, value: ImportRow['fields'][RowFieldKey]) =>
    setRows((prev) => prev.map((r) => (r.importResult ? r : { ...r, fields: { ...r.fields, [key]: value } as ImportRow['fields'] })));

  // ── Server dry-run ───────────────────────────────────────────────────
  const runServerCheck = async () => {
    const candidates = rows.filter((r) => r.include && !r.importResult && /^[6-9]\d{9}$/.test(r.fields.mobile) && r.fields.brandName.trim() && r.fields.city.trim());
    if (candidates.length === 0) { toast.info('Nothing to check — fix required fields first'); return; }
    try {
      const results: Record<string, ImportRow['serverCheck']> = {};
      for (let i = 0; i < candidates.length; i += 100) {
        const chunk = candidates.slice(i, i + 100);
        const res = await withRateLimitRetry(() => validateMutation.mutateAsync(chunk.map(toPayload)));
        for (const r of res.results) results[r.rowId] = r;
      }
      setRows((prev) => prev.map((r) => (results[r.rowId] ? { ...r, serverCheck: results[r.rowId] } : r)));
      const blocked = Object.values(results).filter((r) => r && !r.ok).length;
      toast.success(blocked ? `Checked ${candidates.length} rows — ${blocked} blocked by existing records` : `Checked ${candidates.length} rows — no conflicts with the database`);
    } catch (err) {
      toast.error(apiError(err, 'Database check failed'));
    }
  };

  // ── Import ───────────────────────────────────────────────────────────
  const runImport = async () => {
    setConfirmImport(false);
    const targets = importable.filter((r) => !r.importResult);
    setProgress({ done: 0, total: targets.length });
    const outcomes: Record<string, BulkImportRowResult> = {};
    try {
      for (let i = 0; i < targets.length; i += CHUNK) {
        const chunk = targets.slice(i, i + CHUNK);
        const res = await withRateLimitRetry(() => importMutation.mutateAsync({ rows: chunk.map(toPayload), sourceLabel: fileName }));
        for (const r of res.results) outcomes[r.rowId] = r;
        setProgress({ done: Math.min(i + CHUNK, targets.length), total: targets.length });
        setRows((prev) => prev.map((r) => (outcomes[r.rowId] ? { ...r, importResult: outcomes[r.rowId] } : r)));
      }
    } catch (err) {
      toast.error(apiError(err, 'Import stopped — rows already created are kept'));
    } finally {
      setProgress(null);
    }

    // Images go up only for businesses that now exist; a failed image never undoes a row.
    const imageJobs = targets
      .filter((r) => outcomes[r.rowId]?.ok && outcomes[r.rowId].providerId && countImages(r.images) > 0)
      .map((r) => ({ rowId: r.rowId, providerId: outcomes[r.rowId].providerId as string, images: r.images }));
    if (imageJobs.length) {
      const failed = await uploadImagesFor(imageJobs, false);
      if (failed) toast.warn(`${failed} image${failed === 1 ? '' : 's'} failed to upload — retry from the summary above the table`);
    }
    setStep('done');
  };

  const downloadReport = () => {
    const header = ['Row', 'Status', 'Brand', 'Owner', 'Mobile', 'City', 'Categories', 'Images', 'Outcome', 'Provider ID'];
    const body = rows.map((r) => {
      const v = validation.get(r.rowId);
      return [
        r.sourceIndex, STATUS_META[v?.status ?? 'ready'].label, r.fields.brandName, r.fields.userName, r.fields.mobile, r.fields.city,
        r.categoryIds.map((id) => categories.find((c) => c.id === id)?.name ?? id).join('; '),
        summarizeImages(r.images),
        r.importResult ? (r.importResult.ok ? 'Created' : r.importResult.error ?? 'Failed') : [...(v?.errors ?? []), ...(v?.warnings ?? [])].map((i) => i.message).join('; '),
        r.importResult?.providerId ?? '',
      ];
    });
    downloadTextFile(`import-report-${fileName.replace(/\.[^.]+$/, '') || 'providers'}.csv`, toCsv([header, ...body]));
  };

  const retryFailed = () => {
    setRows((prev) => prev.map((r) => (r.importResult && !r.importResult.ok ? { ...r, importResult: undefined, serverCheck: undefined, include: true } : r)));
    setFilter('all');
    setStep('review');
  };

  const reset = () => {
    revokeImages(rows.flatMap((r) => allImages(r.images)));
    setStep('upload'); setFileName(''); setSheets([]); setMapping({}); setRows([]); setFilter('all'); setSearch(''); setDetailRowId(null); setImageMatch(null);
  };

  const detailRow = detailRowId ? rows.find((r) => r.rowId === detailRowId) ?? null : null;
  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const dbCheckedCount = rows.filter((r) => r.serverCheck).length;
  const selectableVisible = visibleRows.filter((r) => !r.importResult);
  const allVisibleIncluded = selectableVisible.length > 0 && selectableVisible.every((r) => r.include);
  const someVisibleIncluded = selectableVisible.some((r) => r.include);
  const toggleVisibleInclude = () => {
    const ids = new Set(selectableVisible.map((r) => r.rowId));
    const next = !allVisibleIncluded;
    setRows((prev) => prev.map((r) => (ids.has(r.rowId) ? { ...r, include: next } : r)));
  };

  const segments = [
    { key: 'ready', value: counts.ready + counts.imported, color: 'var(--color-success)' },
    { key: 'warning', value: counts.warning, color: 'var(--color-warning)' },
    { key: 'error', value: counts.error + counts.failed, color: 'var(--color-danger)' },
    { key: 'excluded', value: counts.excluded, color: 'var(--border-strong)' },
  ];

  const filterChips: { key: RowFilter; label: string; count: number; dot: string }[] = [
    { key: 'all', label: 'All rows', count: counts.total, dot: 'var(--text-muted)' },
    { key: 'ready', label: 'Ready', count: counts.ready + counts.imported, dot: 'var(--color-success)' },
    { key: 'warning', label: 'Needs a look', count: counts.warning, dot: 'var(--color-warning)' },
    { key: 'error', label: 'Errors', count: counts.error + counts.failed, dot: 'var(--color-danger)' },
    { key: 'db', label: 'Already in database', count: counts.db, dot: 'var(--color-info)' },
    { key: 'excluded', label: 'Skipped', count: counts.excluded, dot: 'var(--border-strong)' },
  ];

  const importModes: { key: ImportMode; label: string; count: number }[] = [
    { key: 'ready', label: 'Ready only', count: counts.ready },
    { key: 'readyAndWarnings', label: 'Ready + needs a look', count: counts.ready + counts.warning },
  ];

  const skipItems: MenuItem[] = [
    {
      label: 'Skip errors & already-listed',
      hint: 'Leaves only rows that can be created cleanly',
      count: skipCounts.errorsOrDb,
      icon: CircleSlash,
      tone: 'danger',
      disabled: skipCounts.errorsOrDb === 0,
      onClick: () => skipWhere((r, s) => s === 'error' || isDbDuplicate(r), 'rows with errors or already in the database'),
    },
    { divider: true },
    { label: 'Skip rows with errors', count: skipCounts.errors, icon: XCircle, disabled: skipCounts.errors === 0, onClick: () => skipWhere((_, s) => s === 'error', 'rows with errors') },
    {
      label: 'Skip rows already in database',
      hint: dbCheckedCount ? 'Listed business, number in use, or same brand in the city' : 'Run “Check against database” first',
      count: skipCounts.db,
      icon: DatabaseZap,
      disabled: skipCounts.db === 0,
      onClick: () => skipWhere((r) => isDbDuplicate(r), 'rows already in the database'),
    },
    { label: 'Skip rows that need a look', count: skipCounts.warnings, icon: AlertTriangle, disabled: skipCounts.warnings === 0, onClick: () => skipWhere((_, s) => s === 'warning', 'rows that need a look') },
    { divider: true },
    { label: 'Restore all skipped rows', count: skipCounts.skipped, icon: Undo2, disabled: skipCounts.skipped === 0, onClick: restoreSkipped },
  ];

  const applyItems: MenuItem[] = [
    { label: 'Listing status → Unverified', icon: ShieldAlert, onClick: () => applyToAll('providerStatus', 'unverified') },
    { label: 'Listing status → Active', icon: BadgeCheck, onClick: () => applyToAll('providerStatus', 'active') },
    { divider: true },
    { label: 'Women-led → Yes', icon: Check, onClick: () => applyToAll('isWomenLed', true) },
    { label: 'Women-led → No', icon: X, onClick: () => applyToAll('isWomenLed', false) },
    { divider: true },
    { label: 'Gender → Female', icon: UserRound, onClick: () => applyToAll('gender', 'female') },
    { label: 'Gender → Male', icon: UserRound, onClick: () => applyToAll('gender', 'male') },
  ];

  const importUnverified = importable.filter((r) => r.fields.providerStatus === 'unverified').length;
  const importActive = importable.length - importUnverified;
  const statusSummary = importActive === 0 ? 'Unverified' : importUnverified === 0 ? 'Active' : `${importUnverified} Unverified, ${importActive} Active`;
  const importableDbDup = importable.filter(isDbDuplicate).length;

  const imageRows = rows.filter((r) => countImages(r.images) > 0).length;
  const imageTotal = rows.reduce((n, r) => n + countImages(r.images), 0);
  const importImageTotal = importable.reduce((n, r) => n + countImages(r.images), 0);
  const failedImageCount = rows.reduce((n, r) => n + (r.importResult?.ok ? allImages(r.images).filter((i) => i.status === 'failed').length : 0), 0);
  const uploadedImageCount = rows.reduce((n, r) => n + allImages(r.images).filter((i) => i.status === 'done').length, 0);

  const imageMenu: MenuItem[] = [
    { label: 'Choose a folder', hint: 'Photos named with the owner’s mobile number', icon: FolderOpen, onClick: () => folderInputRef.current?.click() },
    { label: 'Choose images or a ZIP', hint: 'e.g. 9876543210_logo.jpg, 9876543210_1.jpg', icon: FileArchive, onClick: () => imageFilesInputRef.current?.click() },
    { divider: true },
    { label: 'Remove all images', count: imageTotal, icon: Trash2, tone: 'danger', disabled: imageTotal === 0, onClick: clearAllImages },
  ];

  return (
    <div>
      <PageHeader
        title="Bulk Import Providers"
        description="Upload a CSV or Excel sheet, vet every row, then create providers in one go"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Providers', path: ROUTES.PROVIDERS }, { label: 'Bulk Import' }]}
        actions={
          <button onClick={() => downloadTextFile('tijarah-provider-import-template.csv', templateCsv())} className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border" style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)', background: 'var(--surface-0)' }}>
            <Download className="w-4 h-4" /> Template
          </button>
        }
      />

      {/* Stepper */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i === stepIndex;
          const done = i < stepIndex;
          return (
            <div key={s.key} className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium" style={{
                background: active ? 'var(--color-primary)' : done ? 'var(--color-primary-light)' : 'var(--surface-1)',
                color: active ? '#fff' : done ? 'var(--color-primary)' : 'var(--text-muted)',
              }}>
                <Icon className="w-4 h-4" /> {s.label}
              </div>
              {i < STEPS.length - 1 && <ArrowRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />}
            </div>
          );
        })}
      </div>

      {/* ═══ STEP 1 — UPLOAD ═══ */}
      {step === 'upload' && (
        <div className="max-w-3xl">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) handleFile(f); }}
            onClick={() => fileInput.current?.click()}
            className="cursor-pointer rounded-2xl border-2 border-dashed p-12 text-center transition-all"
            style={{ borderColor: dragOver ? 'var(--color-primary)' : 'var(--border-default)', background: dragOver ? 'var(--color-primary-light)' : 'var(--surface-0)' }}
          >
            <input ref={fileInput} type="file" accept=".csv,.xlsx,.xls,.xlsm" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
            {parsing ? (
              <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin" style={{ color: 'var(--color-primary)' }} />
            ) : (
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--color-primary)' }} />
            )}
            <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{parsing ? 'Reading the sheet…' : 'Drop a CSV / Excel file here, or click to choose'}</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Google Form responses, event registration sheets, exports from other tools — any sheet with one business per row.</p>
          </div>

          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            {[
              { icon: Sparkles, title: 'Auto-cleaned', text: 'Phone numbers, cities, Instagram links and categories are normalised for you — every change is shown so you can verify it.' },
              { icon: DatabaseZap, title: 'Checked against the database', text: 'Existing users are reused; businesses that already exist are flagged before anything is written.' },
              { icon: Users, title: 'One account per row', text: 'Each row creates a login (owner mobile) plus the business profile, exactly like the single Create Provider form.' },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="p-4 rounded-xl border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
                <Icon className="w-5 h-5 mb-2" style={{ color: 'var(--color-primary)' }} />
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══ STEP 2 — MAP ═══ */}
      {step === 'map' && sheet && (
        <div className="grid xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <FileSpreadsheet className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{fileName}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{sheet.rows.length} data rows · {sheet.headers.length} columns · header on line {sheet.headerRowIndex + 1}</p>
                </div>
              </div>
              {sheets.length > 1 && (
                <select value={sheetIndex} onChange={(e) => pickSheet(Number(e.target.value))} className={`${inputCls} w-auto`} style={inputStyle}>
                  {sheets.map((s, i) => <option key={s.name} value={i}>{s.name} ({s.rows.length} rows)</option>)}
                </select>
              )}
              <button onClick={reset} className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Choose another file</button>
            </div>

            <div className="rounded-xl border overflow-hidden" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
              <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ background: 'var(--surface-1)', color: 'var(--text-muted)' }}>Which sheet column feeds each field?</div>
              <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                {TARGET_FIELDS.map((f) => {
                  const col = mapping[f.key];
                  const idx = col ? sheet.headers.indexOf(col) : -1;
                  const samples = idx >= 0 ? sheet.rows.map((r) => r[idx]).filter(Boolean).slice(0, 3) : [];
                  return (
                    <div key={f.key} className="grid grid-cols-12 gap-3 items-center px-4 py-2.5" style={{ borderColor: 'var(--border-light)' }}>
                      <div className="col-span-4">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f.label}{f.required && <span className="text-red-500 ml-0.5">*</span>}</p>
                        {f.hint && <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{f.hint}</p>}
                      </div>
                      <div className="col-span-4">
                        <select
                          value={col ?? ''}
                          onChange={(e) => setMapping((m) => ({ ...m, [f.key]: e.target.value || undefined }))}
                          className={inputCls}
                          style={{ ...inputStyle, borderColor: f.required && !col ? 'var(--color-danger)' : 'var(--border-default)' }}
                        >
                          <option value="">— not in sheet —</option>
                          {sheet.headers.map((h) => <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                      <div className="col-span-4 min-w-0">
                        {samples.length > 0 ? (
                          <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }} title={samples.join(' · ')}>e.g. {samples.join(' · ')}</p>
                        ) : <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>—</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border space-y-4" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Defaults for blank cells</p>
              <label className="block">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Owner gender</span>
                <select value={defaults.gender} onChange={(e) => setDefaults((d) => ({ ...d, gender: e.target.value as Gender }))} className={`${inputCls} mt-1`} style={inputStyle}>
                  <option value="female">Female</option><option value="male">Male</option><option value="other">Other</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Women-led</span>
                <select value={defaults.womenLed} onChange={(e) => setDefaults((d) => ({ ...d, womenLed: e.target.value as BuildDefaults['womenLed'] }))} className={`${inputCls} mt-1`} style={inputStyle}>
                  <option value="auto">Auto (from gender / column)</option><option value="yes">Yes for all</option><option value="no">No for all</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Provider status after import</span>
                <select value={defaults.providerStatus} onChange={(e) => setDefaults((d) => ({ ...d, providerStatus: e.target.value as BuildDefaults['providerStatus'] }))} className={`${inputCls} mt-1`} style={inputStyle}>
                  <option value="unverified">Unverified (default — verify before going live)</option><option value="active">Active (visible immediately)</option>
                </select>
              </label>
              <label className="block">
                <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>City when the cell is blank</span>
                <input list="city-options" value={defaults.city} onChange={(e) => setDefaults((d) => ({ ...d, city: e.target.value }))} placeholder="e.g. Pune" className={`${inputCls} mt-1`} style={inputStyle} />
                <datalist id="city-options">{cities.map((c) => <option key={c.id} value={c.name} />)}</datalist>
              </label>
            </div>

            <div className="p-4 rounded-xl border text-xs space-y-1.5" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
              <p className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}><Info className="w-3.5 h-3.5" /> What happens next</p>
              <p>Every row is cleaned and checked. You'll see the original value next to anything that changed, fix cells inline, and exclude rows you don't want. Nothing is written until you press Import.</p>
            </div>

            <div className="flex gap-2">
              <button onClick={reset} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}><ArrowLeft className="w-4 h-4" /> Back</button>
              <button onClick={build} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ background: 'var(--color-primary)' }}>Build preview <ArrowRight className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ STEP 3 — REVIEW ═══ */}
      {(step === 'review' || step === 'done') && (
        <div className="space-y-4">
          {/* ── Overview: proportion bar + filters ── */}
          <section className="rounded-2xl border p-4 sm:p-5" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Vet &amp; fix</p>
                <h2 className="mt-0.5 truncate text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  <span className="tabular-nums">{counts.total}</span> row{counts.total === 1 ? '' : 's'}
                  <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-muted)' }}>{fileName}</span>
                </h2>
              </div>
              <div className="flex flex-col items-start gap-1 sm:items-end">
                <p className="inline-flex items-center gap-1.5 text-xs" style={{ color: dbCheckedCount ? 'var(--text-secondary)' : 'var(--color-warning-dark)' }}>
                  <DatabaseZap className="h-3.5 w-3.5" />
                  {dbCheckedCount ? `${dbCheckedCount} of ${counts.total} checked against the database` : 'Not checked against the database yet'}
                </p>
                <p className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  <ImageIcon className="h-3.5 w-3.5" />
                  {imageTotal ? `${imageTotal} image${imageTotal === 1 ? '' : 's'} on ${imageRows} row${imageRows === 1 ? '' : 's'}` : 'No images attached'}
                </p>
              </div>
            </div>

            <div className="mt-4 flex h-2 w-full gap-0.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }} aria-hidden="true">
              {segments.filter((seg) => seg.value > 0).map((seg) => (
                <div key={seg.key} className="h-full transition-all" style={{ width: `${(seg.value / Math.max(1, counts.total)) * 100}%`, background: seg.color }} />
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter rows">
              {filterChips.map((c) => {
                const active = filter === c.key;
                return (
                  <button
                    key={c.key}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(c.key)}
                    className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                    style={{ background: active ? 'var(--color-primary-light)' : 'var(--surface-0)', borderColor: active ? 'var(--color-primary)' : 'var(--border-default)', color: active ? 'var(--color-primary)' : 'var(--text-secondary)' }}
                  >
                    <span className="h-2 w-2 rounded-full" style={{ background: c.dot }} />
                    {c.label}
                    <span className="rounded-full px-1.5 py-px text-[11px] font-semibold tabular-nums" style={{ background: active ? 'var(--surface-0)' : 'var(--surface-2)', color: active ? 'var(--color-primary)' : 'var(--text-secondary)' }}>{c.count}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {step === 'done' && (
            <div className="p-4 rounded-xl border flex flex-wrap items-center justify-between gap-3" style={{ background: counts.failed ? 'var(--color-warning-light)' : 'var(--color-success-light)', borderColor: counts.failed ? 'var(--color-warning)' : 'var(--color-success)' }}>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{counts.imported} provider{counts.imported === 1 ? '' : 's'} created{counts.failed ? `, ${counts.failed} failed` : ''}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Failed rows keep their error message in the table below.
                  {uploadedImageCount + failedImageCount > 0 && ` ${uploadedImageCount} image${uploadedImageCount === 1 ? '' : 's'} uploaded${failedImageCount ? `, ${failedImageCount} failed` : ''}.`}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={downloadReport} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-0)', color: 'var(--text-primary)' }}><Download className="w-4 h-4" /> Report</button>
                {failedImageCount > 0 && <button onClick={() => { void retryFailedImages(); }} disabled={!!imageProgress} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50" style={{ background: 'var(--surface-0)', color: 'var(--text-primary)' }}><RotateCcw className="w-4 h-4" /> Retry {failedImageCount} failed image{failedImageCount === 1 ? '' : 's'}</button>}
                {counts.failed > 0 && <button onClick={retryFailed} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-0)', color: 'var(--text-primary)' }}><RotateCcw className="w-4 h-4" /> Fix & retry failed</button>}
                <button onClick={() => navigate(ROUTES.PROVIDERS)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white rounded-lg" style={{ background: 'var(--color-primary)' }}><Store className="w-4 h-4" /> View providers</button>
                <button onClick={reset} className="px-3 py-1.5 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-0)', color: 'var(--text-primary)' }}>New import</button>
              </div>
            </div>
          )}

          {/* ── Toolbar ── */}
          <section className="rounded-2xl border p-3" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-sm)' }}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-72">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search brand, owner, mobile, city…" className="vet-search" aria-label="Search rows" />
              </div>
              <span className="text-xs tabular-nums" style={{ color: 'var(--text-muted)' }}>
                {visibleRows.length === rows.length ? `${rows.length} rows` : `${visibleRows.length} of ${rows.length} shown`}
              </span>

              {step === 'review' && (
                <>
                  <div className="mx-1 hidden h-6 w-px sm:block" style={{ background: 'var(--border-default)' }} />
                  <ActionMenu label="Skip rows" icon={EyeOff} items={skipItems} />
                  <ActionMenu label="Apply to all" icon={SlidersHorizontal} items={applyItems} />
                  <ActionMenu label={matchingImages ? 'Reading images…' : 'Attach images'} icon={matchingImages ? Loader2 : ImagePlus} items={imageMenu} />
                  <input
                    ref={folderInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    {...({ webkitdirectory: '', directory: '' } as Record<string, string>)}
                    onChange={(e) => { void attachImageFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }}
                  />
                  <input
                    ref={imageFilesInputRef}
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp,image/gif,.heic,.heif,.zip,application/zip"
                    className="hidden"
                    onChange={(e) => { void attachImageFiles(Array.from(e.target.files ?? [])); e.target.value = ''; }}
                  />
                  <button onClick={runServerCheck} disabled={validateMutation.isPending} className="vet-btn" data-variant="accent">
                    {validateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DatabaseZap className="h-3.5 w-3.5" />}
                    {dbCheckedCount ? 'Re-check database' : 'Check against database'}
                  </button>
                  <button onClick={() => setStep('map')} className="vet-btn"><ArrowLeft className="h-3.5 w-3.5" /> Mapping</button>

                  <div className="flex w-full flex-wrap items-center justify-end gap-2 lg:ml-auto lg:w-auto">
                    <div role="radiogroup" aria-label="Rows to import" className="inline-flex rounded-lg p-0.5" style={{ background: 'var(--surface-2)' }}>
                      {importModes.map((m) => {
                        const on = importMode === m.key;
                        return (
                          <button
                            key={m.key}
                            role="radio"
                            aria-checked={on}
                            onClick={() => setImportMode(m.key)}
                            className="rounded-md px-2.5 py-1.5 text-xs font-medium transition-all"
                            style={{ background: on ? 'var(--surface-0)' : 'transparent', color: on ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: on ? 'var(--shadow-sm)' : 'none' }}
                          >
                            {m.label} <span className="ml-0.5 tabular-nums" style={{ color: 'var(--text-muted)' }}>{m.count}</span>
                          </button>
                        );
                      })}
                    </div>
                    <button
                      onClick={() => setConfirmImport(true)}
                      disabled={importable.length === 0 || !!progress || !!imageProgress}
                      className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
                      style={{ background: 'var(--color-primary)', boxShadow: 'var(--shadow-sm)' }}
                    >
                      {progress ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {progress ? `Importing ${progress.done}/${progress.total}…` : `Import ${importable.length} ${importMode === 'ready' ? 'ready ' : ''}row${importable.length === 1 ? '' : 's'}`}
                    </button>
                  </div>
                </>
              )}
            </div>
            {progress && (
              <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
                <div className="h-full rounded-full transition-all" style={{ width: `${(progress.done / Math.max(1, progress.total)) * 100}%`, background: 'var(--color-primary)' }} />
              </div>
            )}
            {imageProgress && (
              <div className="mt-3">
                <p className="mb-1 text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>Uploading images {imageProgress.done}/{imageProgress.total}…</p>
                <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${(imageProgress.done / Math.max(1, imageProgress.total)) * 100}%`, background: 'var(--color-info)' }} />
                </div>
              </div>
            )}
          </section>

          {/* ── The vetting table ── */}
          <section
            className="vet-dropzone overflow-hidden rounded-2xl border"
            data-over={tableDragOver ? 'true' : undefined}
            style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-sm)' }}
            onDragOver={(e) => {
              if (step !== 'review' || !Array.from(e.dataTransfer.types).includes('Files')) return;
              e.preventDefault();
              setTableDragOver(true);
            }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setTableDragOver(false); }}
            onDrop={(e) => {
              if (step !== 'review') return;
              e.preventDefault();
              setTableDragOver(false);
              // Read the drop synchronously — the browser clears it once this handler returns.
              void filesFromDrop(e.dataTransfer).then(attachImageFiles);
            }}
          >
            <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 290px)' }}>
              <table className="vet-table" style={{ width: TABLE_MIN_WIDTH }}>
                <colgroup>
                  {COLUMNS.map((c) => <col key={c.key} style={{ width: c.width }} />)}
                </colgroup>
                <thead>
                  <tr className="vet-group-row">
                    <th colSpan={4} className="vet-sticky vet-sticky-edge" style={{ left: 0 }}>Business</th>
                    <th colSpan={4}>Owner &amp; contact</th>
                    <th colSpan={3}>Location</th>
                    <th colSpan={7}>Listing profile</th>
                    <th colSpan={2}>Checks</th>
                  </tr>
                  <tr className="vet-col-row">
                    {COLUMNS.map((c) => (
                      <th
                        key={c.key}
                        scope="col"
                        className={c.sticky ? `vet-sticky${c.key === LAST_STICKY ? ' vet-sticky-edge' : ''}` : undefined}
                        style={c.sticky ? { left: STICKY_LEFT[c.key] } : undefined}
                      >
                        {c.key === 'select' ? (
                          <input
                            type="checkbox"
                            className="vet-check"
                            aria-label="Include or skip all shown rows"
                            checked={allVisibleIncluded}
                            disabled={step === 'done' || selectableVisible.length === 0}
                            ref={(el) => { if (el) el.indeterminate = !allVisibleIncluded && someVisibleIncluded; }}
                            onChange={toggleVisibleInclude}
                          />
                        ) : (
                          <>{c.label}{c.required && <span className="vet-req" aria-hidden="true">*</span>}</>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.length === 0 && (
                    <tr>
                      <td colSpan={COLUMNS.length} style={{ padding: 0 }}>
                        <div className="sticky left-0 flex flex-col items-center gap-2 px-6 py-14 text-center" style={{ width: 'min(760px, 90vw)' }}>
                          <div className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>
                            <Search className="h-5 w-5" />
                          </div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No rows match</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Try a different filter or clear the search.</p>
                          <button onClick={() => { setFilter('all'); setSearch(''); }} className="vet-btn mt-1">Show all rows</button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {visibleRows.map((row) => {
                    const v = validation.get(row.rowId)!;
                    const meta = STATUS_META[v.status];
                    const StatusIcon = meta.icon;
                    const locked = !!row.importResult?.ok || step === 'done';
                    const fieldErr = (k: RowFieldKey | 'categories') => v.errors.find((e) => e.field === k)?.message;
                    const fieldWarn = (k: RowFieldKey | 'categories') => v.warnings.find((e) => e.field === k)?.message;
                    const issues = [
                      ...v.errors.map((e) => ({ ...e, level: 'error' as const })),
                      ...v.warnings.map((w) => ({ ...w, level: 'warning' as const })),
                    ];
                    const dbMeta = DB_META[getDbStatus(row)];
                    const DbIcon = dbMeta.icon;
                    const sc = row.serverCheck;
                    const dbDetail = !sc ? undefined
                      : sc.existingProvider ? `${sc.existingProvider.brandName} · ${sc.existingProvider.status}`
                      : sc.contactNumberOwner ? `${sc.contactNumberOwner.brandName}, ${sc.contactNumberOwner.city}`
                      : sc.brandNameClash ? `${sc.brandNameClash.brandName}, ${sc.brandNameClash.city}`
                      : sc.existingUser ? sc.existingUser.name : undefined;

                    const cell = (k: RowFieldKey, opts: { mono?: boolean; placeholder?: string; list?: string; numeric?: boolean } = {}) => {
                      const err = fieldErr(k);
                      const warn = fieldWarn(k);
                      const note = row.notes[k];
                      return (
                        <div className="vet-cell" data-state={err ? 'error' : warn ? 'warning' : 'clean'}>
                          <input
                            type="text"
                            value={row.fields[k] as string}
                            disabled={locked}
                            list={opts.list}
                            inputMode={opts.numeric ? 'numeric' : undefined}
                            placeholder={opts.placeholder}
                            aria-invalid={err ? true : undefined}
                            title={[err, warn].filter(Boolean).join('\n') || undefined}
                            onChange={(e) => setField(row.rowId, k, e.target.value as never)}
                            className={`vet-input${opts.mono ? ' vet-mono' : ''}${note ? ' has-note' : ''}`}
                          />
                          {note && (
                            <span className="vet-note" title={`Auto-cleaned: ${note}`}>
                              <Wand2 className="h-3 w-3" />
                            </span>
                          )}
                        </div>
                      );
                    };

                    return (
                      <tr key={row.rowId} data-status={v.status}>
                        <td className="vet-sticky vet-accent" style={{ left: STICKY_LEFT.select }}>
                          <input
                            type="checkbox"
                            className="vet-check"
                            checked={row.include}
                            disabled={locked}
                            onChange={() => toggleInclude(row.rowId)}
                            aria-label={row.include ? `Skip row ${row.sourceIndex}` : `Include row ${row.sourceIndex}`}
                          />
                        </td>
                        <td className="vet-sticky" style={{ left: STICKY_LEFT.row }}>
                          <button onClick={() => setDetailRowId(row.rowId)} className="vet-rownum" title="Open details and compare with the sheet">{row.sourceIndex}</button>
                        </td>
                        <td className="vet-sticky" style={{ left: STICKY_LEFT.status }}>
                          <span className="vet-pill" style={{ background: meta.bg, color: meta.color }}>
                            <StatusIcon className="h-3.5 w-3.5" />{meta.label}
                          </span>
                          {!row.importResult && issues.length > 0 && (
                            <p className="vet-sub tabular-nums">
                              {[
                                v.errors.length ? `${v.errors.length} error${v.errors.length === 1 ? '' : 's'}` : '',
                                v.warnings.length ? `${v.warnings.length} to check` : '',
                              ].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </td>
                        <td className="vet-sticky vet-sticky-edge" style={{ left: STICKY_LEFT.brandName }}>{cell('brandName', { placeholder: 'Business name' })}</td>
                        <td>{cell('userName', { placeholder: 'Owner name' })}</td>
                        <td>{cell('mobile', { mono: true, numeric: true, placeholder: '10 digits' })}</td>
                        <td>{cell('whatsapp', { mono: true, numeric: true, placeholder: 'Optional' })}</td>
                        <td>{cell('email', { placeholder: 'Optional' })}</td>
                        <td>{cell('city', { list: 'city-options-review', placeholder: 'City' })}</td>
                        <td>{cell('area', { placeholder: 'Optional' })}</td>
                        <td>{cell('pincode', { mono: true, numeric: true, placeholder: '6 digits' })}</td>
                        <td>
                          <ImagesCell images={row.images} disabled={locked} onChange={(next, discarded) => setRowImages(row.rowId, next, discarded)} />
                        </td>
                        <td>
                          <CategoryCell options={categories} value={row.categoryIds} disabled={locked} onChange={(ids) => setCategories(row.rowId, ids)} rawText={row.categoryText} unmatched={row.unmatchedCategories} warning={fieldWarn('categories')} />
                        </td>
                        <td>{cell('instagram', { placeholder: 'handle' })}</td>
                        <td>
                          <div className="vet-cell" data-state="clean">
                            <select value={row.fields.gender} disabled={locked} onChange={(e) => setField(row.rowId, 'gender', e.target.value as Gender)} className="vet-input vet-select" aria-label="Owner gender">
                              <option value="female">Female</option>
                              <option value="male">Male</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </td>
                        <td>
                          <label className="vet-switch" title={row.fields.isWomenLed ? 'Women-led' : 'Not women-led'}>
                            <input type="checkbox" checked={row.fields.isWomenLed} disabled={locked} onChange={(e) => setField(row.rowId, 'isWomenLed', e.target.checked)} aria-label="Women-led business" />
                            <span aria-hidden="true" />
                          </label>
                        </td>
                        <td>
                          <div className="vet-cell" data-state="clean">
                            <select value={row.fields.providerStatus} disabled={locked} onChange={(e) => setField(row.rowId, 'providerStatus', e.target.value as 'active' | 'unverified')} className="vet-input vet-select" aria-label="Listing status">
                              <option value="unverified">Unverified</option>
                              <option value="active">Active</option>
                            </select>
                          </div>
                        </td>
                        <td>{cell('description', { placeholder: 'Optional' })}</td>
                        <td>
                          <span className="vet-pill" style={{ background: dbMeta.bg, color: dbMeta.color }}>
                            <DbIcon className="h-3.5 w-3.5" />{dbMeta.label}
                          </span>
                          {dbDetail && <p className="vet-sub truncate" title={dbDetail}>{dbDetail}</p>}
                        </td>
                        <td>
                          {row.importResult?.ok ? (
                            <div className="space-y-1">
                              <p className="vet-issue">
                                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
                                Created · <span className="vet-mono">{row.importResult.providerId?.slice(0, 8)}</span>
                              </p>
                              {allImages(row.images).filter((i) => i.status === 'failed').slice(0, 2).map((img) => (
                                <p key={img.id} className="vet-issue" data-level="error">
                                  <span className="vet-issue-dot" />
                                  {img.role === 'logo' ? 'Logo' : img.role === 'banner' ? 'Banner' : 'Gallery photo'}: {img.error ?? 'upload failed'}
                                </p>
                              ))}
                            </div>
                          ) : row.importResult ? (
                            <p className="vet-issue" data-level="error"><span className="vet-issue-dot" />{row.importResult.error}</p>
                          ) : issues.length === 0 ? (
                            <span className="vet-sub">No issues</span>
                          ) : (
                            <div className="space-y-1">
                              {issues.slice(0, 2).map((it, i) => (
                                <p key={i} className="vet-issue" data-level={it.level}><span className="vet-issue-dot" />{it.message}</p>
                              ))}
                              {issues.length > 2 && (
                                <button onClick={() => setDetailRowId(row.rowId)} className="vet-more">+{issues.length - 2} more</button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <datalist id="city-options-review">{cities.map((c) => <option key={c.id} value={c.name} />)}</datalist>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span className="inline-flex items-center gap-1.5"><Wand2 className="h-3.5 w-3.5" style={{ color: 'var(--color-primary)' }} />Auto-cleaned — hover the icon to see the original</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-warning)' }} />Needs a look</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full" style={{ background: 'var(--color-danger)' }} />Must fix or skip</span>
            <span className="inline-flex items-center gap-1.5"><Eye className="h-3.5 w-3.5" />Click a row number to compare with the sheet</span>
            <span className="inline-flex items-center gap-1.5"><ImagePlus className="h-3.5 w-3.5" />Drop a folder of photos onto the table to attach them by mobile number</span>
          </div>
        </div>
      )}

      {/* Row detail: raw vs normalized */}
      <DetailPanel open={!!detailRow} onClose={() => setDetailRowId(null)} title={detailRow ? `Row ${detailRow.sourceIndex}` : ''} subtitle={detailRow?.fields.brandName} width="640px">
        {detailRow && (() => {
          const v = validation.get(detailRow.rowId);
          return (
            <div className="space-y-4">
              {v && (v.errors.length > 0 || v.warnings.length > 0) && (
                <div className="p-3 rounded-xl space-y-1" style={{ background: 'var(--surface-1)' }}>
                  {v.errors.map((e, i) => <p key={`e${i}`} className="text-sm flex items-start gap-1.5" style={{ color: 'var(--color-danger-dark)' }}><XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{e.message}</p>)}
                  {v.warnings.map((w, i) => <p key={`w${i}`} className="text-sm flex items-start gap-1.5" style={{ color: 'var(--color-warning-dark)' }}><AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />{w.message}</p>)}
                </div>
              )}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Original sheet row</p>
                <div className="rounded-xl border divide-y" style={{ borderColor: 'var(--border-default)' }}>
                  {Object.entries(detailRow.raw).map(([h, val]) => (
                    <div key={h} className="grid grid-cols-5 gap-2 px-3 py-2" style={{ borderColor: 'var(--border-light)' }}>
                      <p className="col-span-2 text-xs font-medium truncate" style={{ color: 'var(--text-muted)' }} title={h}>{h}</p>
                      <p className="col-span-3 text-sm break-words" style={{ color: val ? 'var(--text-primary)' : 'var(--text-muted)' }}>{val || '—'}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>What will be saved</p>
                <div className="rounded-xl border divide-y" style={{ borderColor: 'var(--border-default)' }}>
                  {([
                    ['Brand', detailRow.fields.brandName, detailRow.notes.brandName],
                    ['Owner (login name)', detailRow.fields.userName, detailRow.notes.userName],
                    ['Login mobile', detailRow.fields.mobile, detailRow.notes.mobile],
                    ['Business contact', detailRow.fields.mobile ? `+91${detailRow.fields.mobile}` : '', undefined],
                    ['Alt WhatsApp', detailRow.fields.whatsapp ? `+91${detailRow.fields.whatsapp}` : '', detailRow.notes.whatsapp],
                    ['City', detailRow.fields.city, detailRow.notes.city],
                    ['Area', detailRow.fields.area, undefined],
                    ['Categories', detailRow.categoryIds.map((id) => categories.find((c) => c.id === id)?.name ?? id).join(', '), detailRow.notes.categories],
                    ['Instagram', detailRow.fields.instagram ? `@${detailRow.fields.instagram}` : '', detailRow.notes.instagram],
                    ['Email', detailRow.fields.email, undefined],
                    ['Gender', detailRow.fields.gender, undefined],
                    ['Women-led', detailRow.fields.isWomenLed ? 'Yes' : 'No', undefined],
                    ['Provider status', detailRow.fields.providerStatus, undefined],
                    ['Description', detailRow.fields.description, detailRow.notes.description],
                    ['Website', detailRow.fields.website, undefined],
                  ] as [string, string, string | undefined][]).map(([label, val, note]) => (
                    <div key={label} className="grid grid-cols-5 gap-2 px-3 py-2" style={{ borderColor: 'var(--border-light)' }}>
                      <p className="col-span-2 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
                      <div className="col-span-3">
                        <p className="text-sm break-words" style={{ color: val ? 'var(--text-primary)' : 'var(--text-muted)' }}>{val || '—'}</p>
                        {note && <p className="text-[11px] mt-0.5" style={{ color: 'var(--color-primary)' }}>auto: {note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {countImages(detailRow.images) > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Images</p>
                  <ImageList images={detailRow.images} />
                </div>
              )}
              {detailRow.serverCheck && (
                <div className="p-3 rounded-xl border text-xs space-y-1" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
                  <p className="font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}><DatabaseZap className="w-3.5 h-3.5" /> Database check</p>
                  <p>Existing user: {detailRow.serverCheck.existingUser ? `${detailRow.serverCheck.existingUser.name} (will be reused)` : 'none — a new login will be created'}</p>
                  <p>Owns a provider: {detailRow.serverCheck.existingProvider ? `${detailRow.serverCheck.existingProvider.brandName} (${detailRow.serverCheck.existingProvider.status}) — blocked` : 'no'}</p>
                  <p>Contact number in use: {detailRow.serverCheck.contactNumberOwner ? `${detailRow.serverCheck.contactNumberOwner.brandName}, ${detailRow.serverCheck.contactNumberOwner.city}` : 'no'}</p>
                  <p>Brand name clash: {detailRow.serverCheck.brandNameClash ? `${detailRow.serverCheck.brandNameClash.brandName}, ${detailRow.serverCheck.brandNameClash.city}` : 'no'}</p>
                </div>
              )}
            </div>
          );
        })()}
      </DetailPanel>

      <DetailPanel
        open={!!imageMatch}
        onClose={() => setImageMatch(null)}
        title="Images attached"
        subtitle={imageMatch ? `${imageMatch.attached} of ${imageMatch.files} file${imageMatch.files === 1 ? '' : 's'} matched` : undefined}
        width="560px"
      >
        {imageMatch && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {([
                ['Files', imageMatch.files, 'var(--text-primary)'],
                ['Attached', imageMatch.attached, 'var(--color-success-dark)'],
                ['Rows', imageMatch.rowsTouched, 'var(--text-primary)'],
                ['Unmatched', imageMatch.unmatched.length, imageMatch.unmatched.length ? 'var(--color-danger-dark)' : 'var(--text-muted)'],
              ] as [string, number, string][]).map(([label, value, color]) => (
                <div key={label} className="rounded-xl border p-3" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</p>
                  <p className="text-xl font-bold tabular-nums" style={{ color }}>{value}</p>
                </div>
              ))}
            </div>
            {imageMatch.replaced > 0 && (
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                {imageMatch.replaced} existing logo or banner image{imageMatch.replaced === 1 ? ' was' : 's were'} replaced by the new files.
              </p>
            )}

            <div className="space-y-1.5 rounded-xl border p-3 text-xs" style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
              <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>How files are matched</p>
              <p>Put the owner’s 10-digit mobile number in each file name, or name a folder after it.</p>
              <ul className="list-disc space-y-0.5 pl-4">
                <li><span className="vet-mono">9876543210_logo.jpg</span> → logo</li>
                <li><span className="vet-mono">9876543210_banner.jpg</span> or <span className="vet-mono">_cover</span> → banner</li>
                <li><span className="vet-mono">9876543210_1.jpg</span>, <span className="vet-mono">_2.jpg</span> … → gallery, up to {MAX_GALLERY_PHOTOS}</li>
                <li><span className="vet-mono">9876543210/logo.jpg</span> — one folder per business works too</li>
              </ul>
              <p>JPG, PNG, WebP or GIF, up to 10MB each. iPhone HEIC photos need exporting as JPG first.</p>
            </div>

            {imageMatch.unmatched.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Not attached</p>
                <div className="max-h-80 divide-y overflow-y-auto rounded-xl border" style={{ borderColor: 'var(--border-default)' }}>
                  {imageMatch.unmatched.map((u, i) => (
                    <div key={`${u.name}-${i}`} className="px-3 py-2" style={{ borderColor: 'var(--border-light)' }}>
                      <p className="truncate text-sm" style={{ color: 'var(--text-primary)' }} title={u.name}>{u.name}</p>
                      <p className="text-xs" style={{ color: 'var(--color-danger-dark)' }}>{u.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </DetailPanel>

      <ConfirmDialog
        open={confirmImport}
        onClose={() => setConfirmImport(false)}
        onConfirm={runImport}
        title={`Import ${importable.length} provider${importable.length === 1 ? '' : 's'}?`}
        description={
          importMode === 'ready'
            ? `Only rows marked Ready are created. ${counts.warning} that need a look, ${counts.error} with errors and ${counts.excluded} skipped are left out. Listings will be created as ${statusSummary}. Each row creates a user login and a provider profile — this can't be bulk-undone.${importImageTotal ? ` Then ${importImageTotal} image${importImageTotal === 1 ? '' : 's'} will upload.` : ''}`
            : `${counts.ready} ready and ${counts.warning} that need a look will be created. ${counts.error} with errors and ${counts.excluded} skipped are left out. Listings will be created as ${statusSummary}. Each row creates a user login and a provider profile — this can't be bulk-undone.${importImageTotal ? ` Then ${importImageTotal} image${importImageTotal === 1 ? '' : 's'} will upload.` : ''}`
        }
        confirmLabel="Import now"
        variant="warning"
        isLoading={importMutation.isPending}
      >
        <div className="space-y-2">
          {!rows.some((r) => r.serverCheck) && (
            <p className="flex items-start gap-1.5 rounded-lg p-2 text-xs" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> You haven't run "Check against database" yet. Rows that clash with existing records will fail and be reported.
            </p>
          )}
          {importableDbDup > 0 && (
            <p className="flex items-start gap-1.5 rounded-lg p-2 text-xs" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
              <DatabaseZap className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {importableDbDup} of these match a business or phone number already in the database. Use Skip rows → "Skip rows already in database" to leave them out.
            </p>
          )}
        </div>
      </ConfirmDialog>
    </div>
  );
}

// ─── Category chip editor for a single table cell ─────────────────────────

function CategoryCell({ options, value, onChange, disabled, rawText, unmatched, warning }: {
  options: Category[]; value: string[]; onChange: (ids: string[]) => void; disabled: boolean; rawText: string; unmatched: string[]; warning?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    return options.filter((c) => !value.includes(c.id) && (!s || c.name.toLowerCase().includes(s) || (c.keywords ?? []).some((k) => k.toLowerCase().includes(s)))).slice(0, 8);
  }, [options, q, value]);
  const title = [rawText ? `Sheet: ${rawText}` : undefined, unmatched.length ? `Unmatched: ${unmatched.join(', ')}` : undefined, warning].filter(Boolean).join('\n') || undefined;

  return (
    <div ref={ref} className="relative" title={title}>
      <div className="vet-chipbox" data-state={warning ? 'warning' : 'clean'}>
        {value.map((id) => {
          const c = options.find((o) => o.id === id);
          return (
            <span key={id} className="vet-chip">
              {c?.name ?? id.slice(0, 6)}
              {!disabled && (
                <button onClick={() => onChange(value.filter((v) => v !== id))} className="hover:opacity-70" aria-label={`Remove ${c?.name ?? 'category'}`}>
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          );
        })}
        {!disabled && (
          <button onClick={() => { setOpen((o) => !o); setQ(''); }} className="vet-chip-add" aria-label="Add category" aria-expanded={open}>
            <Plus className="h-3 w-3" />{value.length === 0 ? 'Add category' : ''}
          </button>
        )}
      </div>
      {value.length === 0 && rawText && <p className="vet-sub truncate px-1.5">Sheet: {rawText}</p>}
      {open && !disabled && (
        <div className="absolute left-0 z-30 mt-1.5 w-72 rounded-xl border p-2" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-lg)' }}>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search categories…"
              className="vet-search"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false);
                if (e.key === 'Enter' && matches[0]) { onChange([...value, matches[0].id]); setQ(''); }
              }}
            />
          </div>
          <div className="mt-1.5 max-h-56 overflow-y-auto">
            {matches.map((c) => (
              <button key={c.id} onClick={() => { onChange([...value, c.id]); setQ(''); }} className="vet-menu-item text-left text-[13px]">
                <span className="flex-1">{c.name}</span>
                {!c.parentId && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>group</span>}
              </button>
            ))}
            {matches.length === 0 && <p className="px-2 py-3 text-xs" style={{ color: 'var(--text-muted)' }}>No category matches</p>}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Toolbar dropdown menu ─────────────────────────────────────────────────

type MenuItem =
  | { divider: true }
  | { divider?: false; label: string; hint?: string; count?: number; icon: React.ElementType; tone?: 'danger' | 'default'; disabled?: boolean; onClick: () => void };

function ActionMenu({ label, icon: Icon, items }: { label: string; icon: React.ElementType; items: MenuItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className="vet-btn">
        <Icon className="h-3.5 w-3.5" />
        {label}
        <ChevronDown className="h-3.5 w-3.5 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none' }} />
      </button>
      {open && (
        <div role="menu" className="absolute left-0 z-30 mt-1.5 w-72 rounded-xl border p-1.5" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', boxShadow: 'var(--shadow-lg)' }}>
          {items.map((it, i) => it.divider ? (
            <div key={`divider-${i}`} className="my-1 h-px" style={{ background: 'var(--border-light)' }} />
          ) : (
            <button
              key={it.label}
              role="menuitem"
              disabled={it.disabled}
              onClick={() => { it.onClick(); setOpen(false); }}
              className="vet-menu-item"
              data-tone={it.tone ?? 'default'}
            >
              <it.icon className="mt-px h-4 w-4 flex-shrink-0" />
              <span className="min-w-0 flex-1 text-left">
                <span className="block text-[13px] font-medium">{it.label}</span>
                {it.hint && <span className="vet-menu-hint block text-[11px]">{it.hint}</span>}
              </span>
              {typeof it.count === 'number' && <span className="vet-menu-count tabular-nums">{it.count}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Field key used for the mapping select typing; kept for clarity of intent.
export type { TargetField };

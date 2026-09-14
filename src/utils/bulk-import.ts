import * as XLSX from 'xlsx';
import type { Category, Gender } from '../types';
import type { ServiceableCity } from '../services/serviceable-cities.service';
import type { BulkProviderRowPayload, BulkValidateRowResult, BulkImportRowResult } from '../services/bulk-import.service';
import { imagesFromLinks, type RowImages } from './bulk-import-images';

// ═══════════════════════════════════════════════════════════════════════════
// Spreadsheet → vetted provider rows
//
// Everything here is pure and synchronous so the review table can re-run it
// on every edit. The only side effect is the file read in parseSpreadsheet.
// ═══════════════════════════════════════════════════════════════════════════

// ── Target fields ─────────────────────────────────────────────────────────

export type TargetField =
  | 'brandName' | 'userName' | 'mobile' | 'whatsapp' | 'email' | 'gender'
  | 'city' | 'area' | 'address' | 'pincode'
  | 'instagram' | 'website' | 'categories' | 'description'
  | 'isWomenLed' | 'openTime' | 'closeTime'
  | 'logoUrl' | 'bannerUrl' | 'galleryUrls';

export interface TargetFieldDef {
  key: TargetField;
  label: string;
  required?: boolean;
  hint: string;
  synonyms: string[];
}

export const TARGET_FIELDS: TargetFieldDef[] = [
  { key: 'brandName', label: 'Brand / Business name', required: true, hint: 'Shown to customers', synonyms: ['brand name', 'brand', 'business name', 'business', 'shop name', 'store name', 'company', 'outlet', 'shop'] },
  { key: 'userName', label: 'Owner name', required: true, hint: 'Login account name. Falls back to the brand name.', synonyms: ['full name', 'name', 'owner name', 'owner', 'contact person', 'person name', 'your name', 'proprietor', 'seller name'] },
  { key: 'mobile', label: 'Mobile / WhatsApp', required: true, hint: '10-digit Indian mobile. Becomes the login number and business contact.', synonyms: ['whatsapp number', 'whatsapp', 'mobile', 'mobile number', 'mobile no', 'phone', 'phone number', 'contact number', 'contact no', 'contact', 'number', 'mob', 'cell', 'whatsapp no'] },
  { key: 'city', label: 'City', required: true, hint: 'Matched against serviceable cities', synonyms: ['city', 'location', 'town', 'city name'] },
  { key: 'categories', label: 'Categories', hint: 'Free text, matched to Tijarah categories', synonyms: ['product category', 'category', 'categories', 'products', 'business category', 'type of business', 'what do you sell', 'product type', 'services'] },
  { key: 'instagram', label: 'Instagram', hint: 'Handle or profile URL', synonyms: ['instagram', 'insta', 'instagram business page link', 'instagram link', 'ig', 'instagram handle', 'instagram page', 'instagram id'] },
  { key: 'area', label: 'Area / Locality', hint: '', synonyms: ['area', 'locality', 'neighbourhood', 'neighborhood', 'suburb', 'landmark'] },
  { key: 'address', label: 'Address', hint: '', synonyms: ['address', 'full address', 'street', 'shop address', 'business address'] },
  { key: 'pincode', label: 'Pincode', hint: '6 digits', synonyms: ['pincode', 'pin code', 'pin', 'zip', 'zip code', 'postal code'] },
  { key: 'email', label: 'Email', hint: '', synonyms: ['email', 'e-mail', 'email address', 'mail', 'email id'] },
  { key: 'gender', label: 'Owner gender', hint: 'Defaults apply when blank', synonyms: ['gender', 'sex'] },
  { key: 'whatsapp', label: 'Alternate WhatsApp', hint: 'Only if different from mobile', synonyms: ['alternate number', 'alternate mobile', 'secondary number', 'other number', 'whatsapp (if different)', 'alt number'] },
  { key: 'website', label: 'Website', hint: '', synonyms: ['website', 'web', 'url', 'site', 'website url', 'web link'] },
  { key: 'description', label: 'Description', hint: 'About the business', synonyms: ['description', 'about', 'bio', 'details', 'about business', 'about the business', 'tagline'] },
  { key: 'isWomenLed', label: 'Women-led', hint: 'yes / no', synonyms: ['women led', 'woman led', 'women-led', 'female owned', 'women owned', 'is women led'] },
  { key: 'openTime', label: 'Opens at', hint: 'HH:MM', synonyms: ['opening time', 'open time', 'opens', 'opens at', 'open'] },
  { key: 'closeTime', label: 'Closes at', hint: 'HH:MM', synonyms: ['closing time', 'close time', 'closes', 'closes at', 'close'] },
  // Image links — Google Form file-upload questions put Google Drive links in these columns.
  { key: 'logoUrl', label: 'Logo image link', hint: 'Google Drive, Dropbox or direct link', synonyms: ['logo', 'logo url', 'logo link', 'business logo', 'upload logo', 'upload your logo', 'profile photo', 'profile picture', 'display picture'] },
  { key: 'bannerUrl', label: 'Banner image link', hint: 'Cover or shop-front photo link', synonyms: ['banner', 'banner url', 'banner link', 'banner image', 'cover photo', 'cover image', 'upload banner', 'shop photo', 'store photo'] },
  { key: 'galleryUrls', label: 'Gallery photo links', hint: 'Several links separated by commas', synonyms: ['gallery', 'gallery photos', 'product photos', 'product images', 'upload photos', 'upload product photos', 'business photos', 'work photos', 'portfolio'] },
];

export type ColumnMapping = Partial<Record<TargetField, string>>;

// ── Parsing ───────────────────────────────────────────────────────────────

export interface ParsedSheet {
  name: string;
  headers: string[];
  /** Data rows (header excluded), every cell already a trimmed string */
  rows: string[][];
  headerRowIndex: number;
}

function cellToString(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'number') {
    // Integers keep full precision here (phone numbers stored as numbers).
    return Number.isInteger(v) ? String(v) : String(v);
  }
  return String(v).trim();
}

export async function parseSpreadsheet(file: File): Promise<ParsedSheet[]> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true, raw: true });
  const sheets: ParsedSheet[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    if (!ws) continue;
    const grid = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: '' });
    const asText = grid.map((r) => (r as unknown[]).map(cellToString));
    // Header = first row with at least two non-empty cells.
    const headerRowIndex = asText.findIndex((r) => r.filter((c) => c !== '').length >= 2);
    if (headerRowIndex === -1) continue;
    const headers = asText[headerRowIndex].map((h, i) => h || `Column ${i + 1}`);
    const rows = asText
      .slice(headerRowIndex + 1)
      .map((r) => headers.map((_, i) => r[i] ?? ''))
      .filter((r) => r.some((c) => c !== ''));
    sheets.push({ name, headers, rows, headerRowIndex });
  }
  return sheets;
}

// ── Header auto-mapping ───────────────────────────────────────────────────

const normHeader = (h: string) => h.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function autoMapColumns(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  const taken = new Set<string>();
  const normalized = headers.map((h) => ({ raw: h, norm: normHeader(h) }));

  // Pass 1: exact synonym match. Pass 2: header contains a synonym.
  for (const pass of ['exact', 'contains'] as const) {
    for (const def of TARGET_FIELDS) {
      if (mapping[def.key]) continue;
      const syns = def.synonyms.map(normHeader);
      const hit = normalized.find(({ raw, norm }) =>
        !taken.has(raw) && (pass === 'exact' ? syns.includes(norm) : syns.some((s) => s.length >= 4 && norm.includes(s))),
      );
      if (hit) { mapping[def.key] = hit.raw; taken.add(hit.raw); }
    }
  }
  return mapping;
}

// ── Normalizers ───────────────────────────────────────────────────────────

export interface Normalized<T> {
  value: T;
  /** Human-readable note about what was changed from the source */
  note?: string;
  issue?: string;
}

export function normalizePhone(raw: string): Normalized<string> & { extras: string[] } {
  const src = (raw ?? '').trim();
  if (!src) return { value: '', extras: [], issue: 'Mobile number is required' };
  if (/\d(\.\d+)?e\+?\d+/i.test(src)) {
    return { value: '', extras: [], issue: 'Number was stored in scientific notation in the sheet and lost digits — re-enter it' };
  }
  const parts = src.split(/\s*(?:\/|,|;|\||&| or | and )\s*/i).filter(Boolean);
  const valid: string[] = [];
  for (const part of parts) {
    let digits = part.replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    else if (digits.length === 13 && digits.startsWith('091')) digits = digits.slice(3);
    if (/^[6-9]\d{9}$/.test(digits)) valid.push(digits);
  }
  const unique = Array.from(new Set(valid));
  if (unique.length === 0) return { value: '', extras: [], issue: `"${src}" is not a valid 10-digit Indian mobile` };
  const [value, ...extras] = unique;
  const note = value !== src ? `from "${src}"${extras.length ? ` (+${extras.length} more number${extras.length > 1 ? 's' : ''})` : ''}` : undefined;
  return { value, extras, note };
}

const CITY_ALIASES: Record<string, string> = {
  poona: 'pune', bombay: 'mumbai', bengaluru: 'bangalore', bangalore: 'bengaluru',
  madras: 'chennai', calcutta: 'kolkata', dohad: 'dahod', nasik: 'nashik', nashik: 'nasik',
  'navi mumbai': 'mumbai', 'mumbai mmr': 'mumbai', 'pune city': 'pune',
};

export function titleCase(s: string) {
  return s.toLowerCase().replace(/\b[a-z]/g, (c) => c.toUpperCase());
}

export function normalizeCity(raw: string, cities: ServiceableCity[]): Normalized<string> & { serviceable: boolean } {
  const src = (raw ?? '').trim();
  if (!src) return { value: '', serviceable: false, issue: 'City is required' };

  // "PUNE/HYDERABAD" or "Pune, Mumbai" — first one wins, the rest is noted.
  const parts = src.split(/\s*(?:\/|,|;|\||&| or | and )\s*/i).filter(Boolean);
  const first = parts[0];
  const lower = first.toLowerCase().replace(/\s+/g, ' ');

  const byName = new Map(cities.map((c) => [c.name.toLowerCase(), c]));
  const tryMatch = (key: string) =>
    byName.get(key)
    ?? cities.find((c) => key.startsWith(c.name.toLowerCase()) || c.name.toLowerCase().startsWith(key))
    ?? cities.find((c) => key.includes(c.name.toLowerCase()));

  const hit = tryMatch(lower) ?? (CITY_ALIASES[lower] ? tryMatch(CITY_ALIASES[lower]) : undefined);
  const multiNote = parts.length > 1 ? `picked "${first}" out of "${src}"` : undefined;

  if (hit) {
    const changed = hit.name !== src;
    const note = [changed ? `from "${src}"` : undefined, multiNote].filter(Boolean).join('; ') || undefined;
    return { value: hit.name, serviceable: hit.status !== 'disabled', note, issue: hit.status === 'coming_soon' ? `${hit.name} is marked "coming soon"` : hit.status === 'disabled' ? `${hit.name} is disabled` : undefined };
  }

  const value = titleCase(CITY_ALIASES[lower] ? titleCase(CITY_ALIASES[lower]) : first);
  return { value, serviceable: false, note: value !== src ? `from "${src}"` : multiNote, issue: `"${value}" is not a serviceable city` };
}

export function normalizeInstagram(raw: string): Normalized<string> {
  const src = (raw ?? '').trim();
  if (!src || /^(na|n\/a|no|none|nil|-|nope|not yet|coming soon)$/i.test(src)) return { value: '' };
  // A post / reel link identifies content, not the profile — flag rather than guess.
  if (/instagram\.com\/(p|reel|reels|stories)\//i.test(src)) {
    return { value: '', issue: 'Instagram link points to a post, not a profile — add the handle manually' };
  }
  // Handles may start/end with '_' — only a trailing '.' is sentence punctuation.
  const clean = (h: string) => h.toLowerCase().replace(/\.+$/, '');
  const url = src.match(/instagram\.com\/@?([A-Za-z0-9._]{2,})/i);
  if (url) return { value: clean(url[1]), note: `from "${src}"` };
  const at = src.match(/@([A-Za-z0-9._]{2,})/);
  if (at) return { value: clean(at[1]), note: src !== `@${at[1]}` ? `from "${src}"` : undefined };
  if (/^[A-Za-z0-9._]{2,}$/.test(src)) return { value: src.toLowerCase(), note: src !== src.toLowerCase() ? `from "${src}"` : undefined };
  if (/https?:\/\//i.test(src) || /whatsapp|facebook|youtube/i.test(src)) return { value: '', issue: `"${src}" is not an Instagram handle — cleared` };
  // Free text like "Jamali rida's" — keep a slugged best-effort guess but flag it.
  const guess = src.toLowerCase().replace(/[^a-z0-9._]+/g, '');
  return { value: guess, note: `guessed from "${src}"`, issue: 'Instagram looks like free text — please verify' };
}

export function normalizeEmail(raw: string): Normalized<string> {
  const src = (raw ?? '').trim().toLowerCase();
  if (!src) return { value: '' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(src)) return { value: src, issue: `"${src}" is not a valid email` };
  return { value: src };
}

export function normalizeGender(raw: string, fallback: Gender): Normalized<Gender> {
  const src = (raw ?? '').trim().toLowerCase();
  if (!src) return { value: fallback };
  if (/^(f|female|woman|women|lady|she)$/.test(src)) return { value: 'female' };
  if (/^(m|male|man|men|he)$/.test(src)) return { value: 'male' };
  if (/^(o|other|non-?binary|nb)$/.test(src)) return { value: 'other' };
  return { value: fallback, issue: `Gender "${raw}" not recognised — using ${fallback}` };
}

export function normalizeBoolean(raw: string): boolean | null {
  const src = (raw ?? '').trim().toLowerCase();
  if (!src) return null;
  if (/^(y|yes|true|1|women led|female)$/.test(src)) return true;
  if (/^(n|no|false|0)$/.test(src)) return false;
  return null;
}

export function normalizePincode(raw: string): Normalized<string> {
  const digits = (raw ?? '').replace(/\D/g, '');
  if (!digits) return { value: '' };
  if (!/^\d{6}$/.test(digits)) return { value: digits, issue: `Pincode "${raw}" should be 6 digits` };
  return { value: digits, note: digits !== raw.trim() ? `from "${raw}"` : undefined };
}

export function normalizeTime(raw: string): Normalized<string> {
  const src = (raw ?? '').trim();
  if (!src) return { value: '' };
  const m = src.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!m) return { value: src, issue: `Time "${src}" not understood (use HH:MM)` };
  let h = parseInt(m[1], 10);
  const min = m[2] ?? '00';
  if (m[3]) { const pm = m[3].toLowerCase() === 'pm'; if (pm && h < 12) h += 12; if (!pm && h === 12) h = 0; }
  if (h > 23 || parseInt(min, 10) > 59) return { value: src, issue: `Time "${src}" is out of range` };
  const value = `${String(h).padStart(2, '0')}:${min}`;
  return { value, note: value !== src ? `from "${src}"` : undefined };
}

// ── Category matching ─────────────────────────────────────────────────────

const STOP = new Set([
  'and', 'the', 'for', 'all', 'your', 'with', 'etc', 'of', 'in', 'by', 'our',
  // Both plural and singular: the stop filter runs on each side of the
  // singulariser, so 'items' can't sneak through as 'item' and then match
  // generic keywords like "household items".
  'items', 'item', 'products', 'product', 'types', 'type', 'things', 'thing',
  'stuff', 'other', 'others', 'misc', 'various',
]);
const singular = (w: string) => (w.endsWith('ies') ? w.slice(0, -3) + 'y' : w.endsWith('s') && w.length > 3 ? w.slice(0, -1) : w);
const keep = (w: string) => w.length >= 3 && !STOP.has(w);
const words = (s: string) =>
  s.toLowerCase().split(/[^a-z0-9]+/).filter(keep).map(singular).filter(keep);

export interface CategoryMatch {
  ids: string[];
  names: string[];
  unmatched: string[];
}

export function matchCategories(raw: string, categories: Category[]): CategoryMatch {
  const src = (raw ?? '').trim();
  if (!src) return { ids: [], names: [], unmatched: [] };
  const tokens = src.split(/\s*(?:,|\/|;|\||&| and |\n)\s*/i).map((t) => t.trim()).filter((t) => t.length >= 3);

  const index = categories.map((c) => ({
    c,
    name: c.name.toLowerCase(),
    nameWords: words(c.name),
    keywordWords: (c.keywords ?? []).flatMap((k) => words(k)),
    keywords: (c.keywords ?? []).map((k) => k.toLowerCase()),
  }));

  const ids: string[] = [];
  const names: string[] = [];
  const unmatched: string[] = [];

  for (const token of tokens) {
    const t = token.toLowerCase();
    const tWords = words(token);
    let best: { c: Category; score: number } | null = null;
    for (const entry of index) {
      let score = 0;
      if (entry.name === t) score = 10;
      else if (entry.keywords.includes(t)) score = 8;
      else if (t.length >= 4 && (entry.name.includes(t) || t.includes(entry.name))) score = 6;
      else {
        const overlap = tWords.filter((w) => entry.nameWords.includes(w)).length;
        const kwOverlap = tWords.filter((w) => entry.keywordWords.includes(w)).length;
        if (overlap > 0) score = 3 + overlap;
        else if (kwOverlap > 0) score = 2 + kwOverlap;
      }
      if (score > 0 && entry.c.parentId) score += 0.5; // prefer the specific sub-category
      if (score > 0 && (!best || score > best.score)) best = { c: entry.c, score };
    }
    if (best && best.score >= 3) {
      if (!ids.includes(best.c.id)) { ids.push(best.c.id); names.push(best.c.name); }
    } else {
      unmatched.push(token);
    }
  }
  return { ids, names, unmatched };
}

// ── Row model ─────────────────────────────────────────────────────────────

export interface RowFields {
  brandName: string;
  userName: string;
  mobile: string;
  whatsapp: string;
  email: string;
  gender: Gender;
  city: string;
  area: string;
  address: string;
  pincode: string;
  instagram: string;
  website: string;
  description: string;
  isWomenLed: boolean;
  providerStatus: 'active' | 'unverified';
  openTime: string;
  closeTime: string;
}

export type RowFieldKey = keyof RowFields;

export interface RowIssue {
  field?: RowFieldKey | 'categories' | 'images' | 'row';
  message: string;
}

export interface ImportRow {
  rowId: string;
  /** 1-based data row number as the operator sees it in the sheet */
  sourceIndex: number;
  raw: Record<string, string>;
  fields: RowFields;
  categoryIds: string[];
  categoryText: string;
  unmatchedCategories: string[];
  extraPhones: string[];
  /** Logo, banner and gallery — from sheet links, a matched folder/ZIP, or attached per row */
  images: RowImages;
  /** Per-field note describing what normalization changed */
  notes: Partial<Record<RowFieldKey | 'categories', string>>;
  /** Issues coming from normalization only (recomputed on rebuild) */
  autoIssues: RowIssue[];
  include: boolean;
  serverCheck?: BulkValidateRowResult;
  importResult?: BulkImportRowResult;
}

export interface BuildDefaults {
  gender: Gender;
  providerStatus: 'active' | 'unverified';
  womenLed: 'auto' | 'yes' | 'no';
  city: string;
}

export interface BuildContext {
  cities: ServiceableCity[];
  categories: Category[];
  defaults: BuildDefaults;
}

export function buildRows(sheet: ParsedSheet, mapping: ColumnMapping, ctx: BuildContext): ImportRow[] {
  const colIndex = (field: TargetField) => {
    const header = mapping[field];
    return header ? sheet.headers.indexOf(header) : -1;
  };
  const idx = Object.fromEntries(TARGET_FIELDS.map((f) => [f.key, colIndex(f.key)])) as Record<TargetField, number>;
  const get = (row: string[], field: TargetField) => (idx[field] >= 0 ? row[idx[field]] ?? '' : '');

  return sheet.rows.map((row, i) => {
    const raw: Record<string, string> = {};
    sheet.headers.forEach((h, j) => { raw[h] = row[j] ?? ''; });

    const notes: ImportRow['notes'] = {};
    const autoIssues: RowIssue[] = [];
    const note = (k: keyof ImportRow['notes'], n?: string) => { if (n) notes[k] = n; };
    const issue = (field: RowIssue['field'], m?: string) => { if (m) autoIssues.push({ field, message: m }); };

    const brandName = get(row, 'brandName').trim();
    let userName = get(row, 'userName').trim();
    if (!userName && brandName) { userName = brandName; note('userName', 'blank — copied from brand name'); }

    const phone = normalizePhone(get(row, 'mobile'));
    note('mobile', phone.note); issue('mobile', phone.issue);

    const altRaw = get(row, 'whatsapp');
    const alt = altRaw ? normalizePhone(altRaw) : null;
    let whatsapp = alt?.value ?? '';
    if (!whatsapp && phone.extras.length) { whatsapp = phone.extras[0]; note('whatsapp', `second number found in mobile column: ${phone.extras.join(', ')}`); }
    else if (alt) { note('whatsapp', alt.note); issue('whatsapp', alt.issue); }
    if (whatsapp && whatsapp === phone.value) whatsapp = '';

    const cityRaw = get(row, 'city') || ctx.defaults.city;
    const city = normalizeCity(cityRaw, ctx.cities);
    note('city', city.note); issue('city', city.issue);

    const email = normalizeEmail(get(row, 'email'));
    issue('email', email.issue);

    const gender = normalizeGender(get(row, 'gender'), ctx.defaults.gender);
    issue('gender', gender.issue);

    const insta = normalizeInstagram(get(row, 'instagram'));
    note('instagram', insta.note); issue('instagram', insta.issue);

    const pincode = normalizePincode(get(row, 'pincode'));
    note('pincode', pincode.note); issue('pincode', pincode.issue);

    const openTime = normalizeTime(get(row, 'openTime'));
    const closeTime = normalizeTime(get(row, 'closeTime'));
    note('openTime', openTime.note); issue('openTime', openTime.issue);
    note('closeTime', closeTime.note); issue('closeTime', closeTime.issue);

    const categoryText = get(row, 'categories').trim();
    const cats = matchCategories(categoryText, ctx.categories);
    if (categoryText && cats.ids.length) note('categories', `matched "${categoryText}" → ${cats.names.join(', ')}`);

    let description = get(row, 'description').trim();
    if (!description && categoryText) {
      description = `Products: ${categoryText}`;
      note('description', 'blank — pre-filled from the category column so nothing is lost');
    }

    const womenLedCol = normalizeBoolean(get(row, 'isWomenLed'));
    const isWomenLed = ctx.defaults.womenLed === 'yes' ? true : ctx.defaults.womenLed === 'no' ? false : (womenLedCol ?? gender.value === 'female');

    const website = get(row, 'website').trim();

    const linked = imagesFromLinks(get(row, 'logoUrl'), get(row, 'bannerUrl'), get(row, 'galleryUrls'));
    autoIssues.push(...linked.issues);

    return {
      rowId: `r${i + 1}`,
      sourceIndex: i + 1,
      raw,
      fields: {
        brandName,
        userName,
        mobile: phone.value,
        whatsapp,
        email: email.value,
        gender: gender.value,
        city: city.value,
        area: get(row, 'area').trim(),
        address: get(row, 'address').trim(),
        pincode: pincode.value,
        instagram: insta.value,
        website: website && !/^https?:\/\//i.test(website) && website.includes('.') ? `https://${website}` : website,
        description,
        isWomenLed,
        providerStatus: ctx.defaults.providerStatus,
        openTime: openTime.value,
        closeTime: closeTime.value,
      },
      categoryIds: cats.ids,
      categoryText,
      unmatchedCategories: cats.unmatched,
      extraPhones: phone.extras,
      images: linked.images,
      notes,
      autoIssues,
      include: true,
    };
  });
}

// ── Validation (client side, re-run on every edit) ─────────────────────────

export interface RowValidation {
  errors: RowIssue[];
  warnings: RowIssue[];
  status: 'ready' | 'warning' | 'error' | 'excluded' | 'imported' | 'failed';
}

export function validateRows(rows: ImportRow[], cities: ServiceableCity[]): Map<string, RowValidation> {
  const out = new Map<string, RowValidation>();
  const firstByMobile = new Map<string, ImportRow>();
  const firstByBrandCity = new Map<string, ImportRow>();
  const serviceable = new Set(cities.filter((c) => c.status !== 'disabled').map((c) => c.name.toLowerCase()));

  for (const row of rows) {
    const errors: RowIssue[] = [];
    const warnings: RowIssue[] = [];
    const f = row.fields;

    if (!f.brandName.trim()) errors.push({ field: 'brandName', message: 'Brand name is required' });
    if (!f.userName.trim()) errors.push({ field: 'userName', message: 'Owner name is required' });
    if (!/^[6-9]\d{9}$/.test(f.mobile)) errors.push({ field: 'mobile', message: f.mobile ? 'Mobile must be a 10-digit Indian number' : 'Mobile number is required' });
    if (f.whatsapp && !/^[6-9]\d{9}$/.test(f.whatsapp)) errors.push({ field: 'whatsapp', message: 'Alternate WhatsApp must be 10 digits' });
    if (!f.city.trim()) errors.push({ field: 'city', message: 'City is required' });
    else if (!serviceable.has(f.city.trim().toLowerCase())) warnings.push({ field: 'city', message: `"${f.city}" is not a serviceable city` });
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) errors.push({ field: 'email', message: 'Invalid email' });
    if (f.pincode && !/^\d{6}$/.test(f.pincode)) errors.push({ field: 'pincode', message: 'Pincode must be 6 digits' });
    if (f.brandName.length > 150) errors.push({ field: 'brandName', message: 'Brand name is over 150 characters' });
    if (f.userName.length > 100) errors.push({ field: 'userName', message: 'Owner name is over 100 characters' });
    if (row.categoryIds.length === 0) warnings.push({ field: 'categories', message: row.categoryText ? `No category matched "${row.categoryText}"` : 'No category assigned' });
    else if (row.unmatchedCategories.length) warnings.push({ field: 'categories', message: `Unmatched: ${row.unmatchedCategories.join(', ')}` });

    // Normalization issues that aren't already covered above
    for (const a of row.autoIssues) {
      const covered = errors.some((e) => e.field === a.field) || warnings.some((w) => w.field === a.field);
      if (!covered) (a.field === 'mobile' || a.field === 'email' ? errors : warnings).push(a);
    }

    // Duplicates inside the sheet
    if (/^[6-9]\d{9}$/.test(f.mobile)) {
      const first = firstByMobile.get(f.mobile);
      if (first && first.rowId !== row.rowId && first.include) errors.push({ field: 'mobile', message: `Duplicate of row ${first.sourceIndex} (same mobile)` });
      else if (!first && row.include) firstByMobile.set(f.mobile, row);
    }
    const bk = `${f.brandName.trim().toLowerCase()}|${f.city.trim().toLowerCase()}`;
    if (f.brandName.trim()) {
      const first = firstByBrandCity.get(bk);
      if (first && first.rowId !== row.rowId && first.include) warnings.push({ field: 'brandName', message: `Same brand + city as row ${first.sourceIndex}` });
      else if (!first && row.include) firstByBrandCity.set(bk, row);
    }

    // Server dry-run
    if (row.serverCheck) {
      for (const e of row.serverCheck.errors) errors.push({ field: 'row', message: e });
      for (const w of row.serverCheck.warnings) warnings.push({ field: 'row', message: w });
    }

    let status: RowValidation['status'] = errors.length ? 'error' : warnings.length ? 'warning' : 'ready';
    if (row.importResult) status = row.importResult.ok ? 'imported' : 'failed';
    else if (!row.include) status = 'excluded';
    out.set(row.rowId, { errors, warnings, status });
  }
  return out;
}

// ── Database check status ─────────────────────────────────────────────────

/** Outcome of "Check against database" for one row, most serious first. */
export type DbStatus = 'unchecked' | 'new' | 'reuses_user' | 'existing_provider' | 'contact_in_use' | 'brand_exists';

export function getDbStatus(row: ImportRow): DbStatus {
  const c = row.serverCheck;
  if (!c) return 'unchecked';
  if (c.existingProvider) return 'existing_provider';
  if (c.contactNumberOwner) return 'contact_in_use';
  if (c.brandNameClash) return 'brand_exists';
  if (c.existingUser) return 'reuses_user';
  return 'new';
}

/**
 * The database already has this business: the owner already runs a listing,
 * the phone number is on another listing, or the same brand exists in the city.
 * A login that merely gets reused is NOT a duplicate — it's a new business.
 */
export function isDbDuplicate(row: ImportRow): boolean {
  const s = getDbStatus(row);
  return s === 'existing_provider' || s === 'contact_in_use' || s === 'brand_exists';
}

// ── Payload ───────────────────────────────────────────────────────────────

export function toPayload(row: ImportRow): BulkProviderRowPayload {
  const f = row.fields;
  const opt = (v: string) => (v.trim() ? v.trim() : undefined);
  return {
    rowId: row.rowId,
    userMobileNumber: f.mobile,
    userName: f.userName.trim(),
    userGender: f.gender,
    userEmail: opt(f.email),
    brandName: f.brandName.trim(),
    description: opt(f.description),
    address: opt(f.address),
    city: f.city.trim(),
    area: opt(f.area),
    pincode: opt(f.pincode),
    contactNumber: `+91${f.mobile}`,
    whatsappNumber: f.whatsapp ? `+91${f.whatsapp}` : undefined,
    instagramHandle: opt(f.instagram),
    websiteUrl: opt(f.website),
    openTime: opt(f.openTime),
    closeTime: opt(f.closeTime),
    isWomenLed: f.isWomenLed,
    categoryIds: row.categoryIds.length ? row.categoryIds : undefined,
    providerStatus: f.providerStatus,
    syncLocation: true,
    skipUserOtp: true,
    skipBusinessOtp: true,
  };
}

// ── CSV helpers ───────────────────────────────────────────────────────────

const csvCell = (v: unknown) => {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(rows: unknown[][]): string {
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv;charset=utf-8') {
  const blob = new Blob(['﻿' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function templateCsv(): string {
  return toCsv([
    ['Brand Name', 'Full Name', 'WhatsApp Number', 'City', 'Area', 'Product Category', 'Instagram', 'Email', 'Gender', 'Address', 'Pincode', 'Description', 'Website', 'Women Led', 'Logo Link', 'Banner Link', 'Gallery Links'],
    ['Pehnawa Ridas', 'Zainab Ujjainwala', '8329904280', 'Mumbai', 'Bhendi Bazaar', 'Ridas, Jhabla Izar', 'pehnawaridas', '', 'female', '', '400003', 'Designer ridas and jhabla izar sets', '', 'yes', '', '', ''],
  ]);
}

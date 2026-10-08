import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Pause, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';
import { PageHeader } from '../components/ui/PageHeader';
import { DetailPanel } from '../components/ui/DetailPanel';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FormField } from '../components/ui/FormField';
import { ROUTES } from '../utils/constants';
import { useCategoryTree } from '../hooks/useCategories';
import {
  useCreateHomeCollection,
  useDeleteHomeCollection,
  useHomeCollections,
  useReorderHomeCollections,
  useUpdateHomeCollection,
} from '../hooks/useHomeCollections';
import type { CollectionIllustration, CollectionTheme, CollectionType, HomeCollection, HomeCollectionInput } from '../services/homeCollections.service';
import type { Category } from '../types/category';

/** Same palette as the app's cards. */
const THEMES: { value: CollectionTheme; label: string; from: string; to: string }[] = [
  { value: 'sky', label: 'Sky', from: '#0ea5e9', to: '#14b8a6' },
  { value: 'amber', label: 'Amber', from: '#fbbf24', to: '#f97316' },
  { value: 'rose', label: 'Rose', from: '#f43f5e', to: '#d946ef' },
  { value: 'violet', label: 'Violet', from: '#8b5cf6', to: '#d946ef' },
  { value: 'emerald', label: 'Emerald', from: '#10b981', to: '#0891b2' },
  { value: 'orange', label: 'Orange', from: '#fb923c', to: '#f43f5e' },
  { value: 'indigo', label: 'Indigo', from: '#6366f1', to: '#0ea5e9' },
  { value: 'teal', label: 'Teal', from: '#14b8a6', to: '#22c55e' },
];
const themeOf = (t: string) => THEMES.find((x) => x.value === t) ?? THEMES[1];

/** The app draws these on the banner (see customer-app need-illustrations). */
const ILLUSTRATIONS: { value: CollectionIllustration; emoji: string; label: string }[] = [
  { value: 'home-repair', emoji: '🔧', label: 'Home repair' },
  { value: 'appliances', emoji: '💡', label: 'Appliances' },
  { value: 'fashion', emoji: '👗', label: 'Fashion & ridas' },
  { value: 'wedding', emoji: '💍', label: 'Wedding' },
  { value: 'sweets', emoji: '🍬', label: 'Sweets' },
  { value: 'travel', emoji: '🕋', label: 'Hajj & travel' },
  { value: 'gifts', emoji: '🎁', label: 'Gifts' },
  { value: 'shopping', emoji: '🛍️', label: 'Shopping' },
];
const artOf = (v: string) => ILLUSTRATIONS.find((i) => i.value === v) ?? ILLUSTRATIONS[7];

const TYPES: { value: CollectionType; label: string }[] = [
  { value: 'all', label: 'Products & services' },
  { value: 'product', label: 'Products only' },
  { value: 'service', label: 'Services only' },
];

const empty: HomeCollectionInput = {
  title: '',
  subtitle: '',
  theme: 'amber',
  illustration: 'shopping',
  listingType: 'all',
  categoryIds: [],
  imageUrl: null,
  isActive: true,
  startsAt: null,
  endsAt: null,
};

const inputStyle = { background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' };
const toLocalInput = (iso: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : '');
const statusOf = (c: HomeCollection) => {
  const now = new Date();
  if (!c.isActive) return { label: 'Paused', color: 'var(--text-muted)' };
  if (c.startsAt && new Date(c.startsAt) > now) return { label: 'Scheduled', color: 'var(--color-warning, #d97706)' };
  if (c.endsAt && new Date(c.endsAt) < now) return { label: 'Ended', color: 'var(--text-muted)' };
  if (c.itemCount === 0) return { label: 'Hidden — nothing listed yet', color: 'var(--color-warning, #d97706)' };
  return { label: 'Live', color: 'var(--color-success, #16a34a)' };
};

/** Pick categories (any level) from the tree, with search. */
function CategoryPicker({ tree, value, onChange }: { tree: Category[]; value: string[]; onChange: (ids: string[]) => void }) {
  const [q, setQ] = useState('');
  const selected = new Set(value);
  const toggle = (id: string) => onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);
  const match = (c: Category) => !q || c.name.toLowerCase().includes(q.toLowerCase());
  const byId = useMemo(() => {
    const m = new Map<string, Category>();
    for (const p of tree) {
      m.set(p.id, p);
      for (const ch of p.children ?? []) m.set(ch.id, ch);
    }
    return m;
  }, [tree]);

  return (
    <div className="space-y-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full"
              style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
              title="Remove"
            >
              {byId.get(id)?.name ?? 'Unknown'} ✕
            </button>
          ))}
        </div>
      )}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search categories…" className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border" style={inputStyle} />
      </div>
      <div className="max-h-72 overflow-y-auto rounded-lg border divide-y" style={{ borderColor: 'var(--border-default)' }}>
        {tree
          .filter((p) => match(p) || (p.children ?? []).some(match))
          .map((p) => (
            <div key={p.id} className="py-1">
              <label className="flex items-center gap-2 px-3 py-1.5 cursor-pointer text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} />
                {p.name}
                <span className="text-[10px] font-normal" style={{ color: 'var(--text-muted)' }}>includes all below</span>
              </label>
              {(p.children ?? [])
                .filter((ch) => !q || match(ch) || match(p))
                .map((ch) => (
                  <label key={ch.id} className="flex items-center gap-2 pl-8 pr-3 py-1 cursor-pointer text-sm" style={{ color: 'var(--text-secondary)' }}>
                    <input type="checkbox" checked={selected.has(ch.id) || selected.has(p.id)} disabled={selected.has(p.id)} onChange={() => toggle(ch.id)} />
                    {ch.name}
                  </label>
                ))}
            </div>
          ))}
      </div>
    </div>
  );
}

/** How the card looks in the app (roughly). */
/** Roughly how the banner looks in the app. */
function Preview({ c }: { c: Pick<HomeCollection, 'title' | 'subtitle' | 'theme' | 'illustration' | 'itemCount'> }) {
  const t = themeOf(c.theme);
  const art = artOf(c.illustration);
  return (
    <div className="relative rounded-2xl p-3 w-60 h-28 shrink-0 overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}>
      <span className="absolute right-2 bottom-1 text-5xl leading-none drop-shadow">{art.emoji}</span>
      <span className="inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase" style={{ background: 'rgba(255,255,255,0.25)' }}>
        {c.itemCount} listed
      </span>
      <p className="mt-1 text-sm font-extrabold leading-tight line-clamp-2 w-36">{c.title || 'Title'}</p>
      {c.subtitle && <p className="text-[10px] mt-0.5 line-clamp-2 w-36 opacity-90">{c.subtitle}</p>}
    </div>
  );
}

export default function HomeCollections() {
  const { data: collections = [], isLoading } = useHomeCollections();
  const { data: tree = [] } = useCategoryTree();
  const create = useCreateHomeCollection();
  const update = useUpdateHomeCollection();
  const remove = useDeleteHomeCollection();
  const reorder = useReorderHomeCollections();

  const [editing, setEditing] = useState<HomeCollection | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<HomeCollectionInput>(empty);
  const [confirmDelete, setConfirmDelete] = useState<HomeCollection | null>(null);

  const openCreate = () => {
    setForm(empty);
    setEditing(null);
    setCreating(true);
  };
  const openEdit = (c: HomeCollection) => {
    setForm({
      title: c.title,
      subtitle: c.subtitle ?? '',
      theme: c.theme,
      illustration: c.illustration ?? 'shopping',
      listingType: c.listingType,
      categoryIds: c.categoryIds,
      imageUrl: c.imageUrl,
      isActive: c.isActive,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
    });
    setEditing(c);
    setCreating(false);
  };
  const close = () => {
    setEditing(null);
    setCreating(false);
  };

  const save = async () => {
    if (form.title.trim().length < 2) return void toast.error('Give it a title');
    if (form.categoryIds.length === 0) return void toast.error('Pick at least one category');
    const body: HomeCollectionInput = {
      ...form,
      title: form.title.trim(),
      subtitle: form.subtitle?.trim() || null,
      imageUrl: form.imageUrl?.trim() || null,
    };
    try {
      if (editing) await update.mutateAsync({ id: editing.id, body });
      else await create.mutateAsync(body);
      toast.success(editing ? 'Saved' : 'Collection added');
      close();
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string | string[] } } })?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || 'Could not save');
    }
  };

  const move = (i: number, d: -1 | 1) => {
    const ids = collections.map((c) => c.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    reorder.mutate(ids);
  };

  const toggleActive = (c: HomeCollection) =>
    update.mutate(
      { id: c.id, body: { isActive: !c.isActive } },
      { onSuccess: () => toast.success(c.isActive ? 'Paused' : 'Live again') },
    );

  const set = <K extends keyof HomeCollectionInput>(k: K, v: HomeCollectionInput[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home needs"
        description='The "What do you need today?" cards on the app home. Each gathers every product and service from the categories you pick.'
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Home needs' }]}
        actions={
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg" style={{ background: 'var(--color-primary)' }}>
            <Plus className="w-4 h-4" /> New collection
          </button>
        }
      />

      {isLoading ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : collections.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ background: 'var(--surface-1)' }}>
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>No collections yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>Add one like “Get your home fixed” and pick the categories it covers.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {collections.map((c, i) => {
            const st = statusOf(c);
            return (
              <div key={c.id} className="flex gap-4 items-center p-3 rounded-xl border" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', opacity: c.isActive ? 1 : 0.65 }}>
                <div className="flex flex-col gap-1">
                  <button onClick={() => move(i, -1)} disabled={i === 0 || reorder.isPending} className="p-1 rounded disabled:opacity-30" title="Move up" style={{ background: 'var(--surface-2)' }}>
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === collections.length - 1 || reorder.isPending} className="p-1 rounded disabled:opacity-30" title="Move down" style={{ background: 'var(--surface-2)' }}>
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
                <Preview c={c} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{c.title}</p>
                  {c.subtitle && <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>{c.subtitle}</p>}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    <span style={{ color: st.color, fontWeight: 600 }}>● {st.label}</span>
                    <span>{c.itemCount} listed</span>
                    <span>{TYPES.find((t) => t.value === c.listingType)?.label}</span>
                    <span>{c.categoryIds.length} {c.categoryIds.length === 1 ? 'category' : 'categories'}</span>
                    {(c.startsAt || c.endsAt) && (
                      <span>
                        {c.startsAt ? new Date(c.startsAt).toLocaleDateString('en-IN') : '…'} → {c.endsAt ? new Date(c.endsAt).toLocaleDateString('en-IN') : '…'}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => toggleActive(c)} className="p-2 rounded-lg" title={c.isActive ? 'Pause' : 'Make live'} style={{ background: 'var(--surface-2)' }}>
                    {c.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(c)} className="p-2 rounded-lg" title="Edit" style={{ background: 'var(--surface-2)' }}>
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setConfirmDelete(c)} className="p-2 rounded-lg text-white" title="Delete" style={{ background: 'var(--color-danger)' }}>
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <DetailPanel
        open={creating || !!editing}
        onClose={close}
        title={editing ? 'Edit collection' : 'New collection'}
        subtitle={editing?.title}
        width="560px"
        actions={
          <button
            onClick={save}
            disabled={create.isPending || update.isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}
          >
            <Check className="w-4 h-4" />
            {create.isPending || update.isPending ? 'Saving…' : 'Save'}
          </button>
        }
      >
        <div className="space-y-5">
          <FormField label="Title" required description='Short and about a need, e.g. "Get your home fixed".'>
            <input value={form.title} maxLength={80} onChange={(e) => set('title', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border" style={inputStyle} />
          </FormField>
          <FormField label="Subtitle" description="One line on what's inside.">
            <input value={form.subtitle ?? ''} maxLength={160} onChange={(e) => set('subtitle', e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg border" style={inputStyle} />
          </FormField>
          <FormField label="Categories" required description="A parent category includes everything under it.">
            <CategoryPicker tree={tree} value={form.categoryIds} onChange={(ids) => set('categoryIds', ids)} />
          </FormField>
          <FormField label="Shows">
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-2)' }}>
              {TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set('listingType', t.value)}
                  className="flex-1 px-2 py-1.5 text-xs font-medium rounded-md"
                  style={{
                    background: form.listingType === t.value ? 'var(--surface-0)' : 'transparent',
                    color: form.listingType === t.value ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: form.listingType === t.value ? 'var(--shadow-sm)' : 'none',
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Colour">
            <div className="flex flex-wrap gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => set('theme', t.value)}
                  title={t.label}
                  className="w-9 h-9 rounded-full flex items-center justify-center"
                  style={{ background: `linear-gradient(135deg, ${t.from}, ${t.to})`, outline: form.theme === t.value ? '3px solid var(--text-primary)' : 'none', outlineOffset: 2 }}
                >
                  {form.theme === t.value && <Check className="w-4 h-4 text-white" />}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Illustration" description="Drawn on the banner in the app.">
            <div className="grid grid-cols-4 gap-2">
              {ILLUSTRATIONS.map((i) => (
                <button
                  key={i.value}
                  type="button"
                  onClick={() => set('illustration', i.value)}
                  className="flex flex-col items-center gap-1 px-2 py-2.5 rounded-lg border text-xs font-medium"
                  style={{
                    borderColor: form.illustration === i.value ? 'var(--color-primary)' : 'var(--border-default)',
                    background: form.illustration === i.value ? 'var(--color-primary-light)' : 'var(--surface-0)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <span className="text-xl leading-none">{i.emoji}</span>
                  {i.label}
                </button>
              ))}
            </div>
          </FormField>
          <FormField label="Cover photo URL" description="Optional. Without one, the card shows real photos from what's listed.">
            <input value={form.imageUrl ?? ''} onChange={(e) => set('imageUrl', e.target.value)} placeholder="https://…" className="w-full px-3 py-2 text-sm rounded-lg border" style={inputStyle} />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Starts" description="Optional — for seasonal ones.">
              <input type="date" value={toLocalInput(form.startsAt)} onChange={(e) => set('startsAt', e.target.value ? new Date(e.target.value).toISOString() : null)} className="w-full px-3 py-2 text-sm rounded-lg border" style={inputStyle} />
            </FormField>
            <FormField label="Ends">
              <input type="date" value={toLocalInput(form.endsAt)} onChange={(e) => set('endsAt', e.target.value ? new Date(`${e.target.value}T23:59:59`).toISOString() : null)} className="w-full px-3 py-2 text-sm rounded-lg border" style={inputStyle} />
            </FormField>
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: 'var(--text-primary)' }}>
            <input type="checkbox" checked={form.isActive} onChange={(e) => set('isActive', e.target.checked)} />
            Live on the app
          </label>
          <div>
            <p className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>PREVIEW</p>
            <Preview c={{ title: form.title, subtitle: form.subtitle, theme: form.theme, illustration: form.illustration, itemCount: editing?.itemCount ?? 0 }} />
          </div>
        </div>
      </DetailPanel>

      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          try {
            await remove.mutateAsync(confirmDelete.id);
            toast.success('Deleted');
          } catch {
            toast.error('Could not delete');
          }
          setConfirmDelete(null);
        }}
        title="Delete this collection?"
        description={`“${confirmDelete?.title}” will disappear from the app home. To hide it for now, pause it instead.`}
        confirmLabel="Delete"
        variant="danger"
        isLoading={remove.isPending}
      />
    </div>
  );
}

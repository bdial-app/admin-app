import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, FileText, History, Info, PencilLine, RotateCcw, Save, Send, Trash2, Users } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import LegalMarkdown from '../components/legal/LegalMarkdown';
import {
  useDiscardLegalDraft,
  useLegalDocument,
  useLegalDocuments,
  usePublishLegal,
  useSaveLegalDraft,
} from '../hooks/useLegal';
import { ROUTES } from '../utils/constants';
import type { LegalDocumentDetail, LegalRequiredFor } from '../types/legal';

const REQUIRED_FOR: { value: LegalRequiredFor; label: string; hint: string }[] = [
  { value: 'everyone', label: 'Everyone must accept', hint: 'Every signed-in user ticks to accept it.' },
  { value: 'business', label: 'Business owners must accept', hint: 'Owners tick it when listing, or on their next visit.' },
  { value: 'none', label: 'Read only', hint: 'Shown in the app; nobody is asked to tick it.' },
];

const requiredLabel = (r: LegalRequiredFor) => REQUIRED_FOR.find((x) => x.value === r)?.label ?? r;

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

interface Form {
  title: string;
  summary: string;
  content: string;
  requiredFor: LegalRequiredFor;
  changeNote: string;
  requiresAcceptance: boolean;
}

/** The form starts from the draft if there is one, else the live version. */
const formFrom = (d: LegalDocumentDetail): Form => ({
  title: d.draft?.title ?? d.title,
  summary: d.draft?.summary ?? d.summary,
  content: d.draft?.content ?? d.versions[0]?.content ?? '',
  requiredFor: d.requiredFor,
  changeNote: '',
  requiresAcceptance: false,
});

const card = { background: 'var(--surface-0)', borderColor: 'var(--border-default)' };
const inputStyle = { background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' };

export default function Legal() {
  const [params, setParams] = useSearchParams();
  const { data: docs, isLoading } = useLegalDocuments();
  const slug = params.get('doc') ?? docs?.[0]?.slug ?? null;
  const { data: doc, isLoading: docLoading } = useLegalDocument(slug);

  // Edits and the opened version belong to one document; another document starts clean.
  const [editsFor, setEditsFor] = useState<{ slug: string | null; form: Form } | null>(null);
  const edits = editsFor && editsFor.slug === slug ? editsFor.form : null;
  const setEdits = (next: Form | null | ((prev: Form | null) => Form)) =>
    setEditsFor((cur) => {
      const prev = cur && cur.slug === slug ? cur.form : null;
      const form = typeof next === 'function' ? next(prev) : next;
      return form ? { slug, form } : null;
    });
  const [tab, setTab] = useState<'edit' | 'preview'>('edit');
  const [viewingFor, setViewingFor] = useState<{ slug: string | null; version: number } | null>(null);
  const viewing = viewingFor && viewingFor.slug === slug ? viewingFor.version : null;
  const setViewing = (version: number | null) => setViewingFor(version === null ? null : { slug, version });
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const saveDraft = useSaveLegalDraft(slug ?? '');
  const discardDraft = useDiscardLegalDraft(slug ?? '');
  const publish = usePublishLegal(slug ?? '');

  const base = useMemo(() => (doc ? formFrom(doc) : null), [doc]);
  const form = edits ?? base;
  const live = doc?.versions[0];
  const dirty = !!edits && !!base && JSON.stringify({ ...edits, changeNote: '', requiresAcceptance: false }) !== JSON.stringify({ ...base, changeNote: '', requiresAcceptance: false });
  const changedFromLive =
    !!form && !!live && (form.content !== live.content || form.title !== live.title || form.summary !== doc?.summary || form.requiredFor !== doc?.requiredFor);
  const empty = !form?.content.trim() || !form?.title.trim();
  const busy = saveDraft.isPending || discardDraft.isPending || publish.isPending;
  const nextVersion = (live?.version ?? 0) + 1;

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setEdits((e) => ({ ...(e ?? base!), [k]: v }));

  const pick = (next: string) => {
    if (next === slug) return;
    if (dirty && !window.confirm('You have unsaved changes. Leave without saving?')) return;
    setParams({ doc: next });
  };

  const onSaveDraft = () => {
    if (!form) return;
    saveDraft.mutate({ title: form.title, summary: form.summary, content: form.content }, { onSuccess: () => setEdits(null) });
  };

  const onPublish = () => {
    if (!form) return;
    publish.mutate(
      {
        title: form.title,
        summary: form.summary,
        content: form.content,
        changeNote: form.changeNote,
        requiresAcceptance: form.requiredFor !== 'none' && form.requiresAcceptance,
        requiredFor: form.requiredFor,
      },
      {
        onSuccess: () => {
          setEdits(null);
          setConfirmPublish(false);
          setTab('edit');
        },
      },
    );
  };

  const viewed = viewing !== null ? doc?.versions.find((v) => v.version === viewing) : null;
  const asksAgain = !!form && form.requiredFor !== 'none' && form.requiresAcceptance;

  return (
    <div>
      <PageHeader
        title="Legal Documents"
        description="The terms and policies people read and accept in the app. Only super admins can edit them."
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Legal Documents' }]}
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[300px_1fr] gap-5">
          {/* ── Documents ── */}
          <div className="space-y-2">
            {(docs ?? []).map((d) => {
              const active = d.slug === slug;
              return (
                <button
                  key={d.slug}
                  onClick={() => pick(d.slug)}
                  className="w-full text-left p-3.5 rounded-xl border transition-colors"
                  style={{
                    ...card,
                    borderColor: active ? 'var(--color-primary)' : 'var(--border-default)',
                    boxShadow: active ? '0 0 0 1px var(--color-primary)' : undefined,
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    <FileText className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: active ? 'var(--color-primary)' : 'var(--text-muted)' }} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{d.title}</p>
                        {d.hasDraft && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Draft</span>
                        )}
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        v{d.version} · {fmtDate(d.publishedAt)}
                      </p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                        {requiredLabel(d.requiredFor)}
                        {d.requiredFor !== 'none' && ` · ${d.acceptedCurrent.toLocaleString('en-IN')} accepted v${d.version}`}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })}
            <div className="flex gap-2 p-3 rounded-xl border text-xs" style={{ ...card, color: 'var(--text-muted)' }}>
              <Info className="w-4 h-4 flex-shrink-0" />
              <p>
                Owners added by bulk upload or by our team are asked to accept the terms when they first sign in. Each
                acceptance is recorded with its version, time and device.
              </p>
            </div>
          </div>

          {/* ── Editor ── */}
          {docLoading || !doc || !form ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
            </div>
          ) : (
            <div className="space-y-5 min-w-0">
              <div className="p-5 rounded-xl border space-y-4" style={card}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{doc.title}</h2>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      Live: version {live?.version ?? '—'}, published {fmtDate(live?.publishedAt)}
                      {doc.draft && <> · Draft saved {fmtDate(doc.draft.updatedAt)}</>}
                      {dirty && <span className="text-amber-600"> · Unsaved changes</span>}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(doc.draft || dirty) && (
                      <button
                        onClick={() => (doc.draft ? setConfirmDiscard(true) : setEdits(null))}
                        disabled={busy}
                        className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border disabled:opacity-50"
                        style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}
                      >
                        <Trash2 className="w-4 h-4" /> {doc.draft ? 'Discard draft' : 'Undo changes'}
                      </button>
                    )}
                    <button
                      onClick={onSaveDraft}
                      disabled={busy || !dirty || empty}
                      className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border disabled:opacity-50"
                      style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                    >
                      <Save className="w-4 h-4" /> {saveDraft.isPending ? 'Saving…' : 'Save draft'}
                    </button>
                    <button
                      onClick={() => setConfirmPublish(true)}
                      disabled={busy || empty || !changedFromLive}
                      title={!changedFromLive ? 'Nothing has changed from the live version' : undefined}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
                      style={{ background: 'var(--color-primary)' }}
                    >
                      <Send className="w-4 h-4" /> Publish v{nextVersion}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Title</span>
                    <input
                      value={form.title}
                      onChange={(e) => set('title', e.target.value)}
                      maxLength={120}
                      className="mt-1 w-full px-3 py-2 text-sm rounded-lg border"
                      style={inputStyle}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Who must accept</span>
                    <select
                      value={form.requiredFor}
                      onChange={(e) => set('requiredFor', e.target.value as LegalRequiredFor)}
                      className="mt-1 w-full px-3 py-2 text-sm rounded-lg border"
                      style={inputStyle}
                    >
                      {REQUIRED_FOR.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                    <span className="text-[11px] mt-1 block" style={{ color: 'var(--text-muted)' }}>
                      {REQUIRED_FOR.find((r) => r.value === form.requiredFor)?.hint}
                    </span>
                  </label>
                </div>
                <label className="block">
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                    Summary <span className="font-normal">— one line shown where people are asked to accept</span>
                  </span>
                  <input
                    value={form.summary}
                    onChange={(e) => set('summary', e.target.value)}
                    maxLength={300}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border"
                    style={inputStyle}
                  />
                </label>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: 'var(--border-default)' }}>
                      {(['edit', 'preview'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => setTab(t)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md"
                          style={tab === t ? { background: 'var(--color-primary)', color: '#fff' } : { color: 'var(--text-muted)' }}
                        >
                          {t === 'edit' ? <PencilLine className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          {t === 'edit' ? 'Edit' : 'Preview'}
                        </button>
                      ))}
                    </div>
                    <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                      {form.content.length.toLocaleString('en-IN')} characters
                    </span>
                  </div>
                  {tab === 'edit' ? (
                    <>
                      <textarea
                        value={form.content}
                        onChange={(e) => set('content', e.target.value)}
                        spellCheck
                        className="w-full min-h-[520px] px-4 py-3 text-[13px] leading-relaxed rounded-lg border font-mono"
                        style={inputStyle}
                      />
                      <p className="text-[11px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
                        <code>## Heading</code> · <code>### Smaller heading</code> · <code>- bullet</code> · <code>1. numbered</code> ·{' '}
                        <code>&gt; highlighted note</code> · <code>**bold**</code> · <code>[link text](/legal?doc=privacy)</code>. Leave a
                        blank line between paragraphs.
                      </p>
                    </>
                  ) : (
                    <div className="rounded-lg border px-5 py-4 max-h-[640px] overflow-y-auto" style={{ borderColor: 'var(--border-default)' }}>
                      <LegalMarkdown content={form.content} />
                    </div>
                  )}
                </div>
              </div>

              {/* ── History ── */}
              <div className="p-5 rounded-xl border" style={card}>
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Version history</h3>
                </div>
                <div className="divide-y" style={{ borderColor: 'var(--border-default)' }}>
                  {doc.versions.map((v, i) => (
                    <div key={v.version} className="py-3 flex flex-wrap items-center gap-3" style={{ borderColor: 'var(--border-default)' }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          Version {v.version}
                          {i === 0 && <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Live</span>}
                          {v.requiresAcceptance && (
                            <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700">Asked everyone</span>
                          )}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {fmtDate(v.publishedAt)}
                          {v.changeNote && <> · {v.changeNote}</>}
                        </p>
                      </div>
                      <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <Users className="w-3.5 h-3.5" /> {v.accepted.toLocaleString('en-IN')} accepted
                      </span>
                      <button
                        onClick={() => setViewing(viewing === v.version ? null : v.version)}
                        className="text-xs font-medium px-2.5 py-1 rounded-md border"
                        style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                      >
                        {viewing === v.version ? 'Hide' : 'View'}
                      </button>
                      {i > 0 && (
                        <button
                          onClick={() => {
                            setEdits({ ...form, title: v.title, content: v.content });
                            setTab('edit');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-md border"
                          style={{ borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
                        >
                          <RotateCcw className="w-3 h-3" /> Copy into editor
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {viewed && (
                  <div className="mt-3 rounded-lg border px-5 py-4 max-h-[480px] overflow-y-auto" style={{ borderColor: 'var(--border-default)' }}>
                    <p className="text-xs font-semibold mb-3" style={{ color: 'var(--text-muted)' }}>
                      {viewed.title} — version {viewed.version}
                    </p>
                    <LegalMarkdown content={viewed.content} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmPublish}
        onClose={() => setConfirmPublish(false)}
        onConfirm={onPublish}
        title={`Publish ${form?.title ?? ''} v${nextVersion}?`}
        confirmLabel={asksAgain ? 'Publish and ask everyone' : 'Publish'}
        variant={asksAgain ? 'warning' : 'default'}
        isLoading={publish.isPending}
      >
        {form && (
          <div className="space-y-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <p>It goes live in the app immediately. Earlier versions stay in the history.</p>
            <label className="block">
              <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>What changed (shown to people asked to accept)</span>
              <input
                value={form.changeNote}
                onChange={(e) => set('changeNote', e.target.value)}
                maxLength={300}
                placeholder="e.g. Clearer refund timelines"
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border"
                style={inputStyle}
              />
            </label>
            {form.requiredFor !== 'none' ? (
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.requiresAcceptance}
                  onChange={(e) => set('requiresAcceptance', e.target.checked)}
                  className="mt-1"
                />
                <span>
                  <strong style={{ color: 'var(--text-primary)' }}>Ask everyone to accept this version again</strong>
                  <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                    For important changes. {form.requiredFor === 'business' ? 'Every business owner' : 'Everyone signed in'} will see
                    a screen asking them to accept before they can continue. Leave it off for typo fixes and small wording changes:
                    new users still accept the latest version.
                  </span>
                </span>
              </label>
            ) : (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>This document is read only, so nobody is asked to accept it.</p>
            )}
            {form.requiredFor !== doc?.requiredFor && (
              <p className="text-xs text-amber-600">
                Changing who must accept to “{requiredLabel(form.requiredFor)}”
                {form.requiredFor !== 'none' && ' means everyone it applies to who hasn’t accepted it will be asked'}.
              </p>
            )}
          </div>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmDiscard}
        onClose={() => setConfirmDiscard(false)}
        onConfirm={() => discardDraft.mutate(undefined, { onSuccess: () => { setEdits(null); setConfirmDiscard(false); } })}
        title="Discard the draft?"
        description="Your unpublished edits will be lost. The live version doesn't change."
        confirmLabel="Discard"
        variant="danger"
        isLoading={discardDraft.isPending}
      />
    </div>
  );
}

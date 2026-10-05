import { useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Save, Send, Trash2, Copy, Loader2, Plus, X, Lock, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'react-toastify';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import { FormField } from '../../components/ui/FormField';
import { useHasPermission } from '../../hooks/usePermissions';
import { useWaTemplate, useCreateWaTemplate, useUpdateWaTemplate, useSubmitWaTemplate, useDeleteWaTemplate, useWaSettings } from '../../hooks/useWhatsApp';
import { TemplateBodyEditor } from '../../components/whatsapp/TemplateBodyEditor';
import { TemplateStatusBadge } from '../../components/whatsapp/TemplateStatusBadge';
import { WaPhonePreview } from '../../components/whatsapp/WaPhonePreview';
import { Skel } from '../../components/whatsapp/Skeleton';
import {
  WA_ROUTES, LANGUAGES, TEMPLATE_NAME_RE, CATEGORY_LABEL, CATEGORY_GUIDE, slugifyTemplateName, formatInr, rateFor,
  getHeader, getBody, getFooter, getButtons, extractVariableIndexes, templateSampleValues, apiErrorMessage, INPUT_CLASS, INPUT_STYLE,
} from '../../components/whatsapp/wa-utils';
import type { WaTemplate, WaTemplateCategory, WaTemplateComponent, WaTemplatePayload, WaTemplateVariable, WaButton } from '../../types';

type HeaderType = 'none' | 'text' | 'image';
interface ButtonForm { type: 'URL' | 'QUICK_REPLY' | 'PHONE_NUMBER'; text: string; url: string; dynamic: boolean; phone: string }
interface FormState {
  title: string;
  name: string;
  nameTouched: boolean;
  language: string;
  category: WaTemplateCategory;
  headerType: HeaderType;
  headerText: string;
  headerImageSample: string;
  body: string;
  variables: WaTemplateVariable[];
  footer: string;
  buttons: ButtonForm[];
  description: string;
}

const EMPTY: FormState = {
  title: '', name: '', nameTouched: false, language: 'en', category: 'utility',
  headerType: 'none', headerText: '', headerImageSample: '', body: '', variables: [], footer: 'Tijarah Connect', buttons: [], description: '',
};

function fromTemplate(t: WaTemplate, duplicate = false): FormState {
  const header = getHeader(t.components);
  const buttons: ButtonForm[] = getButtons(t.components).map((b) => ({
    type: b.type,
    text: b.text,
    url: b.type === 'URL' ? b.url.replace(/\{\{\s*1\s*\}\}$/, '') : '',
    dynamic: b.type === 'URL' ? /\{\{\s*1\s*\}\}$/.test(b.url) : false,
    phone: b.type === 'PHONE_NUMBER' ? b.phone_number : '',
  }));
  const name = duplicate ? `${t.name}_v2` : t.name;
  return {
    title: name.replace(/_/g, ' '),
    name,
    nameTouched: true,
    language: t.language,
    category: t.category,
    headerType: header ? (header.format === 'IMAGE' ? 'image' : 'text') : 'none',
    headerText: header?.format === 'TEXT' ? header.text ?? '' : '',
    headerImageSample: '',
    body: getBody(t.components)?.text ?? '',
    variables: t.variables ?? [],
    footer: getFooter(t.components)?.text ?? '',
    buttons,
    description: t.description ?? '',
  };
}

function toComponents(f: FormState): WaTemplateComponent[] {
  const out: WaTemplateComponent[] = [];
  if (f.headerType === 'text' && f.headerText.trim()) out.push({ type: 'HEADER', format: 'TEXT', text: f.headerText.trim() });
  if (f.headerType === 'image') out.push({ type: 'HEADER', format: 'IMAGE', ...(f.headerImageSample.trim() ? { example: { header_handle: [f.headerImageSample.trim()] } } : {}) });
  const samples = f.variables.slice().sort((a, b) => a.index - b.index).map((v) => v.sample);
  out.push({ type: 'BODY', text: f.body.trim(), ...(samples.length ? { example: { body_text: [samples] } } : {}) });
  if (f.footer.trim()) out.push({ type: 'FOOTER', text: f.footer.trim() });
  if (f.buttons.length) {
    const buttons: WaButton[] = f.buttons.map((b) =>
      b.type === 'URL'
        ? { type: 'URL', text: b.text.trim(), url: b.dynamic ? `${b.url.trim()}{{1}}` : b.url.trim(), ...(b.dynamic ? { example: [`${b.url.trim()}abc123`] } : {}) }
        : b.type === 'PHONE_NUMBER'
          ? { type: 'PHONE_NUMBER', text: b.text.trim(), phone_number: b.phone.trim() }
          : { type: 'QUICK_REPLY', text: b.text.trim() },
    );
    out.push({ type: 'BUTTONS', buttons });
  }
  return out;
}

function validate(f: FormState): Record<string, string> {
  const e: Record<string, string> = {};
  if (!TEMPLATE_NAME_RE.test(f.name)) e.name = 'Lowercase letters, digits and underscores only';
  if (!f.body.trim()) e.body = 'Body is required';
  if (f.body.length > 1024) e.body = 'Body must be 1024 characters or fewer';
  const idx = extractVariableIndexes(f.body);
  if (!idx.every((n, i) => n === i + 1)) e.body = 'Variables must be numbered {{1}}, {{2}}… in order';
  if (f.variables.some((v) => !v.sample.trim())) e.variables = 'Every variable needs a sample value (Meta requires examples)';
  if (f.headerType === 'text' && !f.headerText.trim()) e.header = 'Header text is required or choose “None”';
  if (f.headerText.length > 60) e.header = 'Header must be 60 characters or fewer';
  if (f.headerType === 'text' && /\{\{/.test(f.headerText)) e.header = 'Keep the header static; variables go in the body';
  if (f.footer.length > 60) e.footer = 'Footer must be 60 characters or fewer';
  f.buttons.forEach((b, i) => {
    if (!b.text.trim()) e[`button${i}`] = 'Button label is required';
    else if (b.text.length > 25) e[`button${i}`] = 'Labels are limited to 25 characters';
    if (b.type === 'URL' && !/^https?:\/\/\S+/.test(b.url.trim())) e[`button${i}`] = 'Enter a full URL starting with https://';
    if (b.type === 'PHONE_NUMBER' && !/^\+?\d{8,15}$/.test(b.phone.trim())) e[`button${i}`] = 'Enter a phone number in international format';
  });
  return e;
}

export default function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const state = (useLocation().state ?? {}) as { duplicateOf?: WaTemplate };
  const canManage = useHasPermission('whatsapp.templates');
  const { data: template, isLoading, isError } = useWaTemplate(id);

  if (!canManage) return <EmptyState icon={Lock} title="Admins only" description="Creating and editing templates needs the admin role." action={{ label: 'Back to templates', onClick: () => navigate(WA_ROUTES.templates) }} />;
  if (id && isLoading) return <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5"><Skel className="h-[600px]" /><Skel className="h-[600px]" /></div>;
  if (id && (isError || !template)) return <EmptyState title="Template not found" action={{ label: 'Back to templates', onClick: () => navigate(WA_ROUTES.templates) }} />;

  const initial = template ? fromTemplate(template) : state.duplicateOf ? fromTemplate(state.duplicateOf, true) : EMPTY;
  return <TemplateForm key={template?.id ?? 'new'} template={template ?? null} initial={initial} />;
}

function TemplateForm({ template, initial }: { template: WaTemplate | null; initial: FormState }) {
  const navigate = useNavigate();
  const { data: settings } = useWaSettings();
  const create = useCreateWaTemplate();
  const update = useUpdateWaTemplate();
  const submit = useSubmitWaTemplate();
  const remove = useDeleteWaTemplate();

  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<'submit' | 'delete' | null>(null);

  const readOnly = !!template && !['draft', 'rejected'].includes(template.status);
  const patch = (p: Partial<FormState>) => setForm((f) => ({ ...f, ...p }));
  const components = toComponents(form);
  const rate = rateFor(form.category, settings?.rates);
  const busy = create.isPending || update.isPending || submit.isPending || remove.isPending;

  const buildPayload = (submitNow: boolean): WaTemplatePayload => ({
    name: form.name,
    language: form.language,
    category: form.category,
    components,
    variables: form.variables.map((v) => ({ ...v, location: 'body' })),
    description: form.description.trim() || undefined,
    submit: submitNow,
  });

  const save = async (submitNow: boolean) => {
    const e = validate(form);
    setErrors(e);
    if (Object.keys(e).length) { toast.error(Object.values(e)[0]); setConfirm(null); return; }
    try {
      const payload = buildPayload(submitNow);
      const saved = template
        ? await update.mutateAsync({ id: template.id, payload })
        : await create.mutateAsync(payload);
      toast.success(submitNow ? 'Submitted to Meta for review' : 'Draft saved');
      setConfirm(null);
      if (!template || saved.id !== template.id) navigate(WA_ROUTES.template(saved.id), { replace: true });
    } catch (err) {
      setConfirm(null);
      toast.error(apiErrorMessage(err, 'Could not save the template'));
    }
  };

  const submitExisting = async () => {
    if (!template) return save(true);
    if (template.status === 'rejected') return save(true);
    try {
      await submit.mutateAsync(template.id);
      toast.success('Submitted to Meta for review');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not submit'));
    } finally { setConfirm(null); }
  };

  const onDelete = async () => {
    if (!template) return;
    try {
      await remove.mutateAsync(template.id);
      toast.success('Template deleted');
      navigate(WA_ROUTES.templates);
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Could not delete — it may be used by a campaign'));
    } finally { setConfirm(null); }
  };

  const addButton = (type: ButtonForm['type']) => {
    if (form.buttons.length >= 3) return;
    patch({ buttons: [...form.buttons, { type, text: type === 'URL' ? 'Open' : type === 'PHONE_NUMBER' ? 'Call us' : 'Yes', url: 'https://', dynamic: false, phone: '' }] });
  };
  const setButton = (i: number, p: Partial<ButtonForm>) => patch({ buttons: form.buttons.map((b, j) => (j === i ? { ...b, ...p } : b)) });

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <button onClick={() => navigate(WA_ROUTES.templates)} className="inline-flex items-center gap-1 text-xs mb-1" style={{ color: 'var(--text-muted)' }}><ChevronLeft className="w-3.5 h-3.5" /> Templates</button>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-xl font-bold tracking-tight font-mono" style={{ color: 'var(--text-primary)' }}>{form.name || 'new_template'}</h2>
            {template && <TemplateStatusBadge status={template.status} reason={template.rejectedReason} size="md" />}
          </div>
        </div>
        {template && readOnly && (
          <button onClick={() => navigate(WA_ROUTES.templateNew, { state: { duplicateOf: template } })} className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
            <Copy className="w-4 h-4" /> Duplicate to edit
          </button>
        )}
      </div>

      {template?.status === 'rejected' && (
        <div className="flex gap-2 p-3 rounded-lg text-sm" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }}>
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span><strong>Rejected by Meta:</strong> {template.rejectedReason || 'No reason given.'} Edit the content and resubmit.</span>
        </div>
      )}
      {readOnly && (
        <div className="flex gap-2 p-3 rounded-lg text-sm" style={{ background: 'var(--surface-1)', color: 'var(--text-secondary)' }}>
          <Lock className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
          <span>Meta templates are immutable once submitted. This one is <strong>{template?.status}</strong>; duplicate it to make changes.</span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
        <div className="card p-5 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Title" required description="Friendly name; the Meta name below is derived from it">
              <input value={form.title} readOnly={readOnly} onChange={(e) => patch({ title: e.target.value, ...(form.nameTouched ? {} : { name: slugifyTemplateName(e.target.value) }) })} placeholder="Weekly profile visits" className={INPUT_CLASS} style={INPUT_STYLE} />
            </FormField>
            <FormField label="Meta template name" required error={errors.name} description="Lowercase letters, digits and underscores. Must be unique per language.">
              <input value={form.name} readOnly={readOnly || !!template} onChange={(e) => patch({ name: slugifyTemplateName(e.target.value), nameTouched: true })} className={`${INPUT_CLASS} font-mono`} style={INPUT_STYLE} />
            </FormField>
            <FormField label="Language" required>
              <select value={form.language} disabled={readOnly || !!template} onChange={(e) => patch({ language: e.target.value })} className={INPUT_CLASS} style={INPUT_STYLE}>
                {LANGUAGES.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
              </select>
            </FormField>
            <FormField label="When to use (internal)" description="Shown to admins picking a template">
              <input value={form.description} readOnly={readOnly} onChange={(e) => patch({ description: e.target.value })} placeholder="Nudge owners whose profile had visits this week" className={INPUT_CLASS} style={INPUT_STYLE} />
            </FormField>
          </div>

          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Category <span className="text-red-500">*</span></p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(['utility', 'marketing', 'authentication'] as WaTemplateCategory[]).map((c) => {
                const on = form.category === c;
                return (
                  <button key={c} type="button" disabled={readOnly} onClick={() => patch({ category: c })} className="text-left p-3.5 rounded-xl transition-all disabled:cursor-default" style={{ background: on ? 'var(--color-primary-light)' : 'var(--surface-1)', border: `1px solid ${on ? 'var(--color-primary)' : 'var(--border-default)'}` }}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{CATEGORY_LABEL[c]}</span>
                      <span className="text-xs font-semibold tabular-nums" style={{ color: on ? 'var(--color-primary)' : 'var(--text-muted)' }}>{formatInr(rateFor(c, settings?.rates), 4)}</span>
                    </div>
                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{CATEGORY_GUIDE[c]}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] mt-2 flex items-start gap-1.5" style={{ color: 'var(--text-muted)' }}>
              <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
              Meta re-categorises templates that read like promotions as marketing — and bills them at the marketing rate. Keep utility templates factual and about the owner’s own listing.
            </p>
          </div>

          <div>
            <p className="text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>Header</p>
            <div className="flex gap-1 p-1 rounded-lg w-fit mb-3" style={{ background: 'var(--surface-1)' }}>
              {(['none', 'text', 'image'] as HeaderType[]).map((h) => (
                <button key={h} type="button" disabled={readOnly} onClick={() => patch({ headerType: h })} className="px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors" style={{ background: form.headerType === h ? 'var(--surface-0)' : 'transparent', color: form.headerType === h ? 'var(--text-primary)' : 'var(--text-muted)', boxShadow: form.headerType === h ? 'var(--shadow-sm)' : 'none' }}>{h}</button>
              ))}
            </div>
            {form.headerType === 'text' && (
              <FormField label="Header text" error={errors.header} description={`${form.headerText.length}/60 · static text, no variables`}>
                <input value={form.headerText} readOnly={readOnly} maxLength={60} onChange={(e) => patch({ headerText: e.target.value })} className={INPUT_CLASS} style={INPUT_STYLE} />
              </FormField>
            )}
            {form.headerType === 'image' && (
              <FormField label="Sample image link (optional, for Meta review)" description="Leave empty to use the Tijarah card, or paste a public image link — we upload it to Meta for you. The real image (one picture, or each business’s logo) is chosen per campaign.">
                <input value={form.headerImageSample} readOnly={readOnly} onChange={(e) => patch({ headerImageSample: e.target.value })} placeholder="Empty = Tijarah card" className={INPUT_CLASS} style={INPUT_STYLE} />
              </FormField>
            )}
          </div>

          <div>
            <TemplateBodyEditor value={form.body} onChange={(body) => patch({ body })} variables={form.variables} onVariablesChange={(variables) => patch({ variables })} readOnly={readOnly} />
            {(errors.body || errors.variables) && <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>{errors.body || errors.variables}</p>}
          </div>

          <FormField label="Footer" error={errors.footer} description={`${form.footer.length}/60 · small muted line under the body`}>
            <input value={form.footer} readOnly={readOnly} maxLength={60} onChange={(e) => patch({ footer: e.target.value })} className={INPUT_CLASS} style={INPUT_STYLE} />
          </FormField>

          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Buttons <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(up to 3)</span></p>
              {!readOnly && form.buttons.length < 3 && (
                <div className="flex gap-1.5">
                  {([['URL', 'Link'], ['QUICK_REPLY', 'Quick reply'], ['PHONE_NUMBER', 'Call']] as [ButtonForm['type'], string][]).map(([t, l]) => (
                    <button key={t} type="button" onClick={() => addButton(t)} className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}><Plus className="w-3 h-3" />{l}</button>
                  ))}
                </div>
              )}
            </div>
            {form.buttons.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No buttons. A “Open profile” link button is a good default for utility templates.</p>
            ) : (
              <div className="space-y-2">
                {form.buttons.map((b, i) => (
                  <div key={i} className="p-3 rounded-lg space-y-2" style={{ background: 'var(--surface-1)', border: `1px solid ${errors[`button${i}`] ? 'var(--color-danger)' : 'var(--border-default)'}` }}>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>{b.type === 'URL' ? 'Link' : b.type === 'PHONE_NUMBER' ? 'Call' : 'Quick reply'}</span>
                      <input value={b.text} readOnly={readOnly} maxLength={25} onChange={(e) => setButton(i, { text: e.target.value })} placeholder="Label" className="flex-1 px-2.5 py-1.5 text-sm rounded-md focus-ring" style={INPUT_STYLE} />
                      {!readOnly && <button type="button" onClick={() => patch({ buttons: form.buttons.filter((_, j) => j !== i) })} aria-label="Remove button" style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>}
                    </div>
                    {b.type === 'URL' && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <input value={b.url} readOnly={readOnly} onChange={(e) => setButton(i, { url: e.target.value })} placeholder="https://tijarah.app/provider-details?id=" className="flex-1 min-w-[200px] px-2.5 py-1.5 text-sm rounded-md font-mono focus-ring" style={INPUT_STYLE} />
                        <label className="inline-flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <input type="checkbox" checked={b.dynamic} disabled={readOnly} onChange={(e) => setButton(i, { dynamic: e.target.checked })} />
                          Dynamic suffix <code className="font-mono">{'{{1}}'}</code>
                        </label>
                      </div>
                    )}
                    {b.type === 'PHONE_NUMBER' && (
                      <input value={b.phone} readOnly={readOnly} onChange={(e) => setButton(i, { phone: e.target.value })} placeholder="+919876543210" className="w-full px-2.5 py-1.5 text-sm rounded-md font-mono focus-ring" style={INPUT_STYLE} />
                    )}
                    {errors[`button${i}`] && <p className="text-xs" style={{ color: 'var(--color-danger)' }}>{errors[`button${i}`]}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between gap-3 pt-4 flex-wrap" style={{ borderTop: '1px solid var(--border-light)' }}>
            <div>
              {template && (template.status === 'draft' || template.status === 'rejected' || template.usageCount === 0) && (
                <button type="button" onClick={() => setConfirm('delete')} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg disabled:opacity-50" style={{ color: 'var(--color-danger)', background: 'var(--surface-2)' }}>
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              )}
            </div>
            {!readOnly && (
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => save(false)} disabled={busy} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg disabled:opacity-50" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
                  {create.isPending || update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save draft
                </button>
                <button type="button" onClick={() => setConfirm('submit')} disabled={busy || settings?.configured === false} className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }} title={settings?.configured === false ? 'Configure WhatsApp first' : undefined}>
                  <Send className="w-4 h-4" /> {template?.status === 'rejected' ? 'Resubmit to Meta' : 'Submit to Meta'}
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="xl:sticky xl:top-4 space-y-3">
          <WaPhonePreview components={components} values={templateSampleValues({ variables: form.variables } as WaTemplate)} businessName={settings?.phone?.verifiedName || 'Tijarah Connect'} emptyHint="Start typing a body to preview it" />
          <p className="text-[11px] text-center tabular-nums" style={{ color: 'var(--text-muted)' }}>
            {CATEGORY_LABEL[form.category]} · {formatInr(rate, 4)} per delivered message + 18% GST
          </p>
        </aside>
      </div>

      <ConfirmDialog
        open={confirm === 'submit'}
        onClose={() => setConfirm(null)}
        onConfirm={submitExisting}
        isLoading={busy}
        title="Submit to Meta for review?"
        description="Meta reviews template content against its policies. Approval usually takes a few minutes, sometimes up to 24 hours; you'll see the status update here and in Overview. Once approved the template can't be edited — only duplicated."
        confirmLabel="Submit"
      />
      <ConfirmDialog
        open={confirm === 'delete'}
        onClose={() => setConfirm(null)}
        onConfirm={onDelete}
        variant="danger"
        isLoading={remove.isPending}
        title="Delete this template?"
        description={`“${form.name}” is removed locally and from Meta if it was ever submitted. Templates referenced by campaigns cannot be deleted.`}
        confirmLabel="Delete"
      />
    </div>
  );
}

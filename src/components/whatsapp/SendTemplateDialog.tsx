import { useMemo, useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import type { VariableSource, WaRates, WaTemplate } from '../../types';
import { useWaTemplates } from '../../hooks/useWhatsApp';
import { WaModal } from './WaModal';
import { TemplatePicker } from './TemplatePicker';
import { WaPhonePreview } from './WaPhonePreview';
import { extractVariableIndexes, formatInr, getBody, rateFor, variableSourceSample, INPUT_CLASS, INPUT_STYLE } from './wa-utils';

interface Props {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** e.g. "Pronttera · +91 98765 43210" */
  recipientLabel?: string;
  /** Known values for this recipient by variable source (brand_name, city, …). */
  prefill?: Partial<Record<VariableSource, string>>;
  onSend: (templateId: string, variables: Record<string, string>) => Promise<unknown>;
  isSending?: boolean;
  rates?: WaRates | null;
}

/** Pick an approved template, fill its variables, preview, send. Used by Inbox and the provider page. */
export function SendTemplateDialog(props: Props) {
  // Mounting the form only while open resets its state on every close, no effects needed.
  if (!props.open) return null;
  return <SendTemplateForm {...props} />;
}

function SendTemplateForm({ open, onClose, title = 'Send a template', recipientLabel, prefill = {}, onSend, isSending, rates }: Props) {
  const { data: templates = [], isLoading } = useWaTemplates({ status: 'approved' });
  const [template, setTemplate] = useState<WaTemplate | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});

  const indexes = useMemo(() => extractVariableIndexes(getBody(template?.components)?.text ?? ''), [template]);

  const pick = (t: WaTemplate) => {
    setTemplate(t);
    const next: Record<string, string> = {};
    for (const i of extractVariableIndexes(getBody(t.components)?.text ?? '')) {
      const def = t.variables.find((v) => v.index === i);
      const src = def?.source;
      next[String(i)] = (src && src !== 'custom' && prefill[src]) || def?.sample || (src ? variableSourceSample(src) : '');
    }
    setValues(next);
  };

  const complete = !!template && indexes.every((i) => (values[String(i)] ?? '').trim());
  const rate = template ? rateFor(template.category, rates) : 0;

  const submit = async () => {
    if (!template || !complete) return;
    await onSend(template.id, values);
  };

  return (
    <WaModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={recipientLabel ? `To ${recipientLabel}` : 'Business-initiated messages must use an approved template'}
      width="880px"
      footer={
        <>
          {template && (
            <span className="text-xs mr-auto tabular-nums" style={{ color: 'var(--text-muted)' }}>
              {formatInr(rate, 4)} ({template.category}) + 18% GST when delivered
            </span>
          )}
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>Cancel</button>
          <button
            onClick={submit}
            disabled={!complete || isSending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50"
            style={{ background: 'var(--color-primary)' }}
          >
            {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {isSending ? 'Sending…' : 'Send template'}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_280px] gap-5">
        <div className="flex flex-col gap-4">
          <TemplatePicker templates={templates} isLoading={isLoading} value={template?.id ?? null} onChange={pick} rates={rates} compact />
          {template && indexes.length > 0 && (
            <div className="flex flex-col gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Variables</p>
              {indexes.map((i) => {
                const def = template.variables.find((v) => v.index === i);
                return (
                  <label key={i} className="flex items-center gap-3 text-sm">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold shrink-0" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{`{{${i}}}`}</span>
                    <span className="w-32 shrink-0 truncate" style={{ color: 'var(--text-secondary)' }}>{def?.label ?? `Variable ${i}`}</span>
                    <input
                      value={values[String(i)] ?? ''}
                      onChange={(e) => setValues((v) => ({ ...v, [String(i)]: e.target.value }))}
                      className={INPUT_CLASS}
                      style={INPUT_STYLE}
                    />
                  </label>
                );
              })}
            </div>
          )}
        </div>
        <div className="md:sticky md:top-0">
          <WaPhonePreview components={template?.components} values={values} frame={false} emptyHint="Choose a template to preview it" />
        </div>
      </div>
    </WaModal>
  );
}

export default SendTemplateDialog;

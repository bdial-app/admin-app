import { useState } from 'react';
import { Loader2, Save, X, Plus } from 'lucide-react';
import { toast } from 'react-toastify';
import type { WaConsent, WaContact } from '../../types';
import { useUpdateWaContact } from '../../hooks/useWhatsApp';
import { useHasPermission } from '../../hooks/usePermissions';
import { apiErrorMessage, INPUT_CLASS, INPUT_STYLE } from './wa-utils';

interface Props {
  contact: WaContact;
  onSaved?: (c: WaContact) => void;
}

/** Consent / tags / notes editor shared by the Audience panel and the Inbox drawer. Key it by contact id. */
export function ContactEditor({ contact, onSaved }: Props) {
  const canEdit = useHasPermission('whatsapp.send');
  const update = useUpdateWaContact();
  const [consent, setConsent] = useState<WaConsent>(contact.consent);
  const [tags, setTags] = useState<string[]>(contact.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [notes, setNotes] = useState(contact.notes ?? '');

  const dirty = consent !== contact.consent || notes !== (contact.notes ?? '') || tags.join('|') !== (contact.tags ?? []).join('|');

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setTagInput('');
  };

  const save = async () => {
    try {
      const saved = await update.mutateAsync({ id: contact.id, payload: { consent, tags, notes } });
      toast.success('Contact updated');
      onSaved?.(saved);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not update the contact'));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Consent</p>
        <div className="flex gap-1.5">
          {(['opted_in', 'unknown', 'opted_out'] as WaConsent[]).map((c) => (
            <button
              key={c}
              type="button"
              disabled={!canEdit}
              onClick={() => setConsent(c)}
              className="px-2.5 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors disabled:opacity-60"
              style={{
                background: consent === c ? 'var(--color-primary)' : 'var(--surface-1)',
                color: consent === c ? '#fff' : 'var(--text-secondary)',
                border: `1px solid ${consent === c ? 'var(--color-primary)' : 'var(--border-default)'}`,
              }}
            >
              {c.replace('_', ' ')}
            </button>
          ))}
        </div>
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>
          Opted-out contacts are excluded from every marketing send. Utility messages about their own listing still go through.
        </p>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Tags</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {tags.length === 0 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>No tags</span>}
          {tags.map((t) => (
            <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
              {t}
              {canEdit && <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} aria-label={`Remove ${t}`}><X className="w-3 h-3" /></button>}
            </span>
          ))}
        </div>
        {canEdit && (
          <div className="flex gap-2">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="Add a tag and press Enter"
              className={INPUT_CLASS}
              style={INPUT_STYLE}
            />
            <button type="button" onClick={addTag} className="px-3 rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }} aria-label="Add tag"><Plus className="w-4 h-4" /></button>
          </div>
        )}
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>Notes</p>
        <textarea
          value={notes}
          readOnly={!canEdit}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Internal notes about this contact"
          className={INPUT_CLASS}
          style={{ ...INPUT_STYLE, resize: 'vertical' }}
        />
      </div>

      {canEdit && (
        <button
          type="button"
          onClick={save}
          disabled={!dirty || update.isPending}
          className="self-end inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white disabled:opacity-50"
          style={{ background: 'var(--color-primary)' }}
        >
          {update.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      )}
    </div>
  );
}

export default ContactEditor;

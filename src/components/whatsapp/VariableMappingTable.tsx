import type { VariableSource, WaAudienceSample, WaTemplate, WaVariableMapping } from '../../types';
import { VARIABLE_SOURCES, extractVariableIndexes, getBody, resolveSourceValue, INPUT_STYLE } from './wa-utils';

interface Props {
  template: WaTemplate;
  mapping: WaVariableMapping;
  onChange: (m: WaVariableMapping) => void;
  /** First sample provider from the audience preview, for resolved examples. */
  sample?: WaAudienceSample | null;
  readOnly?: boolean;
}

/** One row per `{{n}}` in the body: label, source, custom value, resolved sample. */
export function VariableMappingTable({ template, mapping, onChange, sample, readOnly }: Props) {
  const indexes = extractVariableIndexes(getBody(template.components)?.text ?? '');
  if (indexes.length === 0) {
    return (
      <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'var(--surface-1)', color: 'var(--text-muted)' }}>
        This template has no variables — nothing to map.
      </p>
    );
  }

  const set = (key: string, patch: Partial<{ source: VariableSource; value: string }>) => {
    const prev = mapping[key] ?? { source: 'custom' as VariableSource };
    onChange({ ...mapping, [key]: { ...prev, ...patch } });
  };

  return (
    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ background: 'var(--surface-1)' }}>
            {['#', 'Label', 'Source', 'Custom value', 'Resolved sample'].map((h) => (
              <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {indexes.map((i) => {
            const key = String(i);
            const def = template.variables.find((v) => v.index === i);
            const entry = mapping[key] ?? { source: def?.source ?? 'custom', value: def?.source === 'custom' ? def?.sample : undefined };
            const isCustom = entry.source === 'custom';
            const resolved = resolveSourceValue(entry.source, entry.value, sample, def?.sample);
            const missing = isCustom && !(entry.value ?? '').trim();
            return (
              <tr key={i} style={{ borderTop: '1px solid var(--border-light)' }}>
                <td className="px-3 py-2 w-12">
                  <span className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                    {`{{${i}}}`}
                  </span>
                </td>
                <td className="px-3 py-2" style={{ color: 'var(--text-primary)' }}>{def?.label ?? `Variable ${i}`}</td>
                <td className="px-3 py-2">
                  <select
                    value={entry.source}
                    disabled={readOnly}
                    onChange={(e) => set(key, { source: e.target.value as VariableSource })}
                    className="w-full px-2 py-1 text-sm rounded-md focus-ring"
                    style={INPUT_STYLE}
                  >
                    {VARIABLE_SOURCES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2">
                  {isCustom ? (
                    <input
                      value={entry.value ?? ''}
                      readOnly={readOnly}
                      placeholder="Type the text to send"
                      onChange={(e) => set(key, { value: e.target.value })}
                      className="w-full px-2 py-1 text-sm rounded-md focus-ring"
                      style={{ ...INPUT_STYLE, border: `1px solid ${missing ? 'var(--color-warning)' : 'var(--border-default)'}` }}
                    />
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>per recipient</span>
                  )}
                </td>
                <td className="px-3 py-2 text-xs truncate max-w-[180px]" style={{ color: resolved ? 'var(--text-secondary)' : 'var(--color-warning)' }} title={resolved}>
                  {resolved || 'Missing'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default VariableMappingTable;

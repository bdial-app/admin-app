import { useRef, useState, useEffect } from 'react';
import { Braces, ChevronDown } from 'lucide-react';
import type { WaTemplateVariable, VariableSource } from '../../types';
import {
  VARIABLE_SOURCES,
  extractVariableIndexes,
  renumberVariables,
  variableSourceLabel,
  variableSourceSample,
  INPUT_CLASS,
  INPUT_STYLE,
} from './wa-utils';

interface Props {
  value: string;
  onChange: (text: string) => void;
  variables: WaTemplateVariable[];
  onVariablesChange: (vars: WaTemplateVariable[]) => void;
  readOnly?: boolean;
  maxLength?: number;
  location?: WaTemplateVariable['location'];
}

/** Reconcile the variable table with the `{{n}}` placeholders present in the text. */
function reconcile(text: string, vars: WaTemplateVariable[], location: WaTemplateVariable['location']): WaTemplateVariable[] {
  const indexes = extractVariableIndexes(text);
  const kept = vars.filter((v) => indexes.includes(v.index));
  for (const i of indexes) {
    if (!kept.some((v) => v.index === i)) {
      kept.push({ index: i, location, label: `Variable ${i}`, source: 'custom', sample: '' });
    }
  }
  return kept.sort((a, b) => a.index - b.index);
}

export function TemplateBodyEditor({
  value,
  onChange,
  variables,
  onVariablesChange,
  readOnly = false,
  maxLength = 1024,
  location = 'body',
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  const indexes = extractVariableIndexes(value);
  const sequential = indexes.every((n, i) => n === i + 1);

  const applyText = (text: string) => {
    onChange(text);
    onVariablesChange(reconcile(text, variables, location));
  };

  const insertVariable = (source: VariableSource) => {
    const next = (indexes.length ? Math.max(...indexes) : 0) + 1;
    const token = `{{${next}}}`;
    const el = ref.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? value.length;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const pad = before && !/\s$/.test(before) ? ' ' : '';
    const text = `${before}${pad}${token}${after}`;
    onChange(text);
    const reconciled = reconcile(text, variables, location).map((v) =>
      v.index === next
        ? { ...v, source, label: variableSourceLabel(source), sample: source === 'custom' ? '' : variableSourceSample(source) }
        : v,
    );
    onVariablesChange(reconciled);
    setMenuOpen(false);
    requestAnimationFrame(() => {
      if (!el) return;
      el.focus();
      const pos = before.length + pad.length + token.length;
      el.setSelectionRange(pos, pos);
    });
  };

  const renumber = () => {
    const { text, map } = renumberVariables(value);
    onChange(text);
    const remapped = variables
      .filter((v) => map[v.index] !== undefined)
      .map((v) => ({ ...v, index: map[v.index] }));
    onVariablesChange(reconcile(text, remapped, location));
  };

  const updateVar = (index: number, patch: Partial<WaTemplateVariable>) => {
    onVariablesChange(
      variables.map((v) => {
        if (v.index !== index) return v;
        const next = { ...v, ...patch };
        if (patch.source && patch.source !== v.source) {
          const prevDefault = variableSourceSample(v.source);
          if (!v.sample || v.sample === prevDefault) next.sample = patch.source === 'custom' ? '' : variableSourceSample(patch.source);
          if (!v.label || v.label === variableSourceLabel(v.source) || /^Variable \d+$/.test(v.label)) next.label = variableSourceLabel(patch.source);
        }
        return next;
      }),
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Body <span className="text-red-500">*</span>
        </label>
        {!readOnly && (
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors"
              style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
            >
              <Braces className="w-3.5 h-3.5" />
              Insert variable
              <ChevronDown className="w-3 h-3" />
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 z-30 mt-1 w-72 rounded-lg overflow-hidden animate-fade-in"
                style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', boxShadow: 'var(--shadow-lg)' }}
              >
                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Resolved per recipient
                </p>
                <div className="max-h-64 overflow-y-auto pb-1">
                  {VARIABLE_SOURCES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => insertVariable(s.value)}
                      className="w-full flex items-start gap-2 px-3 py-1.5 text-left transition-colors"
                      style={{ color: 'var(--text-primary)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'var(--surface-1)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      <span className="text-sm font-medium flex-1">{s.label}</span>
                      <span className="text-[11px] truncate max-w-[120px]" style={{ color: 'var(--text-muted)' }}>{s.sample}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <textarea
        ref={ref}
        value={value}
        readOnly={readOnly}
        maxLength={maxLength}
        rows={6}
        onChange={(e) => applyText(e.target.value)}
        onBlur={() => { if (!readOnly && !sequential) renumber(); }}
        placeholder="Hi {{1}}, your Tijarah Connect profile was viewed {{2}} times this week…"
        className={`${INPUT_CLASS} font-[inherit] leading-relaxed`}
        style={{ ...INPUT_STYLE, resize: 'vertical', minHeight: 140 }}
      />
      <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-muted)' }}>
        <span>
          Use <code className="font-mono">*bold*</code>, <code className="font-mono">_italic_</code>, <code className="font-mono">~strike~</code>. Placeholders are numbered automatically.
          {!sequential && (
            <button type="button" onClick={renumber} className="ml-2 font-medium underline" style={{ color: 'var(--color-warning)' }}>
              Fix numbering
            </button>
          )}
        </span>
        <span className="tabular-nums" style={{ color: value.length > maxLength * 0.9 ? 'var(--color-warning)' : undefined }}>
          {value.length}/{maxLength}
        </span>
      </div>

      {variables.length > 0 && (
        <div className="rounded-lg overflow-hidden mt-1" style={{ border: '1px solid var(--border-default)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'var(--surface-1)' }}>
                {['#', 'Label', 'Source', 'Sample (required by Meta)'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {variables.map((v) => (
                <tr key={v.index} style={{ borderTop: '1px solid var(--border-light)' }}>
                  <td className="px-3 py-2 w-12">
                    <span className="inline-flex px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                      {`{{${v.index}}}`}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={v.label}
                      readOnly={readOnly}
                      onChange={(e) => updateVar(v.index, { label: e.target.value })}
                      className="w-full px-2 py-1 text-sm rounded-md focus-ring"
                      style={INPUT_STYLE}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      value={v.source}
                      disabled={readOnly}
                      onChange={(e) => updateVar(v.index, { source: e.target.value as VariableSource })}
                      className="w-full px-2 py-1 text-sm rounded-md focus-ring"
                      style={INPUT_STYLE}
                    >
                      {VARIABLE_SOURCES.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      value={v.sample}
                      readOnly={readOnly}
                      placeholder="e.g. Pronttera"
                      onChange={(e) => updateVar(v.index, { sample: e.target.value })}
                      className="w-full px-2 py-1 text-sm rounded-md focus-ring"
                      style={{ ...INPUT_STYLE, borderColor: v.sample ? INPUT_STYLE.border.split(' ').pop() : 'var(--color-warning)' }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TemplateBodyEditor;

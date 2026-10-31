import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Globe, Loader2, Store, User, UserCheck, Users, X } from 'lucide-react';
import { usePushAudienceOptions, usePushAudiencePreview } from '../../hooks/useNotifications';
import type { PushAudience, PushAudiencePreview, PushKind, PushPlatform } from '../../types';
import { ProviderPicker } from '../ui/ProviderPicker';
import { CustomerPicker } from '../whatsapp/CustomerPicker';
import { MultiSelect } from '../whatsapp/MultiSelect';
import { cleanAudience, LABEL_CLASS } from './push-utils';

interface Props {
  value: PushAudience;
  onChange: (next: PushAudience) => void;
  type: PushKind;
  onPreview?: (p: PushAudiencePreview | undefined) => void;
  /** Names for picked people, so chips never show bare ids. */
  names: Record<string, string>;
  onName: (id: string, label: string) => void;
}

const KINDS: { v: PushAudience['kind']; label: string; hint: string; icon: typeof Users }[] = [
  { v: 'everyone', label: 'Everyone', hint: 'All app users', icon: Globe },
  { v: 'businesses', label: 'Business owners', hint: 'People who list a business', icon: Store },
  { v: 'customers', label: 'Customers', hint: 'People who shop on Tijarah', icon: User },
  { v: 'people', label: 'Specific people', hint: 'Pick them by name', icon: UserCheck },
];

const PLATFORMS: { v: PushPlatform; label: string }[] = [
  { v: 'android', label: 'Android' },
  { v: 'ios', label: 'iPhone' },
  { v: 'web', label: 'Web' },
];

/** Activity, as one choice: active recently, or gone quiet. */
const ACTIVITY = [
  { v: '', label: 'Any time' },
  { v: 'a7', label: 'Used the app in the last 7 days' },
  { v: 'a30', label: 'Used the app in the last 30 days' },
  { v: 'i14', label: 'Not seen for 14+ days' },
  { v: 'i30', label: 'Not seen for 30+ days' },
  { v: 'i90', label: 'Not seen for 90+ days' },
];
const JOINED = [
  { v: 0, label: 'Any time' },
  { v: 7, label: 'In the last 7 days' },
  { v: 30, label: 'In the last 30 days' },
  { v: 90, label: 'In the last 90 days' },
];

const SELECT_STYLE = {
  background: 'var(--surface-1)',
  border: '1px solid var(--border-default)',
  color: 'var(--text-primary)',
};

function useDebounced<T>(v: T, ms: number) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

function Toggle({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-3 py-1.5 text-xs font-medium rounded-full transition-colors"
      style={{
        background: on ? 'var(--color-primary-light)' : 'var(--surface-1)',
        color: on ? 'var(--color-primary)' : 'var(--text-secondary)',
        border: `1px solid ${on ? 'var(--color-primary)' : 'var(--border-default)'}`,
      }}
    >
      {children}
    </button>
  );
}

export function PushAudiencePicker({ value, onChange, type, onPreview, names, onName }: Props) {
  const { data: options } = usePushAudienceOptions();
  const clean = useMemo(() => cleanAudience(value), [value]);
  const debounced = useDebounced(clean, 400);
  const pickedNone = debounced.kind === 'people' && !debounced.userIds?.length && !debounced.providerIds?.length;
  const { data: preview, isFetching, isError } = usePushAudiencePreview(debounced, type, !pickedNone);
  const shown = pickedNone ? undefined : preview;

  useEffect(() => {
    onPreview?.(shown);
  }, [shown, onPreview]);

  const patch = (p: Partial<PushAudience>) => onChange({ ...value, ...p });
  const activity = value.activeWithinDays ? `a${value.activeWithinDays}` : value.inactiveDays ? `i${value.inactiveDays}` : '';
  const setActivity = (v: string) => {
    const n = Number(v.slice(1)) || undefined;
    patch({ activeWithinDays: v.startsWith('a') ? n : undefined, inactiveDays: v.startsWith('i') ? n : undefined });
  };
  const togglePlatform = (p: PushPlatform) => {
    const cur = value.platforms ?? [];
    patch({ platforms: cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p] });
  };
  const remove = (key: 'userIds' | 'providerIds', id: string) =>
    patch({ [key]: (value[key] ?? []).filter((x) => x !== id) });

  const cityOptions = (options?.cities ?? []).map((c) => ({ value: c.name, label: `${c.name} (${c.count.toLocaleString('en-IN')})` }));
  const categoryOptions = (options?.categories ?? []).map((c) => ({ value: c.id, label: c.name }));
  const picked = [
    ...(value.providerIds ?? []).map((id) => ({ id, key: 'providerIds' as const, icon: Store })),
    ...(value.userIds ?? []).map((id) => ({ id, key: 'userIds' as const, icon: User })),
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {KINDS.map((k) => {
          const on = value.kind === k.v;
          return (
            <button
              key={k.v}
              type="button"
              onClick={() => patch({ kind: k.v })}
              className="text-left p-3 rounded-lg transition-colors"
              style={{
                background: on ? 'var(--color-primary-light)' : 'var(--surface-1)',
                border: `1px solid ${on ? 'var(--color-primary)' : 'var(--border-default)'}`,
              }}
            >
              <k.icon className="w-4 h-4" style={{ color: on ? 'var(--color-primary)' : 'var(--text-muted)' }} />
              <p className="text-sm font-medium mt-1.5" style={{ color: on ? 'var(--color-primary)' : 'var(--text-primary)' }}>{k.label}</p>
              <p className="text-[11px]" style={{ color: on ? 'var(--color-primary)' : 'var(--text-muted)', opacity: on ? 0.8 : 1 }}>{k.hint}</p>
            </button>
          );
        })}
      </div>

      {value.kind === 'people' ? (
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Add a business owner</label>
              <ProviderPicker
                value={null}
                onChange={(p) => {
                  if (!p) return;
                  onName(p.id, p.city ? `${p.name} · ${p.city}` : p.name);
                  if (!(value.providerIds ?? []).includes(p.id)) patch({ providerIds: [...(value.providerIds ?? []), p.id] });
                }}
              />
            </div>
            <div>
              <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Add a customer</label>
              <CustomerPicker
                onPick={(c) => {
                  onName(c.id, c.city ? `${c.name} · ${c.city}` : c.name);
                  if (!(value.userIds ?? []).includes(c.id)) patch({ userIds: [...(value.userIds ?? []), c.id] });
                }}
              />
            </div>
          </div>
          {picked.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {picked.map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-1.5 pl-2 pr-1 py-1 text-xs rounded-full"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                >
                  <p.icon className="w-3 h-3" />
                  {names[p.id] ?? 'Picked'}
                  <button type="button" onClick={() => remove(p.key, p.id)} className="p-0.5 rounded-full hover:opacity-70" aria-label="Remove">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nobody picked yet.</p>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Cities</label>
            <MultiSelect
              options={cityOptions}
              value={value.cities ?? []}
              onChange={(cities) => patch({ cities })}
              placeholder="All cities"
              searchPlaceholder="Search cities…"
            />
          </div>
          <div>
            <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>
              {value.kind === 'customers' ? 'Interested in' : value.kind === 'businesses' ? 'Business category' : 'Category'}
            </label>
            <MultiSelect
              options={categoryOptions}
              value={value.categoryIds ?? []}
              onChange={(categoryIds) => patch({ categoryIds })}
              placeholder="All categories"
              searchPlaceholder="Search categories…"
            />
          </div>
          <div>
            <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>App activity</label>
            <select value={activity} onChange={(e) => setActivity(e.target.value)} className="w-full px-3 py-2 text-sm rounded-lg focus-ring" style={SELECT_STYLE}>
              {ACTIVITY.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Joined Tijarah</label>
            <select
              value={value.joinedWithinDays ?? 0}
              onChange={(e) => patch({ joinedWithinDays: Number(e.target.value) || undefined })}
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
              style={SELECT_STYLE}
            >
              {JOINED.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Phones</label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => (
                <Toggle key={p.v} on={(value.platforms ?? []).includes(p.v)} onClick={() => togglePlatform(p.v)}>{p.label}</Toggle>
              ))}
              <span className="text-[11px] self-center ml-1" style={{ color: 'var(--text-muted)' }}>
                {value.platforms?.length ? '' : 'None picked = all phones'}
              </span>
            </div>
          </div>
          {value.kind === 'businesses' && (
            <div className="sm:col-span-2">
              <label className={LABEL_CLASS} style={{ color: 'var(--text-muted)' }}>Businesses that…</label>
              <div className="flex flex-wrap gap-1.5">
                <Toggle on={!!value.womenLed} onClick={() => patch({ womenLed: !value.womenLed })}>Are women-led</Toggle>
                <Toggle on={value.paidPlan === 'yes'} onClick={() => patch({ paidPlan: value.paidPlan === 'yes' ? undefined : 'yes' })}>Are on a paid plan</Toggle>
                <Toggle on={value.paidPlan === 'no'} onClick={() => patch({ paidPlan: value.paidPlan === 'no' ? undefined : 'no' })}>Have no paid plan</Toggle>
                <Toggle on={!!value.noProducts} onClick={() => patch({ noProducts: !value.noProducts })}>Have no products yet</Toggle>
              </div>
            </div>
          )}
        </div>
      )}

      <ReachPanel preview={shown} loading={isFetching} error={isError} people={value.kind === 'people'} type={type} />
    </div>
  );
}

function ReachPanel({
  preview,
  loading,
  error,
  people,
  type,
}: {
  preview?: PushAudiencePreview;
  loading: boolean;
  error: boolean;
  people: boolean;
  type: PushKind;
}) {
  const n = (v: number) => v.toLocaleString('en-IN');
  return (
    <div className="p-4 rounded-xl" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}>
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {error ? (
            "Couldn't count this audience. Try again."
          ) : preview ? (
            <>
              <span className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>{n(preview.total)}</span>{' '}
              {preview.total === 1 ? 'person' : 'people'} will get this
            </>
          ) : (
            'Pick who should get this'
          )}
        </p>
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin ml-auto" style={{ color: 'var(--text-muted)' }} />}
      </div>
      {preview && preview.total > 0 && (
        <>
          <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
            {[
              preview.businesses && `${n(preview.businesses)} business owners`,
              preview.customers && `${n(preview.customers)} customers`,
              preview.platforms.android && `${n(preview.platforms.android)} on Android`,
              preview.platforms.ios && `${n(preview.platforms.ios)} on iPhone`,
              preview.platforms.web && `${n(preview.platforms.web)} on web`,
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          {(preview.pushOff > 0 || preview.noDevice > 0) && (
            <p className="text-xs mt-1.5" style={{ color: 'var(--color-warning-dark, var(--text-secondary))' }}>
              {[
                preview.pushOff > 0 &&
                  `${n(preview.pushOff)} turned ${type === 'promotional' ? 'promotions' : 'announcements'} off`,
                people && preview.noDevice > 0 && `${n(preview.noDevice)} not signed in on a phone`,
              ]
                .filter(Boolean)
                .join(' · ')}{' '}
              — they'll find it in the app's notifications instead.
            </p>
          )}
          {preview.sample.length > 0 && (
            <p className="text-xs mt-1.5 truncate" style={{ color: 'var(--text-muted)' }}>
              Including{' '}
              {preview.sample
                .slice(0, 4)
                .map((s) => s.businessName ?? s.name ?? 'someone')
                .join(', ')}
              {preview.total > 4 ? '…' : ''}
            </p>
          )}
        </>
      )}
      {preview && preview.total === 0 && (
        <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
          Nobody with the app matches these filters. Loosen one to reach more people.
        </p>
      )}
    </div>
  );
}

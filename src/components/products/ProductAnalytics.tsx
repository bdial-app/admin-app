import { useState, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowDownRight, ArrowUpRight, Bookmark, Clock, Eye, EyeOff, Loader2, MessageCircle, Package, PlusCircle, Users } from 'lucide-react';
import { productsService } from '../../services/products.service';
import type { ProductAnalytics as Analytics } from '../../types';

const PERIODS = [7, 30, 90] as const;
type Period = (typeof PERIODS)[number];

const SOURCE_LABEL: Record<string, string> = {
  home_feed: 'Home feed',
  search: 'Search',
  explore: 'Explore',
  product_link: 'Shared link',
  saved: 'Saved list',
  chat: 'Chat',
  direct: 'Business page',
};

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);
const fmtSecs = (s: number | null | undefined) => (!s ? '—' : s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`);
const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

/** Change against the previous period, as a small coloured badge. */
function Trend({ now, prev }: { now: number; prev: number }) {
  if (!prev && !now) return null;
  if (!prev) return <span className="text-[11px] font-semibold" style={{ color: 'var(--color-success)' }}>new</span>;
  const change = Math.round(((now - prev) / prev) * 100);
  const up = change >= 0;
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold" style={{ color: up ? 'var(--color-success)' : 'var(--color-danger)' }}>
      <Icon className="h-3 w-3" />
      {Math.abs(change)}%
    </span>
  );
}

function Kpi({ icon, label, value, hint, trend }: { icon: ReactNode; label: string; value: string; hint?: string; trend?: ReactNode }) {
  return (
    <div className="rounded-xl border p-4" style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
      <div className="flex items-center justify-between">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: 'var(--surface-2)', color: 'var(--color-primary)' }}>
          {icon}
        </span>
        {trend}
      </div>
      <p className="mt-3 text-2xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{value}</p>
      <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      {hint && <p className="mt-0.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}

function Card({ title, subtitle, children, className = '' }: { title: string; subtitle?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border p-4 ${className}`} style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)' }}>
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
      {subtitle && <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>{subtitle}</p>}
      {!subtitle && <div className="mb-3" />}
      {children}
    </div>
  );
}

function Meter({ value, color = 'var(--color-primary)' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'var(--surface-2)' }}>
      <div className="h-full rounded-full" style={{ width: `${Math.min(100, value)}%`, background: color }} />
    </div>
  );
}

/**
 * How the catalogue is growing and what customers do with products: views,
 * who's viewing, time spent, saves, and how often a product view turns into
 * a call or chat with the business — plus where views come from, what's
 * performing, and where the catalogue is thin.
 */
export function ProductAnalytics() {
  const [days, setDays] = useState<Period>(30);
  const { data, isLoading, isError, refetch } = useQuery<Analytics>({
    queryKey: ['products', 'analytics', days],
    queryFn: () => productsService.analytics(days),
    staleTime: 60_000,
  });

  const header = (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
        Last {days} days, compared with the {days} days before. India time.
      </p>
      <div className="flex gap-1 rounded-lg p-1" style={{ background: 'var(--surface-1)' }}>
        {PERIODS.map((p) => (
          <button
            key={p}
            onClick={() => setDays(p)}
            className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: days === p ? 'var(--surface-0)' : 'transparent',
              color: days === p ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: days === p ? 'var(--shadow-sm)' : 'none',
            }}
          >
            {p} days
          </button>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div>
        {header}
        <div className="flex items-center justify-center py-24" style={{ color: 'var(--text-muted)' }}>
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div>
        {header}
        <div className="rounded-xl border p-6 text-center text-sm" style={{ borderColor: 'var(--border-default)', color: 'var(--text-secondary)' }}>
          Couldn't load product analytics — the backend may not have this endpoint yet.{' '}
          <button className="font-semibold underline" onClick={() => void refetch()}>Retry</button>
        </div>
      </div>
    );
  }

  const { catalogue: c, engagement: e } = data;
  const contactRate = pct(e.contacted, e.visits);
  const sourceTotal = data.sources.reduce((n, s) => n + s.count, 0);

  return (
    <div className="space-y-4">
      {header}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi icon={<Eye className="h-4 w-4" />} label="Product views" value={e.views.toLocaleString()} trend={<Trend now={e.views} prev={e.viewsPrev} />} hint={`${e.productsViewed.toLocaleString()} different products`} />
        <Kpi icon={<Users className="h-4 w-4" />} label="People viewing" value={e.viewers.toLocaleString()} hint="Signed-in users and guests" />
        <Kpi icon={<Clock className="h-4 w-4" />} label="Avg. time on a product" value={fmtSecs(e.avgSeconds)} />
        <Kpi icon={<MessageCircle className="h-4 w-4" />} label="Views that led to contact" value={`${contactRate}%`} hint={`${e.contacted.toLocaleString()} of ${e.visits.toLocaleString()} visits called or chatted`} />
        <Kpi icon={<Bookmark className="h-4 w-4" />} label="Product saves" value={e.saves.toLocaleString()} trend={<Trend now={e.saves} prev={e.savesPrev} />} />
        <Kpi icon={<PlusCircle className="h-4 w-4" />} label="New listings" value={c.added.toLocaleString()} trend={<Trend now={c.added} prev={c.addedPrev} />} hint={`${c.total.toLocaleString()} in the catalogue`} />
      </div>

      <Card title="Views and new listings" subtitle="Product views per day, with products added each day">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.series} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="pa-views" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis dataKey="day" tickFormatter={fmtDay} tick={{ fontSize: 11, fill: '#94A3B8' }} interval="preserveStartEnd" minTickGap={24} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
              <Tooltip
                labelFormatter={(d) => fmtDay(String(d))}
                formatter={(v, name) => [Number(v).toLocaleString(), name === 'views' ? 'Views' : 'Products added']}
                contentStyle={{ borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12 }}
              />
              <Bar dataKey="added" fill="#F59E0B" radius={[3, 3, 0, 0]} maxBarSize={14} />
              <Area dataKey="views" type="monotone" stroke="#4F46E5" strokeWidth={2} fill="url(#pa-views)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Where views come from" subtitle="The screen customers opened products from">
          {sourceTotal === 0 ? (
            <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No product views in this period yet.</p>
          ) : (
            <div className="space-y-3">
              {data.sources.map((s) => (
                <div key={s.source}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span style={{ color: 'var(--text-primary)' }}>{SOURCE_LABEL[s.source] ?? s.source}</span>
                    <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                      {s.count.toLocaleString()} · {pct(s.count, sourceTotal)}%
                    </span>
                  </div>
                  <Meter value={pct(s.count, sourceTotal)} />
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Catalogue health" subtitle="What makes a listing worth opening">
          <div className="space-y-3">
            {[
              { label: 'Have photos', value: pct(c.withPhotos, c.total), detail: `${c.withPhotos.toLocaleString()} of ${c.total.toLocaleString()}` },
              { label: 'Have a price', value: pct(c.withPrice, c.total), detail: `${c.withPrice.toLocaleString()} of ${c.total.toLocaleString()}` },
              { label: 'Live for customers', value: pct(c.active, c.total), detail: `${c.active.toLocaleString()} active` },
            ].map((m) => (
              <div key={m.label}>
                <div className="mb-1 flex justify-between text-xs">
                  <span style={{ color: 'var(--text-primary)' }}>{m.label}</span>
                  <span className="tabular-nums" style={{ color: 'var(--text-secondary)' }}>{m.value}% · {m.detail}</span>
                </div>
                <Meter value={m.value} color={m.value >= 70 ? 'var(--color-success)' : m.value >= 40 ? '#F59E0B' : 'var(--color-danger)'} />
              </div>
            ))}
            <div className="mt-2 flex items-start gap-2.5 rounded-lg p-3" style={{ background: 'var(--surface-1)' }}>
              <EyeOff className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{data.unseenActive.toLocaleString()} live listings</span> had no
                views in the last {days} days. Photos, a price and a clear name are what get a product opened.
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card title="Top products" subtitle="Most viewed in this period">
        {data.topProducts.length === 0 ? (
          <p className="py-6 text-center text-sm" style={{ color: 'var(--text-muted)' }}>No product views in this period yet.</p>
        ) : (
          <div className="-mx-4 overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  <th className="px-4 pb-2 font-semibold">Product</th>
                  <th className="px-3 pb-2 text-right font-semibold">Views</th>
                  <th className="px-3 pb-2 text-right font-semibold">People</th>
                  <th className="px-3 pb-2 text-right font-semibold">Avg. time</th>
                  <th className="px-3 pb-2 text-right font-semibold">Saves</th>
                  <th className="px-4 pb-2 text-right font-semibold">Led to contact</th>
                </tr>
              </thead>
              <tbody>
                {data.topProducts.map((p, i) => (
                  <tr key={p.id} className="border-t" style={{ borderColor: 'var(--border-default)' }}>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-3">
                        <span className="w-4 text-xs font-bold tabular-nums" style={{ color: i < 3 ? '#F59E0B' : 'var(--text-muted)' }}>{i + 1}</span>
                        {p.photo ? (
                          <img src={p.photo} alt="" className="h-9 w-9 rounded-lg object-cover" style={{ border: '1px solid var(--border-default)' }} />
                        ) : (
                          <span className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'var(--surface-2)' }}>
                            <Package className="h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="max-w-[260px] truncate font-medium" style={{ color: 'var(--text-primary)' }}>
                            {p.name}
                            {!p.isActive && <span className="ml-1.5 text-[10px] font-semibold" style={{ color: 'var(--color-danger)' }}>hidden</span>}
                          </p>
                          <p className="truncate text-[11px]" style={{ color: 'var(--text-muted)' }}>
                            {p.brandName}
                            {p.price != null ? ` · ₹${p.price.toLocaleString('en-IN')}` : ''}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-semibold tabular-nums" style={{ color: 'var(--text-primary)' }}>{p.views.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{p.viewers.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{fmtSecs(p.avgSeconds)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{p.saves.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: p.contacted ? 'var(--color-success)' : 'var(--text-muted)' }}>
                      {pct(p.contacted, p.visits)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Categories" subtitle="Live products per category, and how complete their listings are">
        <div className="-mx-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                <th className="px-4 pb-2 font-semibold">Category</th>
                <th className="px-3 pb-2 text-right font-semibold">Products</th>
                <th className="w-40 px-3 pb-2 font-semibold">With photos</th>
                <th className="w-40 px-4 pb-2 font-semibold">With a price</th>
              </tr>
            </thead>
            <tbody>
              {data.categories.map((cat) => (
                <tr key={cat.name} className="border-t" style={{ borderColor: 'var(--border-default)' }}>
                  <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--text-primary)' }}>{cat.name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: 'var(--text-secondary)' }}>{cat.total.toLocaleString()}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2"><Meter value={pct(cat.withPhotos, cat.total)} /><span className="w-9 text-right text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>{pct(cat.withPhotos, cat.total)}%</span></div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2"><Meter value={pct(cat.withPrice, cat.total)} color="#F59E0B" /><span className="w-9 text-right text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>{pct(cat.withPrice, cat.total)}%</span></div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

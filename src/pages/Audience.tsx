import { useMemo, useState, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { PageHeader } from '../components/ui/PageHeader';
import { ROUTES } from '../utils/constants';
import {
  useAudienceAds, useAudienceLive, useAudienceOverview, useAudienceReach, useAudienceRetention,
} from '../hooks/useAudience';
import type { AudienceOverview, AudienceRetention } from '../types/audience';

// ── Chart colours ──────────────────────────────────────────────────────────
// Two categorical slots and one sequential ramp, validated for colour-blind
// separation and contrast on this app's own light (#FFFFFF) and dark (#0F172A)
// surfaces. Dark mode gets its own steps, not an inverted light palette.
const CHART_CSS = `
.aud-root {
  --series-1: #2a78d6; --series-2: #eb6834;
  --seq-lo: #e4eefb; --seq-hi: #184f95; --seq-ink-hi: #ffffff;
}
[data-theme="dark"] .aud-root {
  --series-1: #3987e5; --series-2: #d95926;
  --seq-lo: #16233d; --seq-hi: #6da7ec; --seq-ink-hi: #0F172A;
}`;

const PERIODS = [7, 30, 90] as const;
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PLACEMENT_LABEL: Record<string, string> = {
  sponsored_listing: 'Sponsored listing',
  promo_banner: 'Promo banner',
  provider_offer: 'Business offer',
};

const fmt = (v: number | null | undefined) => (v == null ? '—' : v.toLocaleString('en-IN'));
const pctFmt = (v: number | null | undefined) => (v == null ? '—' : `${v}%`);
const dayLabel = (d: unknown) =>
  new Date(`${String(d)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
const hourLabel = (h: number) => `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? 'am' : 'pm'}`;

/** A sequential cell colour for 0–1; empty cells stay on the surface. */
const seq = (t: number) =>
  t <= 0 ? 'transparent' : `color-mix(in oklab, var(--seq-hi) ${Math.round(15 + t * 85)}%, var(--seq-lo))`;
const seqInk = (t: number) => (t > 0.55 ? 'var(--seq-ink-hi)' : 'var(--text-primary)');

const tooltipStyle = {
  background: 'var(--surface-0)',
  border: '1px solid var(--border-default)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--text-primary)',
};
const axisTick = { fontSize: 11, fill: 'var(--text-muted)' };

// ── Building blocks ────────────────────────────────────────────────────────

function Card({ title, hint, children, className = '' }: { title?: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl p-4 ${className}`} style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
      {title && <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{title}</p>}
      {hint && <p className="text-xs mt-0.5 mb-3" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
      {!hint && title && <div className="mb-3" />}
      {children}
    </div>
  );
}

function Tile({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{label}</p>
      <p className="text-2xl font-semibold mt-1" style={{ color: 'var(--text-primary)' }}>{value}</p>
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{title}</h3>
        {description && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{description}</p>}
      </div>
      {children}
    </section>
  );
}

function TableView({ children }: { children: ReactNode }) {
  return (
    <details className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
      <summary className="cursor-pointer select-none">Show as table</summary>
      <div className="mt-2 max-h-72 overflow-auto">{children}</div>
    </details>
  );
}

function Table({ head, rows }: { head: string[]; rows: (string | number)[][] }) {
  return (
    <table className="w-full text-xs">
      <thead>
        <tr>
          {head.map((h, i) => (
            <th key={h} className={`py-1.5 px-2 font-medium ${i === 0 ? 'text-left' : 'text-right'}`} style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border-default)' }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>
            {r.map((c, j) => (
              <td key={j} className={`py-1.5 px-2 ${j === 0 ? 'text-left' : 'text-right tabular-nums'}`} style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-light)' }}>{c}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
    </div>
  );
}

/** Shown instead of a section whose numbers could not be loaded. */
function Failed({ what }: { what: string }) {
  return (
    <div className="rounded-xl p-4 text-sm" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
      Couldn&apos;t load {what}. Check the API is reachable, then reload.
    </div>
  );
}

// ── Sections ───────────────────────────────────────────────────────────────

function LiveSection() {
  const { data } = useAudienceLive();
  return (
    <Section
      title="Right now"
      description="Refreshes every 30 seconds. “Online now” is exact but counts signed-in people on the home screen only; the wider windows add anyone who did something, signed in or not."
    >
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Tile label="Online now" value={fmt(data?.onlineNow)} hint="Signed in, app open" />
        <Tile label="Active · last 15 min" value={fmt(data?.active15m)} />
        <Tile label="Active · last hour" value={fmt(data?.active1h)} hint={data ? `${fmt(data.visitors1h)} not signed in` : undefined} />
        <Tile label="Active · last 24 h" value={fmt(data?.active24h)} />
      </div>
    </Section>
  );
}

function Heatmap({ cells }: { cells: AudienceOverview['heatmap'] }) {
  const grid = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array<number>(24).fill(0));
    for (const c of cells) g[c.dow - 1][c.hour] = c.avgActive;
    return g;
  }, [cells]);
  const max = Math.max(0, ...cells.map((c) => c.avgActive));
  const busiest = [...cells].sort((a, b) => b.avgActive - a.avgActive).slice(0, 3);

  return (
    <Card title="When people use the app" hint="Average active people per hour, India time. Use it to time pushes, banners and boosted slots.">
      {max === 0 ? (
        <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>No activity in this period.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <div className="grid gap-[2px]" style={{ gridTemplateColumns: `36px repeat(24, minmax(18px, 1fr))`, minWidth: 560 }}>
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>{h % 3 === 0 ? hourLabel(h) : ''}</div>
              ))}
              {grid.map((row, d) => (
                <div key={d} className="contents">
                  <div className="text-[11px] pr-1 flex items-center" style={{ color: 'var(--text-muted)' }}>{DOW[d]}</div>
                  {row.map((v, h) => (
                    <div
                      key={h}
                      title={`${DOW[d]} ${hourLabel(h)}: ${v} active on average`}
                      className="h-6 rounded-[4px]"
                      style={{ background: seq(v / max), outline: v > 0 ? 'none' : '1px solid var(--border-light)', outlineOffset: -1 }}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-[11px]" style={{ color: 'var(--text-muted)' }}>
            <span>Fewer</span>
            {[0.15, 0.4, 0.65, 0.9, 1].map((t) => <span key={t} className="w-5 h-3 rounded-sm" style={{ background: seq(t) }} />)}
            <span>More</span>
            <span className="ml-auto">
              Busiest: {busiest.map((b) => `${DOW[b.dow - 1]} ${hourLabel(b.hour)}`).join(', ')}
            </span>
          </div>
          <TableView>
            <Table
              head={['Day', ...Array.from({ length: 24 }, (_, h) => hourLabel(h))]}
              rows={grid.map((row, d) => [DOW[d], ...row.map((v) => (v ? v : '·'))])}
            />
          </TableView>
        </>
      )}
    </Card>
  );
}

function UsersSection({ days }: { days: number }) {
  const { data, isLoading, isError } = useAudienceOverview(days);
  if (isLoading) return <Loading />;
  if (isError || !data) return <Failed what="user numbers" />;
  const s = data.summary;
  const peakWhen = s.peakConcurrentAt
    ? new Date(s.peakConcurrentAt).toLocaleString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' })
    : null;

  return (
    <>
      <Section
        title="Active users"
        description="Daily, weekly and monthly actives are rolling windows ending now, whatever period is picked above."
      >
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Tile label="Daily active (today)" value={fmt(s.dau)} />
          <Tile label="Weekly active" value={fmt(s.wau)} hint="Last 7 days" />
          <Tile label="Monthly active" value={fmt(s.mau)} hint="Last 30 days" />
          <Tile label="Stickiness" value={pctFmt(s.stickiness)} hint="Monthly users on an average day" />
          <Tile label={`Avg daily users · ${days}d`} value={fmt(s.avgDailyUsers)} hint={`+ ${fmt(s.avgDailyVisitors)} visitors not signed in`} />
          <Tile label={`Peak at once · ${days}d`} value={fmt(s.peakConcurrent)} hint={peakWhen ? `${peakWhen}, in one 15-min window` : 'In any 15-min window'} />
          <Tile label={`Avg at once · ${days}d`} value={String(s.avgConcurrent)} hint="Across every 15-min window" />
          <Tile label={`Active in ${days}d`} value={fmt(s.activeUsers)} hint={`+ ${fmt(s.visitors)} visitor sessions`} />
        </div>

        <Card title="Daily active" hint="Signed-in people and anonymous visitor sessions, per day (India time).">
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={data.daily} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-light)" />
              <XAxis dataKey="day" tickFormatter={dayLabel} tick={axisTick} minTickGap={24} />
              <YAxis allowDecimals={false} tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={dayLabel} cursor={{ stroke: 'var(--border-default)' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
              <Line type="linear" dataKey="users" name="Signed-in users" stroke="var(--series-1)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="linear" dataKey="visitors" name="Visitors (not signed in)" stroke="var(--series-2)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
          <TableView>
            <Table
              head={['Day', 'Signed-in users', 'Visitors', 'Peak at once', 'New sign-ups']}
              rows={[...data.daily].reverse().map((d) => [dayLabel(d.day), d.users, d.visitors, d.peak15, d.signups])}
            />
          </TableView>
        </Card>
      </Section>

      <Section title="Growth" description="Only accounts that have signed in count. Businesses added by bulk import are listed separately until their owner logs in.">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <Tile label="Total users" value={fmt(s.totalUsers)} hint="Have signed in at least once" />
          <Tile label={`New · ${days}d`} value={fmt(s.newUsers)} />
          <Tile label="Activation" value={pctFmt(s.activationRate)} hint="New users who then used the app" />
          <Tile label="Returning share" value={pctFmt(s.returningShare)} hint="Of active users, joined earlier" />
          <Tile label="Unclaimed accounts" value={fmt(s.unclaimedAccounts)} hint="Imported, owner never logged in" />
        </div>
        <Card title="New sign-ups per day">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.daily} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-light)" />
              <XAxis dataKey="day" tickFormatter={dayLabel} tick={axisTick} minTickGap={24} />
              <YAxis allowDecimals={false} tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={dayLabel} cursor={{ fill: 'var(--border-light)' }} />
              <Bar dataKey="signups" name="Sign-ups" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </Section>

      <Section title="Timing">
        <Heatmap cells={data.heatmap} />
      </Section>
    </>
  );
}

function RetentionSection() {
  const [weeks, setWeeks] = useState(8);
  const { data, isLoading, isError } = useAudienceRetention(weeks);
  return (
    <Section title="Retention" description="Each row is a week's sign-ups; each column, how many of them used the app that many weeks later. “–” is a week that has not happened yet.">
      <Card>
        <div className="flex justify-end mb-2">
          <select
            value={weeks}
            onChange={(e) => setWeeks(Number(e.target.value))}
            className="text-xs px-2 py-1 rounded-lg border"
            style={{ background: 'var(--surface-0)', borderColor: 'var(--border-default)', color: 'var(--text-primary)' }}
          >
            {[4, 8, 12].map((w) => <option key={w} value={w}>Last {w} weeks</option>)}
          </select>
        </div>
        {isLoading ? <Loading /> : isError || !data ? <Failed what="retention" /> : <CohortTable data={data} />}
      </Card>
    </Section>
  );
}

function CohortTable({ data }: { data: AudienceRetention }) {
  if (!data.cohorts.length) return <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>No sign-ups in this range.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border-separate table-fixed" style={{ borderSpacing: 2, minWidth: 560 }}>
        <colgroup>
          <col style={{ width: '16%' }} />
          <col style={{ width: '12%' }} />
          {[0, 1, 2, 3, 4].map((i) => <col key={i} style={{ width: '14.4%' }} />)}
        </colgroup>
        <thead>
          <tr style={{ color: 'var(--text-muted)' }}>
            <th className="text-left font-medium px-2 py-1">Week of</th>
            <th className="text-right font-medium px-2 py-1">Sign-ups</th>
            {['Same week', 'Week 1', 'Week 2', 'Week 3', 'Week 4'].map((h) => <th key={h} className="text-center font-medium px-2 py-1">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.cohorts.map((c) => (
            <tr key={c.cohort}>
              <td className="px-2 py-1.5" style={{ color: 'var(--text-primary)' }}>{dayLabel(c.cohort)}</td>
              <td className="px-2 py-1.5 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>{c.size}</td>
              {c.weeks.map((w, i) => {
                const t = (w?.rate ?? 0) / 100;
                return (
                  <td
                    key={i}
                    className="px-2 py-1.5 text-center tabular-nums rounded-[4px]"
                    title={w ? `${w.users} of ${c.size}` : 'Not yet'}
                    style={{ background: w ? seq(t) : 'transparent', color: w ? seqInk(t) : 'var(--text-muted)' }}
                  >
                    {w ? pctFmt(w.rate) : '–'}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReachSection({ days }: { days: number }) {
  const { data, isLoading, isError } = useAudienceReach(days);
  if (isLoading) return <Loading />;
  if (isError || !data) return <Failed what="reach" />;
  const maxCity = Math.max(1, ...data.cities.map((c) => c.users));
  return (
    <Section title="Who and where" description={`Signed-in people active in the last ${days} days. The city is what they put on their profile.`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card title="Active users by city" className="lg:col-span-2">
          {data.cities.length === 0 ? (
            <p className="text-sm py-6 text-center" style={{ color: 'var(--text-muted)' }}>No signed-in activity in this period.</p>
          ) : (
            <div className="space-y-2">
              {data.cities.map((c) => (
                <div key={c.city} className="flex items-center gap-3 text-sm">
                  <span className="w-28 truncate" style={{ color: 'var(--text-primary)' }}>{c.city}</span>
                  <div className="flex-1 h-4 rounded-[4px]" style={{ background: 'var(--border-light)' }}>
                    <div className="h-4 rounded-[4px]" style={{ width: `${(c.users / maxCity) * 100}%`, background: 'var(--series-1)' }} />
                  </div>
                  <span className="w-10 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>{c.users}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
        <div className="space-y-3">
          <Tile label="Customers" value={fmt(data.customers)} hint="Active, no business of their own" />
          <Tile label="Business owners" value={fmt(data.businessOwners)} hint="Active, own a listing" />
        </div>
      </div>
      <Card title="Devices" hint="People with notifications switched on, by platform — your reach for a push campaign.">
        <Table
          head={['Platform', 'Push-reachable', `Active in ${days}d`]}
          rows={data.platforms.map((p) => [p.platform === 'ios' ? 'iOS' : p.platform === 'android' ? 'Android' : 'Web', fmt(p.pushReachable), fmt(p.activeInPeriod)])}
        />
      </Card>
    </Section>
  );
}

function AdsSection({ days }: { days: number }) {
  const { data, isLoading, isError } = useAudienceAds(days);
  if (isLoading) return <Loading />;
  if (isError || !data) return <Failed what="advertising numbers" />;
  const t = data.totals;
  const f = data.funnel;
  const funnel = [
    { label: 'Shown in search results', value: f.searchAppearances },
    { label: 'Profile views', value: f.profileViews },
    { label: 'Contacted (call, chat, directions)', value: f.contacts },
  ];
  const maxFunnel = Math.max(1, ...funnel.map((s) => s.value));

  return (
    <Section title="Advertising" description={`Last ${days} days. Reach and frequency count signed-in people only — anonymous impressions are counted but can't be tied to a person.`}>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Tile label="Impressions" value={fmt(t.impressions)} hint={`${fmt(t.anonymousImpressions)} from visitors not signed in`} />
        <Tile label="Clicks" value={fmt(t.clicks)} hint={`${fmt(t.clickers)} people clicked`} />
        <Tile label="Click-through rate" value={pctFmt(t.ctr)} />
        <Tile label="Avg daily impressions" value={fmt(t.avgDailyImpressions)} hint="Inventory you can sell per day" />
        <Tile label="People reached" value={fmt(t.reachedUsers)} hint="Signed-in, saw at least one ad" />
        <Tile label="Frequency" value={t.frequency == null ? '—' : `${t.frequency}×`} hint="Ads seen per person reached" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card title="Impressions per day">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.daily} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-light)" />
              <XAxis dataKey="day" tickFormatter={dayLabel} tick={axisTick} minTickGap={24} />
              <YAxis allowDecimals={false} tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={dayLabel} cursor={{ fill: 'var(--border-light)' }} />
              <Bar dataKey="impressions" name="Impressions" fill="var(--series-1)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card title="Clicks per day">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data.daily} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--border-light)" />
              <XAxis dataKey="day" tickFormatter={dayLabel} tick={axisTick} minTickGap={24} />
              <YAxis allowDecimals={false} tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} labelFormatter={dayLabel} cursor={{ fill: 'var(--border-light)' }} />
              <Bar dataKey="clicks" name="Clicks" fill="var(--series-2)" radius={[4, 4, 0, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Card title="By placement">
        <Table
          head={['Placement', 'Impressions', 'Clicks', 'CTR', 'People reached', 'Per day']}
          rows={data.placements.map((p) => [PLACEMENT_LABEL[p.placement] ?? p.placement, fmt(p.impressions), fmt(p.clicks), pctFmt(p.ctr), fmt(p.reachedUsers), fmt(p.avgDailyImpressions)])}
        />
      </Card>

      <Card title="Top ads" hint="By impressions. “Removed” is an ad that has since been deleted.">
        <Table
          head={['Ad', 'Placement', 'Impressions', 'Clicks', 'CTR']}
          rows={data.topAds.map((a) => [a.name, PLACEMENT_LABEL[a.placement] ?? a.placement, fmt(a.impressions), fmt(a.clicks), pctFmt(a.ctr)])}
        />
      </Card>

      <Card title="What a listing turns into" hint="Every business listing, not just paid ones — the value you are selling an advertiser. Not a funnel: most profile views arrive from links and the home screen, not from search.">
        <div className="space-y-3">
          {funnel.map((s) => (
            <div key={s.label} className="flex items-center gap-3 text-sm">
              <span className="w-56 shrink-0" style={{ color: 'var(--text-primary)' }}>{s.label}</span>
              <div className="flex-1 h-5 rounded-[4px]" style={{ background: 'var(--border-light)' }}>
                <div className="h-5 rounded-[4px]" style={{ width: `${Math.max(s.value ? 1 : 0, (s.value / maxFunnel) * 100)}%`, background: 'var(--series-1)' }} />
              </div>
              <span className="w-14 text-right tabular-nums" style={{ color: 'var(--text-primary)' }}>{fmt(s.value)}</span>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
          <Tile label="Contacts per 100 views" value={f.contactsPer100Views == null ? '—' : String(f.contactsPer100Views)} />
          <Tile label="People who contacted" value={fmt(f.peopleWhoContacted)} hint={`${fmt(f.businessesContacted)} businesses reached`} />
          <Tile label="Calls · chats · directions" value={`${fmt(f.calls)} · ${fmt(f.chats)} · ${fmt(f.directions)}`} />
          <Tile label="Saves · shares" value={`${fmt(f.saves)} · ${fmt(f.shares)}`} />
        </div>
      </Card>
    </Section>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function Audience() {
  const [days, setDays] = useState<number>(30);

  return (
    <div className="aud-root">
      <style>{CHART_CSS}</style>
      <PageHeader
        title="Audience"
        description="Who uses the app, when, whether they come back, and what advertising delivers"
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Audience' }]}
        actions={
          <div className="flex rounded-lg border overflow-hidden" style={{ borderColor: 'var(--border-default)' }}>
            {PERIODS.map((p) => (
              <button
                key={p}
                onClick={() => setDays(p)}
                className="px-3 py-1.5 text-sm"
                style={{
                  background: days === p ? 'var(--color-primary)' : 'var(--surface-0)',
                  color: days === p ? '#fff' : 'var(--text-primary)',
                }}
              >
                {p} days
              </button>
            ))}
          </div>
        }
      />

      <div className="space-y-8">
        <LiveSection />
        <UsersSection days={days} />
        <RetentionSection />
        <ReachSection days={days} />
        <AdsSection days={days} />

        <details className="rounded-xl p-4 text-xs" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }}>
          <summary className="cursor-pointer select-none flex items-center gap-2 font-medium" style={{ color: 'var(--text-primary)' }}>
            <Info className="w-4 h-4" /> How these numbers are counted
          </summary>
          <ul className="mt-3 space-y-2 list-disc pl-5">
            <li><strong>Active</strong> means someone viewed a business or product, searched, saw or tapped an ad, or sent a chat message. Opening the app and doing nothing else is only seen for signed-in people, through the presence heartbeat — which counts towards daily, weekly and monthly active, but leaves no daily history.</li>
            <li><strong>Visitors</strong> are anonymous browsing sessions. Someone who signs in partway through counts once as a visitor and once as a user.</li>
            <li><strong>Peak and average at once</strong> are estimated from activity in 15-minute windows. There is no record of who was online over time — only who is online now — so treat these as close estimates, not exact concurrency.</li>
            <li><strong>Users</strong> are accounts that have signed in at least once. Accounts created by an admin or the bulk import only count once their owner logs in.</li>
            <li>Staff accounts (admin, moderator, associate) are left out everywhere. Days and hours are India time.</li>
          </ul>
        </details>
      </div>
    </div>
  );
}


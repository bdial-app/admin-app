import { Link, useNavigate } from 'react-router-dom';
import {
  Send, CheckCheck, Eye, MessageSquareReply, AlertCircle, IndianRupee, Plus,
  Smartphone, ShieldAlert, Webhook, RefreshCw, Megaphone, Settings as SettingsIcon, ArrowRight,
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import KPICard from '../../components/ui/KPICard';
import EmptyState from '../../components/ui/EmptyState';
import { DataTable, type Column } from '../../components/ui/DataTable';
import { useWaOverview, useWaSettings } from '../../hooks/useWhatsApp';
import { useHasPermission } from '../../hooks/usePermissions';
import { CampaignStatusBadge } from '../../components/whatsapp/CampaignStatusBadge';
import { CampaignProgressBar } from '../../components/whatsapp/CampaignProgressBar';
import { SkeletonCard, Skel } from '../../components/whatsapp/Skeleton';
import { WA_ROUTES, formatInr, fmtRelative, fmtDate, QUALITY_COLOR, TIER_LABEL, CATEGORY_LABEL } from '../../components/whatsapp/wa-utils';
import type { WaCampaignSummary, WaAttentionType } from '../../types';

const ATTENTION_ICON: Record<WaAttentionType, typeof AlertCircle> = {
  template_rejected: ShieldAlert,
  campaign_failed: AlertCircle,
  campaign_paused: AlertCircle,
  high_failure_rate: AlertCircle,
  unanswered_replies: MessageSquareReply,
  quality_drop: Smartphone,
  not_configured: SettingsIcon,
  webhook_silent: Webhook,
};

const pct = (r: number | null | undefined) => `${Math.round((r ?? 0) * 100)}%`;
const shortDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

export default function WhatsAppOverview() {
  const navigate = useNavigate();
  const canSend = useHasPermission('whatsapp.send');
  const { data: settings, isLoading: settingsLoading } = useWaSettings();
  const { data, isLoading, isError } = useWaOverview(30);

  if (!settingsLoading && settings && !settings.configured) return <SetupCard />;

  if (isLoading || settingsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} lines={2} />)}
        </div>
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="card p-5 xl:col-span-2"><Skel className="h-64 w-full" /></div>
          <div className="card p-5"><Skel className="h-64 w-full" /></div>
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return <EmptyState icon={AlertCircle} title="Couldn’t load the overview" description="The WhatsApp API endpoints did not respond. Check the backend and try again." action={{ label: 'Open settings', onClick: () => navigate(WA_ROUTES.settings) }} />;
  }

  const k = data.kpis;
  const remainingToday = Math.max(0, (settings?.dailyCap ?? 0) - (settings?.uniqueRecipientsLast24h ?? 0));
  const series = data.series.map((p) => ({ ...p, label: shortDate(p.date) }));

  const campaignColumns: Column<WaCampaignSummary>[] = [
    { key: 'name', header: 'Campaign', render: (c) => (
      <div className="min-w-0">
        <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{c.name}</p>
        <p className="text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>{c.template.name} · {CATEGORY_LABEL[c.template.category]}</p>
      </div>
    ) },
    { key: 'progress', header: 'Progress', className: 'w-56', render: (c) => (
      <div>
        <CampaignProgressBar campaign={c} height={6} />
        <p className="text-[11px] mt-1 tabular-nums" style={{ color: 'var(--text-muted)' }}>{c.sentCount}/{c.totalRecipients} sent · {c.readCount} read</p>
      </div>
    ) },
    { key: 'cost', header: 'Cost', render: (c) => <span className="text-sm tabular-nums" style={{ color: 'var(--text-primary)' }}>{formatInr(c.actualCostInr)}</span> },
    { key: 'status', header: 'Status', render: (c) => <CampaignStatusBadge status={c.status} /> },
    { key: 'createdAt', header: 'Created', render: (c) => <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtDate(c.createdAt)}</span> },
  ];

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard label="Sent (30d)" value={k.sent.toLocaleString('en-IN')} icon={Send} accentColor="#4F46E5" />
        <KPICard label="Delivered" value={pct(k.deliveryRate)} icon={CheckCheck} accentColor="#10B981" delay={50} trend={{ value: `${k.delivered.toLocaleString('en-IN')} msgs`, positive: true }} />
        <KPICard label="Read" value={pct(k.readRate)} icon={Eye} accentColor="#3B82F6" delay={100} trend={{ value: `${k.read.toLocaleString('en-IN')} msgs`, positive: true }} />
        <KPICard label="Replies" value={k.replied.toLocaleString('en-IN')} icon={MessageSquareReply} accentColor="#25D366" delay={150} />
        <KPICard label="Failed" value={k.failed.toLocaleString('en-IN')} icon={AlertCircle} accentColor="#EF4444" delay={200} />
        <KPICard label="Spend" value={formatInr(k.costInr)} icon={IndianRupee} accentColor="#F59E0B" delay={250} trend={{ value: 'before GST', positive: true }} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Chart */}
        <div className="card p-5 xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Last 30 days</h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sent, delivered and read per day; bars are spend in ₹.</p>
            </div>
          </div>
          {series.length === 0 ? (
            <EmptyState icon={Megaphone} title="No messages yet" description="Your first campaign will show up here." action={canSend ? { label: 'New campaign', onClick: () => navigate(WA_ROUTES.campaignNew) } : undefined} />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={series} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} minTickGap={24} />
                <YAxis yAxisId="msgs" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <YAxis yAxisId="cost" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} width={52} />
                <Tooltip
                  contentStyle={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)', borderRadius: 8, fontSize: 12 }}
                  formatter={(value, name) => (name === 'Spend' ? formatInr(Number(value)) : value)}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                <Bar yAxisId="cost" dataKey="costInr" name="Spend" fill="var(--chart-3)" fillOpacity={0.35} radius={[3, 3, 0, 0]} maxBarSize={18} />
                <Area yAxisId="msgs" type="monotone" dataKey="sent" name="Sent" stroke="var(--chart-1)" fill="var(--chart-1)" fillOpacity={0.08} strokeWidth={2} />
                <Area yAxisId="msgs" type="monotone" dataKey="delivered" name="Delivered" stroke="var(--chart-2)" fill="var(--chart-2)" fillOpacity={0.08} strokeWidth={2} />
                <Area yAxisId="msgs" type="monotone" dataKey="read" name="Read" stroke="var(--chart-5)" fill="var(--chart-5)" fillOpacity={0.06} strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Right column: attention + phone health */}
        <div className="flex flex-col gap-5">
          <div className="card p-5">
            <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Needs attention</h3>
            {data.attention.length === 0 ? (
              <p className="text-sm py-4 text-center" style={{ color: 'var(--text-muted)' }}>All clear. Nothing needs you right now.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.attention.map((a, i) => {
                  const Icon = ATTENTION_ICON[a.type] ?? AlertCircle;
                  return (
                    <li key={i}>
                      <Link to={a.href} className="flex items-start gap-3 p-2.5 rounded-lg transition-colors hover:opacity-90" style={{ background: 'var(--surface-1)' }}>
                        <Icon className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--color-warning)' }} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.title}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{a.detail}</p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 mt-1 shrink-0" style={{ color: 'var(--text-muted)' }} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Phone health</h3>
              <Link to={WA_ROUTES.settings} className="text-xs font-medium inline-flex items-center gap-1" style={{ color: 'var(--color-primary)' }}><RefreshCw className="w-3 h-3" /> Settings</Link>
            </div>
            {settings?.isTestNumber && (
              <p className="text-xs p-2.5 rounded-lg mb-3" style={{ background: 'var(--color-warning-light)', color: 'var(--color-warning-dark)' }}>
                You’re on Meta’s <strong>test number</strong>: only up to 5 verified recipient numbers and the <code>hello_world</code> template work until you add a real business number.
              </p>
            )}
            <dl className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
              <Row label="Number" value={settings?.phone?.displayPhoneNumber ?? '—'} mono />
              <Row label="Verified name" value={settings?.phone?.verifiedName ?? '—'} />
              <Row label="Quality" value={
                <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full" style={{ background: QUALITY_COLOR(settings?.phone?.qualityRating) }} />{settings?.phone?.qualityRating ?? 'Unknown'}</span>
              } />
              <Row label="Tier" value={TIER_LABEL(settings?.phone?.messagingLimitTier)} />
              <Row label="Remaining today" value={<span className="tabular-nums">{remainingToday.toLocaleString('en-IN')} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>of {settings?.dailyCap ?? 0}</span></span>} />
              <Row label="Unread" value={<span className="tabular-nums">{k.unreadConversations}</span>} />
              <Row label="Contacts" value={<span className="tabular-nums">{k.contacts.toLocaleString('en-IN')} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>· {k.optedOut} opted out</span></span>} />
              <Row label="Last webhook" value={fmtRelative(settings?.webhook.lastEventAt)} />
            </dl>
          </div>
        </div>
      </div>

      {/* Recent campaigns */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Recent campaigns {k.activeCampaigns > 0 && <span className="ml-1 text-xs font-medium" style={{ color: 'var(--color-primary)' }}>{k.activeCampaigns} active</span>}</h3>
          <div className="flex items-center gap-2">
            <Link to={WA_ROUTES.campaigns} className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>View all</Link>
            {canSend && (
              <button onClick={() => navigate(WA_ROUTES.campaignNew)} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg text-white" style={{ background: 'var(--color-primary)' }}>
                <Plus className="w-3.5 h-3.5" /> New campaign
              </button>
            )}
          </div>
        </div>
        {data.recentCampaigns.length === 0 ? (
          <div className="card">
            <EmptyState icon={Megaphone} title="No campaigns yet" description="Build an audience, pick an approved template and send your first message." action={canSend ? { label: 'Create a campaign', onClick: () => navigate(WA_ROUTES.campaignNew) } : undefined} />
          </div>
        ) : (
          <DataTable<WaCampaignSummary> columns={campaignColumns} data={data.recentCampaigns} rowKey={(c) => c.id} onRowClick={(c) => navigate(WA_ROUTES.campaign(c.id))} />
        )}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{label}</dt>
      <dd className={`text-sm font-medium mt-0.5 truncate ${mono ? 'font-mono' : ''}`} style={{ color: 'var(--text-primary)' }}>{value}</dd>
    </div>
  );
}

const ENV_VARS = [
  ['WHATSAPP_ACCESS_TOKEN', 'Permanent System User token (or the temporary token from the app dashboard while testing)'],
  ['WHATSAPP_PHONE_NUMBER_ID', 'The sender phone number id'],
  ['WHATSAPP_BUSINESS_ACCOUNT_ID', 'WABA id — templates live here'],
  ['WHATSAPP_APP_SECRET', 'Meta app secret; verifies X-Hub-Signature-256 on webhooks'],
  ['WHATSAPP_VERIFY_TOKEN', 'Any random string, pasted into the Meta webhook config'],
  ['WHATSAPP_API_VERSION', 'v21.0'],
];

const STEPS = [
  { title: 'Create a WhatsApp Business App in Meta for Developers', detail: 'Add the WhatsApp product. You get a WhatsApp Business Account (WABA) with a free test number.' },
  { title: 'Add the test number as the sender', detail: 'In WhatsApp → API Setup copy the Phone number ID, WABA ID and a temporary access token.' },
  { title: 'Copy the ids into the server .env', detail: 'Fill the variables below and restart the API. The endpoints answer configured=true once the token is valid.' },
  { title: 'Set the webhook', detail: 'Callback URL {APP_URL}/api/whatsapp/webhook with your verify token. Subscribe to messages, message_template_status_update and phone_number_quality_update.' },
  { title: 'Add your phone as a test recipient', detail: 'Test numbers can only reach up to 5 recipient numbers you verify in the Meta dashboard. Then send yourself hello_world from Settings.' },
];

function SetupCard() {
  return (
    <div className="card p-6 md:p-8 max-w-4xl">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, #25D366 18%, transparent)' }}>
          <Smartphone className="w-6 h-6" style={{ color: '#128C7E' }} />
        </div>
        <div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Connect WhatsApp Cloud API</h2>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            The module is disabled until the server has Meta credentials. Credentials are never edited from this dashboard — they live in the API’s environment.
          </p>
        </div>
      </div>

      <ol className="mt-6 flex flex-col gap-4">
        {STEPS.map((s, i) => (
          <li key={i} className="flex gap-4">
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{i + 1}</span>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{s.title}</p>
              <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-default)' }}>
        <div className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider" style={{ background: 'var(--surface-1)', color: 'var(--text-muted)' }}>bdial-service/.env</div>
        <ul className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
          {ENV_VARS.map(([k, v]) => (
            <li key={k} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 px-4 py-2.5">
              <code className="text-xs font-mono font-semibold shrink-0 sm:w-72" style={{ color: 'var(--text-primary)' }}>{k}=</code>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{v}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>
        Costs once live (per delivered message, before 18% GST): marketing ₹0.8631 · utility ₹0.115 · replies inside a 24h customer-service window are free.
      </p>
    </div>
  );
}

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Bot, Loader2, Send, Zap } from 'lucide-react';
import { toast } from 'react-toastify';
import { DetailPanel } from '../../components/ui/DetailPanel';
import { TemplateStatusBadge } from '../../components/whatsapp/TemplateStatusBadge';
import { WA_ROUTES, apiErrorMessage, fmtRelative, formatInr } from '../../components/whatsapp/wa-utils';
import { useAutomationJobs, useAutomations, useTestAutomation, useUpdateAutomation } from '../../hooks/useAutomations';
import type { Automation } from '../../services/automations.service';

/** Why a message wasn't sent, in words an admin understands. */
const REASON: Record<string, string> = {
  not_agreed: "Hasn't agreed to WhatsApp alerts",
  already_agreed: 'Already agreed (gets the normal alert)',
  opted_out: 'Said no / replied STOP',
  used_the_app: 'Was in the app (the push was enough)',
  already_read: 'Already read it in the app',
  daily_limit: 'Daily limit reached',
  weekly_limit: 'Weekly limit reached',
  marketing_limit: 'Marketing limit (1 a month)',
  ignored_recently: 'Ignored the last 3 messages',
  budget_reached: 'Monthly budget reached',
  template_not_approved: 'Template not approved by Meta yet',
  template_is_marketing: 'Meta moved the template to Marketing',
  template_is_utility: 'Meta moved the template to Utility',
  switched_off: 'Automation was switched off',
  no_phone: 'No phone number',
  not_on_whatsapp: 'Number not on WhatsApp',
  whatsapp_not_configured: 'WhatsApp not configured',
  waiting_for_sending_hours: 'Waiting for sending hours',
  already_signed_in: 'Owner already signed in',
};
const reasonLabel = (r: string | null | undefined) =>
  !r ? '—' : REASON[r] ?? (r.startsWith('missing_') ? 'Missing information for the message' : r.replace(/_/g, ' '));

const GROUPS: { title: string; hint: string; match: (a: Automation) => boolean }[] = [
  { title: 'Business owners', hint: 'Sent only to owners who agreed to WhatsApp alerts', match: (a) => a.audience === 'owner' && a.category === 'utility' },
  { title: 'Asking owners to agree', hint: 'Marketing (₹0.86 each), capped hard', match: (a) => a.category === 'marketing' },
  { title: 'Customers', hint: 'Only customers who turned on WhatsApp replies', match: (a) => a.audience === 'customer' },
];

function Toggle({ on, disabled, onChange, label }: { on: boolean; disabled?: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={(e) => { e.stopPropagation(); onChange(!on); }}
      className="relative w-10 h-6 rounded-full transition-colors disabled:opacity-50 flex-shrink-0"
      style={{ background: on ? '#25D366' : 'var(--surface-3, var(--border-default))' }}
    >
      <span className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all" style={{ left: on ? 18 : 2 }} />
    </button>
  );
}

function TemplateState({ a }: { a: Automation }) {
  if (a.templateStatus === 'missing') {
    return <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider" style={{ background: 'var(--surface-2)', color: 'var(--text-muted)' }}>Not seeded</span>;
  }
  const moved = a.templateCategory && a.templateCategory !== a.category;
  return (
    <span className="inline-flex items-center gap-1.5">
      <TemplateStatusBadge status={a.templateStatus} />
      {moved && (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger-dark)' }} title="Meta re-filed this template. Sends are paused so you don't pay the higher rate.">
          <AlertTriangle className="w-3 h-3" /> Now {a.templateCategory}
        </span>
      )}
    </span>
  );
}

export default function Automations() {
  const navigate = useNavigate();
  const { data: list = [], isLoading } = useAutomations();
  const update = useUpdateAutomation();
  const [openKey, setOpenKey] = useState<string | null>(null);
  const open = list.find((a) => a.key === openKey) ?? null;

  const totals = useMemo(() => ({
    on: list.filter((a) => a.enabled).length,
    approved: list.filter((a) => a.templateStatus === 'approved').length,
    sent: list.reduce((n, a) => n + a.last7Days.sent, 0),
    opened: list.reduce((n, a) => n + a.last7Days.opened, 0),
    cost: list.reduce((n, a) => n + a.last7Days.costInr, 0),
  }), [list]);

  const toggle = async (a: Automation, enabled: boolean) => {
    try {
      await update.mutateAsync({ key: a.key, enabled });
      toast.success(enabled ? `"${a.name}" is on` : `"${a.name}" is off`);
    } catch (e) {
      toast.error(apiErrorMessage(e, 'Could not change it'));
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="rounded-xl p-4 flex flex-wrap items-start gap-3" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
        <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'color-mix(in srgb, #25D366 18%, transparent)' }}>
          <Bot className="w-4 h-4" style={{ color: '#128C7E' }} />
        </div>
        <div className="flex-1 min-w-[240px]">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Messages that send themselves</p>
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Each one sends when something happens: an enquiry, a review, the 1st of the month. They only go to people who agreed, between 10 AM and 8 PM (never Friday 12–2), at most 1 a day and 3 a week per person, and skip anyone already using the app.
            Everything starts off. Before switching one on, seed and submit its template in Templates and wait for Meta to approve it.
          </p>
        </div>
        <button onClick={() => navigate(WA_ROUTES.templates)} className="text-xs font-semibold px-3 py-1.5 rounded-md" style={{ background: 'var(--surface-2)', color: 'var(--text-primary)' }}>
          Go to Templates
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          ['Switched on', `${totals.on} of ${list.length}`],
          ['Templates approved', `${totals.approved} of ${list.length}`],
          ['Sent (7 days)', totals.sent.toLocaleString('en-IN')],
          ['Tapped (7 days)', totals.opened.toLocaleString('en-IN')],
          ['Cost (7 days)', formatInr(totals.cost)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-xl p-3" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{label}</p>
            <p className="text-lg font-bold tabular-nums mt-0.5" style={{ color: 'var(--text-primary)' }}>{value}</p>
          </div>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} /></div>
      ) : (
        GROUPS.map((g) => {
          const rows = list.filter(g.match);
          if (!rows.length) return null;
          return (
            <section key={g.title} className="rounded-xl overflow-hidden" style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}>
              <div className="px-4 py-3 flex items-baseline gap-2 flex-wrap" style={{ borderBottom: '1px solid var(--border-light)' }}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{g.title}</h3>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{g.hint}</span>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--border-light)' }}>
                {rows.map((a) => {
                  const topSkip = Object.entries(a.last7Days.skipped).sort((x, y) => y[1] - x[1])[0];
                  return (
                    <div
                      key={a.key}
                      onClick={() => setOpenKey(a.key)}
                      className="px-4 py-3 flex items-center gap-4 cursor-pointer transition-colors hover:bg-[var(--surface-1)]"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{a.name}</p>
                          <TemplateState a={a} />
                        </div>
                        <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-muted)' }}>{a.when}</p>
                      </div>
                      <div className="hidden md:flex items-center gap-5 text-xs tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        <span title="Sent in the last 7 days"><b style={{ color: 'var(--text-primary)' }}>{a.last7Days.sent}</b> sent</span>
                        <span title="Button tapped"><b style={{ color: 'var(--text-primary)' }}>{a.last7Days.opened}</b> tapped</span>
                        <span>{formatInr(a.last7Days.costInr)}</span>
                        <span className="w-44 truncate" title={topSkip ? reasonLabel(topSkip[0]) : undefined} style={{ color: 'var(--text-muted)' }}>
                          {topSkip ? `${topSkip[1]} skipped: ${reasonLabel(topSkip[0]).toLowerCase()}` : '—'}
                        </span>
                      </div>
                      <Toggle on={a.enabled} disabled={update.isPending} onChange={(v) => void toggle(a, v)} label={`Switch ${a.name}`} />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })
      )}

      {open && <AutomationPanel a={open} onClose={() => setOpenKey(null)} onToggle={(v) => void toggle(open, v)} />}
    </div>
  );
}

function AutomationPanel({ a, onClose, onToggle }: { a: Automation; onClose: () => void; onToggle: (v: boolean) => void }) {
  const { data: jobs = [], isLoading } = useAutomationJobs(a.key);
  const update = useUpdateAutomation();
  const test = useTestAutomation();
  const [phone, setPhone] = useState('');
  const [budget, setBudget] = useState(a.monthlyBudgetInr == null ? '' : String(a.monthlyBudgetInr));

  const saveBudget = async () => {
    const value = budget.trim() === '' ? null : Number(budget);
    if (value !== null && (!Number.isFinite(value) || value < 0)) { toast.error('Enter an amount in ₹, or leave it empty'); return; }
    try {
      await update.mutateAsync({ key: a.key, monthlyBudgetInr: value });
      toast.success(value === null ? 'Budget removed' : `Budget set to ₹${value} a month`);
    } catch (e) { toast.error(apiErrorMessage(e, 'Could not save the budget')); }
  };
  const sendTest = async () => {
    try {
      const r = await test.mutateAsync({ key: a.key, phone });
      if (r.ok) toast.success('Test sent. Check WhatsApp on that number.');
      else toast.error(`Not sent: ${reasonLabel(r.reason)}`);
    } catch (e) { toast.error(apiErrorMessage(e, 'Test failed')); }
  };

  const skipped = Object.entries(a.last7Days.skipped).sort((x, y) => y[1] - x[1]);
  const body = a.templateBody.replace(/\{\{(\d+)\}\}/g, '[$1]');

  return (
    <DetailPanel
      open
      onClose={onClose}
      title={a.name}
      subtitle={`${a.category === 'marketing' ? 'Marketing' : 'Utility'} · ${a.templateName}`}
      width="560px"
      actions={
        <div className="flex items-center gap-3">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{a.enabled ? 'On' : 'Off'}</span>
          <Toggle on={a.enabled} onChange={onToggle} label={`Switch ${a.name}`} />
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--text-muted)' }}>When it sends</p>
          <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{a.when}</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Message</p>
            <TemplateState a={a} />
          </div>
          <div className="rounded-xl p-3" style={{ background: 'color-mix(in srgb, #25D366 7%, var(--surface-1))' }}>
            <p className="text-sm whitespace-pre-line leading-relaxed" style={{ color: 'var(--text-primary)' }}>{body}</p>
            <p className="text-[11px] mt-2" style={{ color: 'var(--text-muted)' }}>[1], [2]… are filled in for each person. The button opens the app, or the right app store.</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {[
            ['Scheduled', a.last7Days.scheduled],
            ['Sent', a.last7Days.sent],
            ['Tapped', a.last7Days.opened],
            ['Waiting', a.last7Days.waiting],
          ].map(([l, v]) => (
            <div key={l as string} className="rounded-lg p-2.5 text-center" style={{ background: 'var(--surface-1)' }}>
              <p className="text-base font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>{v as number}</p>
              <p className="text-[10px] uppercase" style={{ color: 'var(--text-muted)' }}>{l as string}</p>
            </div>
          ))}
        </div>

        {skipped.length > 0 && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Not sent, and why (7 days)</p>
            <div className="flex flex-col gap-1">
              {skipped.map(([r, n]) => (
                <div key={r} className="flex justify-between text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>{reasonLabel(r)}</span>
                  <span className="tabular-nums" style={{ color: 'var(--text-primary)' }}>{n}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="auto-budget" className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Monthly budget (₹)</label>
            <div className="flex gap-2 mt-1">
              <input id="auto-budget" value={budget} onChange={(e) => setBudget(e.target.value)} inputMode="decimal" placeholder="No limit" className="input flex-1 min-w-0" />
              <button onClick={() => void saveBudget()} disabled={update.isPending} className="px-3 text-xs font-semibold rounded-md text-white disabled:opacity-50" style={{ background: 'var(--color-primary)' }}>Save</button>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Stops for the month once reached.</p>
          </div>
          <div>
            <label htmlFor="auto-test" className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Send a test</label>
            <div className="flex gap-2 mt-1">
              <input id="auto-test" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Your WhatsApp number" className="input flex-1 min-w-0" />
              <button onClick={() => void sendTest()} disabled={test.isPending || phone.trim().length < 10} className="px-3 text-xs font-semibold rounded-md text-white inline-flex items-center gap-1 disabled:opacity-50" style={{ background: '#25D366' }}>
                {test.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />} Send
              </button>
            </div>
            <p className="text-[11px] mt-1" style={{ color: 'var(--text-muted)' }}>Uses example values. Needs the approved template.</p>
          </div>
        </div>

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'var(--text-muted)' }}>Recent</p>
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
          ) : jobs.length === 0 ? (
            <p className="text-sm flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}><Zap className="w-3.5 h-3.5" /> Nothing yet. It will appear here as soon as it triggers.</p>
          ) : (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-light)' }}>
              {jobs.map((j) => (
                <div key={j.id} className="px-3 py-2 flex items-center gap-3 text-xs" style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <span className="w-20 flex-shrink-0" style={{ color: 'var(--text-muted)' }}>{fmtRelative(j.updatedAt)}</span>
                  <span className="flex-1 min-w-0 truncate" style={{ color: 'var(--text-primary)' }}>{j.businessName ?? j.userName ?? j.phone ?? '—'}</span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase"
                    style={{
                      background: j.status === 'sent' ? 'var(--color-success-light)' : j.status === 'failed' ? 'var(--color-danger-light)' : 'var(--surface-2)',
                      color: j.status === 'sent' ? 'var(--color-success-dark)' : j.status === 'failed' ? 'var(--color-danger-dark)' : 'var(--text-secondary)',
                    }}
                  >
                    {j.status}
                  </span>
                  <span className="w-40 truncate text-right" style={{ color: 'var(--text-muted)' }} title={reasonLabel(j.reason)}>{j.reason ? reasonLabel(j.reason) : ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DetailPanel>
  );
}

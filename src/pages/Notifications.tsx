import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Clock, LayoutTemplate, Send } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { PushComposer, type PushDraft } from '../components/push/PushComposer';
import { PushCampaigns } from '../components/push/PushCampaigns';
import { PushTemplates } from '../components/push/PushTemplates';
import { useNotificationStats } from '../hooks/useNotifications';
import { useMinRole } from '../hooks/usePermissions';
import { ROUTES } from '../utils/constants';

type Tab = 'send' | 'campaigns' | 'templates';

export default function Notifications() {
  const canSend = useMinRole('admin');
  const [params, setParams] = useSearchParams();
  const asked = params.get('tab') as Tab | null;
  const tab: Tab = asked === 'campaigns' || asked === 'templates' || (asked === 'send' && canSend)
    ? asked
    : canSend ? 'send' : 'campaigns';
  const setTab = (t: Tab) => setParams((p) => { p.set('tab', t); return p; }, { replace: true });

  // A draft handed over from "Send again" or a saved message; the key remounts the composer with it.
  const [draft, setDraft] = useState<{ value: PushDraft | null; key: number }>({ value: null, key: 0 });
  const startFrom = (value: PushDraft) => {
    setDraft((d) => ({ value, key: d.key + 1 }));
    setTab('send');
  };

  const { data: stats } = useNotificationStats();
  const statsDesc = stats
    ? `${stats.sentToday.toLocaleString('en-IN')} sent today · ${stats.totalSent.toLocaleString('en-IN')} in total · ${stats.readRate}% opened`
    : 'Push notifications to business owners and customers';

  const tabs = [
    ...(canSend ? [{ label: 'New push', value: 'send' as const, icon: Send }] : []),
    { label: 'Campaigns', value: 'campaigns' as const, icon: Clock },
    { label: 'Templates', value: 'templates' as const, icon: LayoutTemplate },
  ];

  return (
    <div>
      <PageHeader
        title="Push notifications"
        description={statsDesc}
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Notifications' }]}
      />

      <div className="flex gap-1 mb-6 p-1 rounded-lg w-fit" style={{ background: 'var(--surface-1)' }}>
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-colors"
            style={{
              background: tab === t.value ? 'var(--surface-0)' : 'transparent',
              color: tab === t.value ? 'var(--text-primary)' : 'var(--text-muted)',
              boxShadow: tab === t.value ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Kept mounted while hidden, so a half-written push survives a look at the other tabs. */}
      {canSend && (
        <div hidden={tab !== 'send'}>
          <PushComposer
            key={draft.key}
            initial={draft.value}
            onSent={() => {
              setDraft((d) => ({ value: null, key: d.key + 1 }));
              setTab('campaigns');
            }}
          />
        </div>
      )}
      {tab === 'campaigns' && <PushCampaigns onDuplicate={canSend ? startFrom : undefined} />}
      {tab === 'templates' && <PushTemplates onUse={canSend ? startFrom : undefined} />}
    </div>
  );
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import type { AxiosError } from 'axios';
import { AlertTriangle, CheckCircle2, Clock, DatabaseBackup, Lock, PlayCircle, ShieldCheck, XCircle } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { storageBackupService } from '../services/storage-backup.service';
import { ROUTES } from '../utils/constants';

const card = { background: 'var(--surface-0)', borderColor: 'var(--border-default)' };
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const mb = (bytes: number) => `${(bytes / 1_048_576).toFixed(1)} MB`;

/** Status of the nightly copy of the storage bucket, with "Back up now". */
export default function StorageBackup() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['storage-backup'],
    queryFn: storageBackupService.status,
    // While a run is going, check back every few seconds.
    refetchInterval: (q) => (q.state.data?.running ? 4000 : false),
  });
  const run = useMutation({
    mutationFn: storageBackupService.run,
    onSuccess: () => {
      toast.success('Backup started — it runs in the background');
      qc.invalidateQueries({ queryKey: ['storage-backup'] });
    },
    onError: (err: AxiosError<{ message?: string }>) => toast.error(err.response?.data?.message || 'Could not start the backup'),
  });

  const last = data?.lastRun;
  return (
    <div>
      <PageHeader
        title="Storage Backup"
        description="A second copy of every uploaded file — photos, ID documents, chat and WhatsApp media — at another provider."
        breadcrumbs={[{ label: 'Dashboard', path: ROUTES.DASHBOARD }, { label: 'Storage Backup' }]}
        actions={
          data?.configured ? (
            <button
              onClick={() => run.mutate()}
              disabled={run.isPending || data.running}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
              style={{ background: 'var(--color-primary)' }}
            >
              <PlayCircle className="w-4 h-4" />
              {data.running ? 'Backing up…' : 'Back up now'}
            </button>
          ) : undefined
        }
      />

      {isLoading || !data ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border-default)', borderTopColor: 'var(--color-primary)' }} />
        </div>
      ) : (
        <div className="space-y-5 max-w-4xl">
          {!data.configured ? (
            <div className="flex gap-3 p-5 rounded-xl border" style={{ background: 'rgba(245,158,11,0.08)', borderColor: '#f59e0b' }}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-500" />
              <div className="text-sm space-y-1" style={{ color: 'var(--text-secondary)' }}>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Backup isn&apos;t set up yet — files currently have no second copy.</p>
                <p>
                  Create a backup bucket at another provider (AWS S3 Mumbai recommended, with versioning and object lock) and add
                  its <code>STORAGE_BACKUP_*</code> keys to the API&apos;s environment. Steps: <code>bdial-service/src/storage-backup/README.md</code>.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border" style={card}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Backup bucket</p>
                <p className="text-sm font-semibold mt-1 break-all" style={{ color: 'var(--text-primary)' }}>
                  {data.destination?.bucket}{data.destination?.prefix ? `/${data.destination.prefix}` : ''}
                </p>
                <p className="text-xs mt-0.5 break-all" style={{ color: 'var(--text-muted)' }}>{data.destination?.endpoint}</p>
              </div>
              <div className="p-4 rounded-xl border" style={card}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Schedule</p>
                <p className="text-sm font-semibold mt-1 flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                  <Clock className="w-4 h-4" /> {data.scheduled ? data.schedule : 'Paused'}
                </p>
              </div>
              <div className="p-4 rounded-xl border" style={card}>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Last backup</p>
                {last ? (
                  <p className={`text-sm font-semibold mt-1 flex items-center gap-1.5 ${last.ok ? 'text-emerald-600' : 'text-red-600'}`}>
                    {last.ok ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    {last.ok ? 'Completed' : 'Failed'} · {fmt(last.finishedAt)}
                  </p>
                ) : (
                  <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text-muted)' }}>Never run</p>
                )}
              </div>
            </div>
          )}

          {last && (
            <div className="p-5 rounded-xl border" style={card}>
              <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                Last run ({last.trigger === 'manual' ? 'started by an admin' : 'nightly'})
              </h3>
              {last.error && <p className="text-sm text-red-600 mb-3">{last.error}</p>}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                {[
                  ['Files in storage', last.scanned.toLocaleString('en-IN')],
                  ['Already backed up', last.alreadyThere.toLocaleString('en-IN')],
                  ['Copied this run', `${last.copied.toLocaleString('en-IN')} (${mb(last.bytesCopied)})`],
                  ['Failed', last.failed.toLocaleString('en-IN')],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{label}</p>
                    <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{value}</p>
                  </div>
                ))}
              </div>
              {last.errors.length > 0 && (
                <ul className="mt-3 text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
                  {last.errors.map((e) => <li key={e.key}><code>{e.key}</code> — {e.message}</li>)}
                </ul>
              )}
            </div>
          )}

          <div className="p-5 rounded-xl border" style={card}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <ShieldCheck className="w-4 h-4" /> How files are protected
            </h3>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {[
                [DatabaseBackup, 'Every night, new files are copied to the backup bucket. The live bucket is only ever read, never changed.'],
                [Lock, 'The backup only ever gains files: nothing in it is deleted or replaced, and the bucket’s object lock stops even the account owner removing a copy.'],
                [ShieldCheck, 'Before the app removes an old photo, it copies it to the backup first; if that fails, the photo is kept.'],
                [ShieldCheck, 'ID documents, chat media and WhatsApp media are never deleted by the app.'],
              ].map(([Icon, text], i) => {
                const I = Icon as typeof ShieldCheck;
                return (
                  <li key={i} className="flex gap-2.5">
                    <I className="w-4 h-4 mt-0.5 flex-shrink-0 text-emerald-600" />
                    <span>{text as string}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

import api from './api';
import { URLS } from '../utils/urls';

export interface BackupRun {
  trigger: 'schedule' | 'manual';
  startedAt: string;
  finishedAt: string;
  ok: boolean;
  error?: string;
  scanned: number;
  alreadyThere: number;
  copied: number;
  failed: number;
  bytesCopied: number;
  errors: { key: string; message: string }[];
}

export interface StorageBackupStatus {
  configured: boolean;
  scheduled: boolean;
  running: boolean;
  destination: { bucket: string; endpoint: string; prefix: string } | null;
  schedule: string;
  lastRun: BackupRun | null;
}

export const storageBackupService = {
  status: () => api.get<StorageBackupStatus>(URLS.STORAGE_BACKUP.STATUS).then((r) => r.data),
  run: () => api.post<{ started: true }>(URLS.STORAGE_BACKUP.RUN).then((r) => r.data),
};

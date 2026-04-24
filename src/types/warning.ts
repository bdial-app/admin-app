import type { WarningType } from './enums';

export interface ProviderWarning {
  id: string;
  providerId: string;
  warningType: WarningType;
  title: string;
  message: string;
  reportId: string | null;
  issuedBy: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  // Relations
  provider?: import('./provider').Provider;
  issuer?: import('./user').User;
}

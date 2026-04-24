export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  type: string;
  group: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

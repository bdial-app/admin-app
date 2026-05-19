export interface FeatureFlag {
  key: string;
  value: string;
  type: string;
  group: string | null;
  description: string | null;
}

export type AppPlatform = 'android' | 'ios';

export interface PlatformVersion {
  /** The version live in the store right now. */
  latestVersion: string;
  /** Anything older is blocked until it updates. */
  minVersion: string;
  releaseNotes: string | null;
  storeUrl: string;
}

export interface AppVersionConfig {
  android: PlatformVersion;
  ios: PlatformVersion;
  updatedAt: string | null;
}

export type PlatformVersionInput = Pick<PlatformVersion, 'latestVersion' | 'minVersion' | 'releaseNotes'>;

export type AppVersionInput = Record<AppPlatform, PlatformVersionInput>;

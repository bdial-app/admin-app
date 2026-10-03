import api from './api';
import { URLS } from '../utils/urls';
import type { AudienceAds, AudienceLive, AudienceOverview, AudienceReach, AudienceRetention } from '../types/audience';

export const audienceService = {
  live: () => api.get<AudienceLive>(URLS.AUDIENCE.LIVE).then(r => r.data),
  overview: (days: number) =>
    api.get<AudienceOverview>(URLS.AUDIENCE.OVERVIEW, { params: { days } }).then(r => r.data),
  retention: (weeks: number) =>
    api.get<AudienceRetention>(URLS.AUDIENCE.RETENTION, { params: { weeks } }).then(r => r.data),
  reach: (days: number) =>
    api.get<AudienceReach>(URLS.AUDIENCE.REACH, { params: { days } }).then(r => r.data),
  ads: (days: number) =>
    api.get<AudienceAds>(URLS.AUDIENCE.ADS, { params: { days } }).then(r => r.data),
};

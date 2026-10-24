import { Award, Heart, Layers, Rocket, Star, Zap, type LucideIcon } from 'lucide-react';

/** The look of each badge, matching the customer app's colours. */
export const BADGE_STYLE: Record<string, { icon: LucideIcon; color: string }> = {
  tijarah_pick: { icon: Award, color: '#4f46e5' },
  top_rated: { icon: Star, color: '#f59e0b' },
  community_favourite: { icon: Heart, color: '#f43f5e' },
  quick_responder: { icon: Zap, color: '#0ea5e9' },
  rising_star: { icon: Rocket, color: '#10b981' },
  full_catalogue: { icon: Layers, color: '#14b8a6' },
};

export const badgeStyle = (key: string) => BADGE_STYLE[key] ?? { icon: Award, color: '#64748b' };

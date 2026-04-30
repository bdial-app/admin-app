export interface PromoBanner {
  id: string;
  title: string;
  subtitle: string | null;
  imageUrl: string | null;
  gradient: string | null;
  emoji: string | null;
  cta: string | null;
  tag: string | null;
  linkUrl: string | null;
  isActive: boolean;
  displayOrder: number;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
}

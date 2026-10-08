import api from './api';
import { URLS } from '../utils/urls';

export type CollectionTheme = 'amber' | 'rose' | 'sky' | 'violet' | 'emerald' | 'orange' | 'indigo' | 'teal';
export type CollectionType = 'all' | 'product' | 'service';
export type CollectionIllustration =
  | 'home-repair'
  | 'appliances'
  | 'fashion'
  | 'wedding'
  | 'sweets'
  | 'travel'
  | 'gifts'
  | 'shopping';

/** A home-screen "need": every product and service from a set of categories. */
export interface HomeCollection {
  id: string;
  title: string;
  subtitle: string | null;
  theme: CollectionTheme;
  /** The drawing on the app's banner. */
  illustration: CollectionIllustration;
  imageUrl: string | null;
  listingType: CollectionType;
  categoryIds: string[];
  displayOrder: number;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Listed right now (anywhere). */
  itemCount: number;
  photos: { url: string; name: string }[];
}

export type HomeCollectionInput = Pick<
  HomeCollection,
  'title' | 'subtitle' | 'theme' | 'illustration' | 'listingType' | 'categoryIds' | 'imageUrl' | 'isActive' | 'startsAt' | 'endsAt'
>;

export const homeCollectionsService = {
  list: async (): Promise<HomeCollection[]> => {
    const { data } = await api.get(URLS.HOME_COLLECTIONS.LIST);
    return data;
  },
  create: async (body: HomeCollectionInput): Promise<HomeCollection> => {
    const { data } = await api.post(URLS.HOME_COLLECTIONS.CREATE, body);
    return data;
  },
  update: async (id: string, body: Partial<HomeCollectionInput>): Promise<HomeCollection> => {
    const { data } = await api.patch(URLS.HOME_COLLECTIONS.UPDATE(id), body);
    return data;
  },
  remove: async (id: string): Promise<void> => {
    await api.delete(URLS.HOME_COLLECTIONS.DELETE(id));
  },
  reorder: async (ids: string[]): Promise<void> => {
    await api.patch(URLS.HOME_COLLECTIONS.REORDER, { ids });
  },
};

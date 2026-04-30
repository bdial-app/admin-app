import api from './api';

export interface ReverseGeocodeResponse {
  label: string;
  city: string;
  area: string;
  pincode: string | null;
  fullAddress: string;
  placeId: string;
}

export interface SearchGeocodeResult {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  lat: number;
  lng: number;
}

export const reverseGeocode = async (lat: number, lng: number): Promise<ReverseGeocodeResponse> => {
  const { data } = await api.post('/geocode/reverse', { lat, lng });
  return data;
};

export const searchGeocode = async (query: string): Promise<SearchGeocodeResult[]> => {
  const { data } = await api.get('/geocode/search', { params: { query } });
  return data;
};

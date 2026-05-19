import { useState, useRef, useCallback, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Search, Crosshair, Loader2, X } from 'lucide-react';
import { reverseGeocode, searchGeocode, type SearchGeocodeResult } from '../../services/geocode.service';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon issue with bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

export interface LocationData {
  latitude: string;
  longitude: string;
  city: string;
  area: string;
  pincode: string;
  address: string;
}

interface LocationPickerProps {
  latitude: string;
  longitude: string;
  city: string;
  area: string;
  pincode: string;
  address?: string;
  onLocationChange: (data: LocationData) => void;
  showAddress?: boolean;
}

const DEFAULT_CENTER: [number, number] = [18.5204, 73.8567]; // Pune

// Inner component that responds to map clicks
function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Inner component to programmatically move the map
function MapFlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.8 });
  }, [center[0], center[1], zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function LocationPicker({
  latitude,
  longitude,
  city,
  area,
  pincode,
  address = '',
  onLocationChange,
  showAddress = false,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchGeocodeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReversing, setIsReversing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Derive marker position from props
  const hasMarker = latitude && longitude && !isNaN(Number(latitude)) && !isNaN(Number(longitude));
  const markerPos: [number, number] = hasMarker
    ? [Number(latitude), Number(longitude)]
    : DEFAULT_CENTER;

  const [flyTarget, setFlyTarget] = useState<{ center: [number, number]; zoom: number } | null>(null);

  // Reverse geocode a position and update parent
  const reverseAndUpdate = useCallback(async (lat: number, lng: number) => {
    setIsReversing(true);
    try {
      const data = await reverseGeocode(lat, lng);
      onLocationChange({
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        city: data.city || '',
        area: data.area || '',
        pincode: data.pincode || '',
        address: data.fullAddress || '',
      });
    } catch {
      // On error just set lat/lng, leave other fields as-is
      onLocationChange({
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
        city,
        area,
        pincode,
        address,
      });
    } finally {
      setIsReversing(false);
    }
  }, [onLocationChange, city, area, pincode, address]);

  const handleMapClick = useCallback((lat: number, lng: number) => {
    reverseAndUpdate(lat, lng);
  }, [reverseAndUpdate]);

  // Search with debounce
  const handleSearchInput = useCallback((q: string) => {
    setSearchQuery(q);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (q.trim().length < 3) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchDebounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchGeocode(q);
        setSearchResults(results);
        setShowResults(true);
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 400);
  }, []);

  const handleSelectResult = useCallback((result: SearchGeocodeResult) => {
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
    setFlyTarget({ center: [result.lat, result.lng], zoom: 16 });
    reverseAndUpdate(result.lat, result.lng);
  }, [reverseAndUpdate]);

  // Locate me
  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setFlyTarget({ center: [lat, lng], zoom: 16 });
        reverseAndUpdate(lat, lng);
      },
      (err) => console.error('Geolocation error:', err),
      { timeout: 10000, maximumAge: 60000 },
    );
  }, [reverseAndUpdate]);

  // Close search dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const inputStyle = {
    background: 'var(--surface-1)',
    border: '1px solid var(--border-default)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="space-y-4">
      {/* Map */}
      <div className="rounded-lg overflow-hidden relative" style={{ border: '1px solid var(--border-default)', height: 300 }}>
        <MapContainer
          center={markerPos}
          zoom={hasMarker ? 15 : 11}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {hasMarker && <Marker position={markerPos} />}
          <MapClickHandler onMapClick={handleMapClick} />
          {flyTarget && <MapFlyTo center={flyTarget.center} zoom={flyTarget.zoom} />}
        </MapContainer>

        {/* Locate me overlay button */}
        <button
          type="button"
          onClick={handleLocateMe}
          className="absolute bottom-3 right-3 z-[1000] p-2 rounded-lg shadow-md transition-colors"
          style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
          title="Use my current location"
        >
          <Crosshair className="w-4 h-4" style={{ color: 'var(--color-primary)' }} />
        </button>

        {/* Reverse geocoding indicator */}
        {isReversing && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 px-3 py-1.5 rounded-full text-xs shadow-md"
            style={{ background: 'var(--surface-0)', color: 'var(--text-secondary)' }}>
            <Loader2 className="w-3 h-3 animate-spin" /> Looking up address…
          </div>
        )}
      </div>

      {/* Search bar */}
      <div ref={searchBoxRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchInput(e.target.value)}
            onFocus={() => searchResults.length > 0 && setShowResults(true)}
            placeholder="Search for a location…"
            className="w-full pl-9 pr-9 py-2 text-sm rounded-lg focus-ring"
            style={inputStyle}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => { setSearchQuery(''); setSearchResults([]); setShowResults(false); }}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </button>
          )}
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: 'var(--text-muted)' }} />
          )}
        </div>

        {/* Search results dropdown */}
        {showResults && searchResults.length > 0 && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto"
            style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
          >
            {searchResults.map((r) => (
              <button
                key={r.placeId}
                type="button"
                onClick={() => handleSelectResult(r)}
                className="w-full text-left px-4 py-2.5 text-sm hover:brightness-95 transition-colors flex items-start gap-2"
                style={{ color: 'var(--text-primary)', borderBottom: '1px solid var(--border-default)' }}
              >
                <MapPin className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--text-muted)' }} />
                <div className="min-w-0">
                  <div className="font-medium truncate">{r.mainText}</div>
                  <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{r.secondaryText}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Location fields auto-filled */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {showAddress && (
          <div className="md:col-span-2">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => onLocationChange({ latitude, longitude, city, area, pincode, address: e.target.value })}
              placeholder="123 Main Street, Near City Center"
              className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
              style={inputStyle}
            />
          </div>
        )}
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>City</label>
          <input
            type="text"
            value={city}
            onChange={(e) => onLocationChange({ latitude, longitude, city: e.target.value, area, pincode, address })}
            placeholder="Mumbai"
            className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Area</label>
          <input
            type="text"
            value={area}
            onChange={(e) => onLocationChange({ latitude, longitude, city, area: e.target.value, pincode, address })}
            placeholder="Dadar"
            className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
            style={inputStyle}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Pincode</label>
          <input
            type="text"
            value={pincode}
            onChange={(e) => onLocationChange({ latitude, longitude, city, area, pincode: e.target.value.replace(/\D/g, '').slice(0, 6), address })}
            placeholder="400014"
            className="w-full px-3 py-2 text-sm rounded-lg focus-ring"
            style={inputStyle}
          />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Latitude</label>
            <input
              type="text"
              value={latitude}
              readOnly
              className="w-full px-3 py-2 text-sm rounded-lg"
              style={{ ...inputStyle, opacity: 0.7 }}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Longitude</label>
            <input
              type="text"
              value={longitude}
              readOnly
              className="w-full px-3 py-2 text-sm rounded-lg"
              style={{ ...inputStyle, opacity: 0.7 }}
            />
          </div>
        </div>
      </div>

      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        Click on the map, search for a place, or use "Locate me" to set the location. Fields auto-fill from the map.
      </p>
    </div>
  );
}

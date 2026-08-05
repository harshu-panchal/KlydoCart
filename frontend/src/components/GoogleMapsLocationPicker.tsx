import { useCallback, useRef, useEffect, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';
import { AddressService } from '../services/addressService';
import { ParsedAddress } from '../utils/addressUtils';

interface GoogleMapsLocationPickerProps {
  initialLat?: number;
  initialLng?: number;
  initialLocation?: {
    latitude?: number;
    longitude?: number;
    lat?: number;
    lng?: number;
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
  } | null;
  onLocationSelect: (lat: number, lng: number, address?: ParsedAddress) => void;
  height?: string;
  showConfirmButton?: boolean;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const libraries: ("places")[] = ['places'];

export default function GoogleMapsLocationPicker({
  initialLat,
  initialLng,
  initialLocation,
  onLocationSelect,
  height = '200px',
  showConfirmButton = false
}: GoogleMapsLocationPickerProps) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  const mapRef = useRef<google.maps.Map | null>(null);

  const startLat = initialLocation?.latitude ?? initialLocation?.lat ?? initialLat ?? 0;
  const startLng = initialLocation?.longitude ?? initialLocation?.lng ?? initialLng ?? 0;

  const [center, setCenter] = useState({ lat: startLat, lng: startLng });
  const isDragging = useRef(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: apiKey || '',
    libraries
  });

  // Update center when initial props change
  useEffect(() => {
    if (startLat && startLng) {
      const latDiff = Math.abs(center.lat - startLat);
      const lngDiff = Math.abs(center.lng - startLng);
      // Update if position changed by more than ~1 meter
      if (latDiff > 0.00001 || lngDiff > 0.00001) {
        setCenter({ lat: startLat, lng: startLng });
        if (mapRef.current) {
          mapRef.current.panTo({ lat: startLat, lng: startLng });
        }
      }
    }
  }, [startLat, startLng]);

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const handleDragStart = useCallback(() => {
    isDragging.current = true;
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  const triggerReverseGeocode = useCallback(async (lat: number, lng: number) => {
    // Abort previous in-flight request to prevent race conditions on rapid dragging
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const parsedAddress = await AddressService.reverseGeocode(lat, lng, abortControllerRef.current.signal);
      onLocationSelect(lat, lng, parsedAddress);
    } catch (err: any) {
      if (err.message?.includes('aborted')) return;
      console.warn('[GoogleMapsLocationPicker] Reverse geocode failed:', err);
      onLocationSelect(lat, lng);
    }
  }, [onLocationSelect]);

  const handleDragEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleIdle = useCallback(() => {
    if (!isDragging.current && mapRef.current) {
      const newCenter = mapRef.current.getCenter();
      if (newCenter) {
        const lat = parseFloat(newCenter.lat().toFixed(6));
        const lng = parseFloat(newCenter.lng().toFixed(6));

        if (Math.abs(lat - center.lat) > 0.00001 || Math.abs(lng - center.lng) > 0.00001) {
          setCenter({ lat, lng });

          // 500ms Debounce reverse geocoding on drag end / idle
          if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
          }

          debounceTimerRef.current = setTimeout(() => {
            triggerReverseGeocode(lat, lng);
          }, 500);
        }
      }
    }
  }, [center.lat, center.lng, triggerReverseGeocode]);

  const handleConfirmLocation = useCallback(async () => {
    setIsConfirming(true);
    const lat = center.lat;
    const lng = center.lng;

    try {
      const parsedAddress = await AddressService.reverseGeocode(lat, lng);
      onLocationSelect(lat, lng, parsedAddress);
    } catch (e) {
      console.warn("Error calling Geocoder during confirm", e);
      onLocationSelect(lat, lng);
    } finally {
      setIsConfirming(false);
    }
  }, [center.lat, center.lng, onLocationSelect]);

  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center" style={{ height }}>
        <p className="text-red-800 text-sm">❌ Failed to load Google Maps</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="bg-gray-100 rounded-lg p-4 text-center flex items-center justify-center" style={{ height }}>
        <div className="flex flex-col items-center">
          <div className="animate-spin text-2xl mb-2">🗺️</div>
          <p className="text-gray-600 text-sm">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!apiKey) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center" style={{ height }}>
        <p className="text-yellow-800 text-sm">⚠️ Google Maps API key not configured</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden border border-neutral-300 shadow-sm" style={{ height }}>
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        center={center}
        zoom={17}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onIdle={handleIdle}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        }}
      />

      {/* Fixed Center Pin Overlay */}
      <div
        className="absolute top-1/2 left-1/2 z-10 pointer-events-none"
        style={{ transform: 'translate(-50%, -100%)' }}
      >
        <div className="flex flex-col items-center">
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            className="drop-shadow-lg"
          >
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
              fill="#EF4444"
              stroke="#B91C1C"
              strokeWidth="1"
            />
            <circle cx="12" cy="9" r="2.5" fill="white" />
          </svg>
          <div
            className="w-3 h-1 bg-black/20 rounded-full mt-1"
            style={{ filter: 'blur(1px)' }}
          />
        </div>
      </div>

      {/* Action overlay - rendered only if showConfirmButton is explicitly true */}
      {showConfirmButton && (
        <div className="absolute bottom-2 left-2 right-2 z-10 flex flex-col gap-2">
          <button
            onClick={handleConfirmLocation}
            disabled={isConfirming}
            className="w-full bg-black text-white text-xs font-bold py-2.5 rounded-lg shadow-md hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 active:scale-95"
          >
            {isConfirming ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Confirming...
              </>
            ) : (
              <>
                📍 Confirm Location
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

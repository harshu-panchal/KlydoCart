import { useCallback, useRef, useEffect, useState } from 'react';
import { GoogleMap, useJsApiLoader } from '@react-google-maps/api';

interface GoogleMapsLocationPickerProps {
    initialLat: number;
    initialLng: number;
    onLocationSelect: (lat: number, lng: number, address?: { flat?: string, street?: string, city?: string, state?: string, pincode?: string, landmark?: string }) => void;
    height?: string;
}

const mapContainerStyle = {
    width: '100%',
    height: '100%'
};

const libraries: ("places")[] = ['places'];

export default function GoogleMapsLocationPicker({
    initialLat,
    initialLng,
    onLocationSelect,
    height = '200px'
}: GoogleMapsLocationPickerProps) {
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    const mapRef = useRef<google.maps.Map | null>(null);
    const [center, setCenter] = useState({ lat: initialLat, lng: initialLng });
    const isDragging = useRef(false);

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey || '',
        libraries
    });

    // Update center when initial props change significantly
    useEffect(() => {
        if (initialLat && initialLng) {
            const latDiff = Math.abs(center.lat - initialLat);
            const lngDiff = Math.abs(center.lng - initialLng);
            // Only update if change is significant (> 100m)
            if (latDiff > 0.001 || lngDiff > 0.001) {
                setCenter({ lat: initialLat, lng: initialLng });
                if (mapRef.current) {
                    mapRef.current.panTo({ lat: initialLat, lng: initialLng });
                }
            }
        }
    }, [initialLat, initialLng]);

    const onLoad = useCallback((map: google.maps.Map) => {
        mapRef.current = map;
    }, []);

    const onUnmount = useCallback(() => {
        mapRef.current = null;
    }, []);

    const handleDragStart = useCallback(() => {
        isDragging.current = true;
    }, []);

    const handleDragEnd = useCallback(() => {
        isDragging.current = false;
        // Logic moved to handleIdle to prevent race conditions and double updates
    }, []);

    const [isConfirming, setIsConfirming] = useState(false);

    const handleConfirmLocation = useCallback(() => {
        setIsConfirming(true);
        const lat = center.lat;
        const lng = center.lng;

        const fallbackToNominatim = () => {
            fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
                .then(res => res.json())
                .then(data => {
                    if (data && data.address) {
                        const { house_number, road, suburb, neighbourhood, residential, locality, city: nCity, town, village, state_district, state: nState, postcode } = data.address;
                        const flat = house_number || '';
                        const street = road || '';
                        const city = nCity || town || village || state_district || '';
                        const state = nState || '';
                        const pincode = postcode || '';
                        const landmark = suburb || neighbourhood || residential || locality || '';

                        onLocationSelect(lat, lng, {
                            flat,
                            street: street.trim(),
                            city,
                            state,
                            pincode,
                            landmark
                        });
                    } else {
                        onLocationSelect(lat, lng);
                    }
                })
                .catch(err => {
                    console.error("Nominatim geocoding failed", err);
                    onLocationSelect(lat, lng);
                })
                .finally(() => {
                    setIsConfirming(false);
                });
        };

        try {
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === 'OK' && results && results[0]) {
                    const addressComponents = results[0].address_components;
                    let flat = '';
                    let street = '';
                    let city = '';
                    let state = '';
                    let pincode = '';
                    let landmark = '';

                    // Parse address components
                    addressComponents.forEach(component => {
                        const types = component.types;
                        if (types.includes('street_number')) {
                            flat = component.long_name;
                        }
                        if (types.includes('route')) {
                            street = component.long_name;
                        }
                        if (types.includes('locality')) {
                            city = component.long_name;
                        }
                        if (types.includes('administrative_area_level_1')) {
                            state = component.long_name;
                        }
                        if (types.includes('postal_code')) {
                            pincode = component.long_name;
                        }
                        
                        // Extract flat/house names from premises
                        if (types.includes('subpremise') || types.includes('premise')) {
                            if (!flat) flat = component.long_name;
                            else flat = component.long_name + ', ' + flat;
                        }

                        // Landmarks
                        if (types.includes('point_of_interest') || types.includes('establishment')) {
                            if (!landmark) landmark = component.long_name;
                        } else if (!landmark && (types.includes('sublocality') || types.includes('sublocality_level_1'))) {
                            landmark = component.long_name;
                        }
                    });

                    onLocationSelect(lat, lng, {
                        flat,
                        street: street.trim(),
                        city,
                        state,
                        pincode,
                        landmark
                    });
                    setIsConfirming(false);
                } else {
                    console.warn(`Google Geocoding failed with status: ${status}. Falling back to Nominatim.`);
                    fallbackToNominatim();
                }
            });
        } catch (e) {
            console.warn("Error calling Google Geocoder, falling back to Nominatim", e);
            fallbackToNominatim();
        }
    }, [center.lat, center.lng, onLocationSelect]);

    const handleIdle = useCallback(() => {
        // Capture location when map becomes idle (after drag or animation)
        if (!isDragging.current && mapRef.current) {
            const newCenter = mapRef.current.getCenter();
            if (newCenter) {
                const lat = parseFloat(newCenter.lat().toFixed(6));
                const lng = parseFloat(newCenter.lng().toFixed(6));

                // Only update if there's a real change
                if (Math.abs(lat - center.lat) > 0.00001 || Math.abs(lng - center.lng) > 0.00001) {
                    setCenter({ lat, lng });
                    onLocationSelect(lat, lng); // Only update coordinates implicitly
                }
            }
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
                    {/* Pin icon */}
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
                    {/* Shadow dot */}
                    <div
                        className="w-3 h-1 bg-black/20 rounded-full mt-1"
                        style={{ filter: 'blur(1px)' }}
                    />
                </div>
            </div>

            {/* Action overlay */}
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
        </div>
    );
}

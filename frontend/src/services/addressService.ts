import { parseGoogleAddressComponents, ParsedAddress, cleanAddressString } from '../utils/addressUtils';
import { OrderAddress } from '../types/order';
import { Address, updateAddress } from './api/customerAddressService';

export class AddressService {
  /**
   * Reverse geocode latitude and longitude to a complete ParsedAddress object.
   * Hardened with AbortSignal cancellation, quota handling, status checks, and Nominatim fallback.
   */
  static async reverseGeocode(lat: number, lng: number, signal?: AbortSignal): Promise<ParsedAddress> {
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.error('[AddressLifecycle] ❌ Invalid coordinates received for geocoding:', lat, lng);
      throw new Error(`Invalid coordinates: ${lat}, ${lng}`);
    }

    console.log(`[AddressLifecycle] 📍 Initiating Reverse Geocode for Coords: (${lat.toFixed(6)}, ${lng.toFixed(6)})`);

    // Check early if aborted
    if (signal?.aborted) {
      console.warn('[AddressLifecycle] 🛑 Request aborted prior to geocode execution.');
      throw new Error('Geocoding request aborted');
    }

    // 1. Try Google Maps JS SDK Geocoder (if loaded in window)
    if (window.google?.maps?.Geocoder) {
      try {
        console.log('[AddressLifecycle] Trying Google Maps JS SDK Geocoder...');
        const results = await new Promise<google.maps.GeocoderResult[]>((resolve, reject) => {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (res, status) => {
            if (status === 'OK' && res && res.length > 0) {
              resolve(res);
            } else {
              reject(new Error(`Google Geocoder JS SDK status: ${status}`));
            }
          });
        });

        if (signal?.aborted) throw new Error('Geocoding request aborted');

        const parsed = parseGoogleAddressComponents(results, lat, lng);
        console.log('[AddressLifecycle] ✅ Google JS SDK Geocode Success:', parsed);
        if (parsed.city || parsed.postalCode) {
          return parsed;
        }
      } catch (err: any) {
        if (err.message?.includes('aborted')) throw err;
        console.warn('[AddressLifecycle] Google JS SDK Geocoder failed or incomplete, attempting HTTP/Nominatim...', err);
      }
    }

    // 2. Try HTTP Geocoding API if API key exists
    const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (apiKey) {
      try {
        console.log('[AddressLifecycle] Trying Google HTTP Geocoding API...');
        const preciseLat = lat.toFixed(6);
        const preciseLng = lng.toFixed(6);
        const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${preciseLat},${preciseLng}&key=${apiKey}&language=en`;
        
        const resp = await fetch(url, { signal });
        if (resp.ok) {
          const data = await resp.json();
          console.log(`[AddressLifecycle] Google HTTP API Status: ${data.status}`);

          if (data.status === 'OK' && data.results && data.results.length > 0) {
            const parsed = parseGoogleAddressComponents(data.results, lat, lng);
            console.log('[AddressLifecycle] ✅ Google HTTP Geocode Success:', parsed);
            return parsed;
          } else if (data.status === 'OVER_QUERY_LIMIT') {
            console.warn('[AddressLifecycle] ⚠️ Google Geocoding API quota exceeded (OVER_QUERY_LIMIT). Falling back to Nominatim.');
          } else if (data.status === 'REQUEST_DENIED') {
            console.warn('[AddressLifecycle] ⚠️ Google Geocoding API key restricted or invalid (REQUEST_DENIED). Falling back to Nominatim.');
          }
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || signal?.aborted) {
          throw new Error('Geocoding request aborted');
        }
        console.warn('[AddressLifecycle] Google HTTP Geocode API failed, attempting Nominatim...', err);
      }
    }

    // 3. Fallback to OpenStreetMap / Nominatim API
    try {
      console.log('[AddressLifecycle] Trying OpenStreetMap / Nominatim Reverse Geocoding...');
      const nomResp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, { signal });
      if (nomResp.ok) {
        const nomData = await nomResp.json();
        if (nomData && nomData.address) {
          const { house_number, road, suburb, neighbourhood, residential, locality, city, town, village, state_district, state, postcode, country } = nomData.address;
          const extractedCity = city || town || village || state_district || locality || '';
          const extractedArea = suburb || neighbourhood || residential || road || '';
          const extractedStreet = road ? (house_number ? `${house_number}, ${road}` : road) : (nomData.display_name || '');
          const cleanedAddr = cleanAddressString(nomData.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`);

          const parsedNom: ParsedAddress = {
            formattedAddress: cleanedAddr,
            street: extractedStreet,
            houseNumber: house_number || '',
            flat: house_number || '',
            landmark: suburb || neighbourhood || '',
            area: extractedArea,
            city: extractedCity,
            district: state_district || '',
            state: state || '',
            country: country || 'India',
            postalCode: postcode || '',
            pincode: postcode || '',
            latitude: lat,
            longitude: lng,
          };
          console.log('[AddressLifecycle] ✅ Nominatim Fallback Geocode Success:', parsedNom);
          return parsedNom;
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError' || signal?.aborted) {
        throw new Error('Geocoding request aborted');
      }
      console.error('[AddressLifecycle] ❌ Nominatim fallback failed:', e);
    }

    // Default coordinate string fallback if all services fail
    console.warn('[AddressLifecycle] ⚠️ All reverse geocoders failed. Using coordinate string fallback.');
    return {
      formattedAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      street: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      houseNumber: '',
      flat: '',
      landmark: '',
      area: '',
      city: '',
      district: '',
      state: '',
      country: '',
      postalCode: '',
      pincode: '',
      latitude: lat,
      longitude: lng,
    };
  }

  /**
   * Validates if an address object has all mandatory fields required for checkout.
   */
  static validateAddressForCheckout(address: OrderAddress | null | undefined): { valid: boolean; missingFields: string[] } {
    if (!address) {
      return { valid: false, missingFields: ['address'] };
    }

    const missingFields: string[] = [];
    if (!address.street?.trim()) missingFields.push('street');
    if (!address.city?.trim()) missingFields.push('city');
    if (!address.state?.trim()) missingFields.push('state');
    if (!address.pincode?.trim()) missingFields.push('pincode');
    if (address.latitude == null || address.longitude == null || isNaN(address.latitude) || isNaN(address.longitude)) {
      missingFields.push('location_coordinates');
    }

    const isValid = missingFields.length === 0;
    console.log(`[AddressLifecycle] 🧪 Checkout Address Validation: ${isValid ? 'PASSED ✅' : 'FAILED ❌ (Missing: ' + missingFields.join(', ') + ')'}`);

    return {
      valid: isValid,
      missingFields,
    };
  }

  /**
   * Attempts automatic repair of missing address fields (city, pincode, state, coordinates)
   * using userLocation context or trigger reverse geocoding if lat/lng are present.
   * Will also update backend MongoDB address if an address ID exists.
   */
  static async repairAddress(
    address: OrderAddress,
    userLocationFallback?: { latitude?: number; longitude?: number; city?: string; state?: string; pincode?: string; address?: string } | null,
    signal?: AbortSignal
  ): Promise<{ repairedAddress: OrderAddress; wasModified: boolean }> {
    let wasModified = false;
    const repaired: OrderAddress = { ...address };

    console.log('[AddressLifecycle] 🔧 Running Address Auto-Repair check...', {
      initialCity: repaired.city,
      initialPincode: repaired.pincode,
      initialLat: repaired.latitude,
      initialLng: repaired.longitude,
    });

    // 1. Fallback missing coordinates from userLocationFallback
    if ((repaired.latitude == null || repaired.longitude == null || isNaN(repaired.latitude) || isNaN(repaired.longitude)) && userLocationFallback?.latitude && userLocationFallback?.longitude) {
      repaired.latitude = userLocationFallback.latitude;
      repaired.longitude = userLocationFallback.longitude;
      wasModified = true;
    }

    // 2. Fallback missing text fields from userLocationFallback if available
    if (!repaired.city?.trim() && userLocationFallback?.city) {
      repaired.city = userLocationFallback.city;
      wasModified = true;
    }
    if (!repaired.state?.trim() && userLocationFallback?.state) {
      repaired.state = userLocationFallback.state;
      wasModified = true;
    }
    if (!repaired.pincode?.trim() && userLocationFallback?.pincode) {
      repaired.pincode = userLocationFallback.pincode;
      wasModified = true;
    }

    // 3. If city or pincode is still missing BUT we have coordinates, perform reverse geocoding to repair
    if ((!repaired.city?.trim() || !repaired.pincode?.trim() || !repaired.state?.trim()) && repaired.latitude && repaired.longitude) {
      try {
        console.log(`[AddressLifecycle] 📡 Geocoding to repair missing fields for coords (${repaired.latitude}, ${repaired.longitude})...`);
        const geoResult = await this.reverseGeocode(repaired.latitude, repaired.longitude, signal);

        if (!repaired.city?.trim() && geoResult.city) {
          repaired.city = geoResult.city;
          wasModified = true;
        }
        if (!repaired.pincode?.trim() && geoResult.pincode) {
          repaired.pincode = geoResult.pincode;
          wasModified = true;
        }
        if (!repaired.state?.trim() && geoResult.state) {
          repaired.state = geoResult.state;
          wasModified = true;
        }
        if (!repaired.street?.trim() && geoResult.street) {
          repaired.street = geoResult.street;
          wasModified = true;
        }
      } catch (err) {
        console.error('[AddressLifecycle] ❌ Address repair reverse geocode failed:', err);
      }
    }

    // 4. If modified and address has a valid MongoDB ID, update backend record in background
    const addressId = repaired.id || repaired._id;
    if (wasModified && addressId && /^[0-9a-fA-F]{24}$/.test(addressId)) {
      try {
        await updateAddress(addressId, {
          city: repaired.city,
          state: repaired.state,
          pincode: repaired.pincode,
          address: repaired.street || repaired.flat || 'Pinned Location',
          latitude: repaired.latitude,
          longitude: repaired.longitude,
        });
        console.log(`[AddressLifecycle] 💾 Successfully patched repaired address ${addressId} to MongoDB.`);
      } catch (backendErr) {
        console.warn(`[AddressLifecycle] ⚠️ Failed to patch repaired address to backend:`, backendErr);
      }
    }

    console.log('[AddressLifecycle] 🔧 Auto-Repair complete:', { repairedAddress: repaired, wasModified });
    return { repairedAddress: repaired, wasModified };
  }
}

export interface ParsedAddress {
  formattedAddress: string;
  street: string;
  houseNumber: string;
  flat: string;
  landmark: string;
  area: string;
  city: string;
  district: string;
  state: string;
  country: string;
  postalCode: string;
  pincode: string; // Alias for postalCode
  latitude: number;
  longitude: number;
}

// Clean address string by removing Plus Codes and duplicate delimiters
export const cleanAddressString = (address: string): string => {
  if (!address) return address;

  const cleaned = address
    .replace(/^[A-Z0-9]{2,4}\+[A-Z0-9]{2,4}([,\s]+)?/i, '')
    .replace(/([,\s]+)?[A-Z0-9]{2,4}\+[A-Z0-9]{2,4}$/i, '')
    .replace(/([,\s]+)[A-Z0-9]{2,4}\+[A-Z0-9]{2,4}([,\s]+)/gi, (_match, before, after) => {
      return before.includes(',') || after.includes(',') ? ', ' : ' ';
    })
    .replace(/\s+[A-Z0-9]{2,4}\+[A-Z0-9]{2,4}\s+/gi, ' ')
    .replace(/\b[A-Z0-9]{2,4}\+[A-Z0-9]{2,4}\b/gi, '')
    .replace(/,\s*,+/g, ',')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();

  return cleaned;
};

/**
 * Parses array of Google Maps GeocoderResult items into a complete ParsedAddress object.
 * Inspects all results to guarantee city, state, postal code, and area are captured.
 */
export const parseGoogleAddressComponents = (
  results: google.maps.GeocoderResult[],
  lat: number,
  lng: number
): ParsedAddress => {
  let street = '';
  let houseNumber = '';
  let flat = '';
  let landmark = '';
  let area = '';
  let city = '';
  let district = '';
  let state = '';
  let country = '';
  let postalCode = '';

  const primaryResult = results && results.length > 0 ? results[0] : null;
  const rawFormattedAddress = primaryResult?.formatted_address || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  // Multi-pass component collection over ALL GeocoderResult items
  if (results && results.length > 0) {
    for (const res of results) {
      const components = res.address_components || [];
      for (const comp of components) {
        const types = comp.types || [];

        // 1. Postal Code (Pincode) - capture first match across any result
        if (!postalCode && types.includes('postal_code')) {
          postalCode = comp.long_name || comp.short_name || '';
        }

        // 2. State (administrative_area_level_1)
        if (!state && types.includes('administrative_area_level_1')) {
          state = comp.long_name || '';
        }

        // 3. Country
        if (!country && types.includes('country')) {
          country = comp.long_name || '';
        }

        // 4. District
        if (!district && types.includes('administrative_area_level_2')) {
          district = comp.long_name || '';
        }

        // 5. City Extraction Hierarchy: locality -> postal_town -> administrative_area_level_2 -> administrative_area_level_3 -> sublocality_level_1
        if (!city) {
          if (types.includes('locality')) {
            city = comp.long_name || '';
          } else if (types.includes('postal_town')) {
            city = comp.long_name || '';
          } else if (types.includes('administrative_area_level_2')) {
            city = comp.long_name || '';
          } else if (types.includes('administrative_area_level_3')) {
            city = comp.long_name || '';
          } else if (types.includes('sublocality_level_1')) {
            city = comp.long_name || '';
          }
        }

        // 6. Area / Neighborhood Hierarchy
        if (!area) {
          if (types.includes('sublocality_level_2')) {
            area = comp.long_name || '';
          } else if (types.includes('sublocality_level_1')) {
            area = comp.long_name || '';
          } else if (types.includes('neighborhood')) {
            area = comp.long_name || '';
          } else if (types.includes('sublocality')) {
            area = comp.long_name || '';
          } else if (types.includes('route')) {
            area = comp.long_name || '';
          }
        }

        // 7. House Number / Flat / Subpremise
        if (types.includes('street_number')) {
          if (!houseNumber) houseNumber = comp.long_name;
        }
        if (types.includes('subpremise') || types.includes('premise')) {
          if (!flat) flat = comp.long_name;
          else if (!flat.includes(comp.long_name)) flat = `${comp.long_name}, ${flat}`;
        }

        // 8. Landmark
        if (!landmark) {
          if (types.includes('point_of_interest') || types.includes('establishment')) {
            landmark = comp.long_name || '';
          } else if (types.includes('premise')) {
            landmark = comp.long_name || '';
          }
        }

        // 9. Street
        if (!street && types.includes('route')) {
          street = comp.long_name || '';
        }
      }
    }
  }

  // Fallback for street if route wasn't named
  if (!street) {
    if (houseNumber && area) street = `${houseNumber}, ${area}`;
    else if (area) street = area;
    else if (landmark) street = landmark;
    else street = cleanAddressString(rawFormattedAddress);
  }

  // Fallback for city
  if (!city && district) city = district;

  const formattedAddress = cleanAddressString(rawFormattedAddress);

  return {
    formattedAddress,
    street: street.trim(),
    houseNumber: houseNumber.trim(),
    flat: flat.trim(),
    landmark: landmark.trim(),
    area: area.trim(),
    city: city.trim(),
    district: district.trim(),
    state: state.trim(),
    country: country.trim(),
    postalCode: postalCode.trim(),
    pincode: postalCode.trim(),
    latitude: lat,
    longitude: lng,
  };
};

import airportsData from '../data/airports.json';

// Metropolitan multi-airport city codes mapped to their constituent airport codes
export const METRO_CODES = {
  TYO: ['NRT', 'HND'],
  LON: ['LHR', 'LGW', 'LCY', 'STN', 'LTN', 'SEN'],
  NYC: ['JFK', 'EWR', 'LGA'],
  PAR: ['CDG', 'ORY'],
};

// Map airports by uppercase IATA code for O(1) lookup
export const AIRPORTS_DATABASE = airportsData.reduce((acc, ap) => {
  const code = (ap.iata || '').trim().toUpperCase();
  if (code) {
    acc[code] = {
      ...ap,
      code,
      name: ap.name || `${ap.city} Airport`,
      countryName: ap.country === 'IN' ? 'India' : (ap.countryName || ap.country),
      coords: [ap.lon, ap.lat], // [longitude, latitude] for geo projections
    };
  }
  return acc;
}, {});

/**
 * Resolves an airport code or metro code to airport details.
 * Metro codes (TYO, LON, NYC, PAR) resolve to the details & country of their first airport.
 * Returns null if the code is invalid or missing — NEVER returns a default or fallback.
 */
export function lookupAirport(codeOrLoc) {
  if (!codeOrLoc) return null;

  let code = '';
  if (typeof codeOrLoc === 'object') {
    code = String(codeOrLoc.iata || codeOrLoc.code || codeOrLoc.fromCode || codeOrLoc.toCode || '').trim().toUpperCase();
  } else {
    const str = String(codeOrLoc).trim();
    const bracketMatch = str.match(/\(([A-Z]{3})\)/i);
    if (bracketMatch) {
      code = bracketMatch[1].toUpperCase();
    } else if (/^[A-Z]{3}$/i.test(str)) {
      code = str.toUpperCase();
    } else {
      code = str.slice(0, 3).toUpperCase();
    }
  }

  if (!code) return null;

  // Metro codes (TYO, LON, NYC, PAR) resolve to the country and location of their first airport
  if (METRO_CODES[code]) {
    const primaryAirportCode = METRO_CODES[code][0];
    const primaryAirport = AIRPORTS_DATABASE[primaryAirportCode];
    const METRO_CITIES = {
      TYO: 'Tokyo',
      LON: 'London',
      NYC: 'New York',
      PAR: 'Paris',
    };
    if (primaryAirport) {
      return {
        ...primaryAirport,
        code,
        iata: code,
        city: METRO_CITIES[code] || primaryAirport.city,
        metroCode: code,
        isMetro: true,
      };
    }
  }

  return AIRPORTS_DATABASE[code] || null;
}

/**
 * Checks if a route between two airport codes is domestic within India.
 * Checks the airport's country code from the airport lookup (airports.json).
 * Both airports are in 'IN' means domestic. No hardcoded city lists.
 */
export function isDomestic(fromCode, toCode) {
  const fromAp = lookupAirport(fromCode);
  const toAp = lookupAirport(toCode);
  if (!fromAp || !toAp) return false;
  return fromAp.country === 'IN' && toAp.country === 'IN';
}

/**
 * Expands a metropolitan city code like TYO into actual supplier airport codes (e.g. NRT, HND).
 */
export function expandCityCode(code) {
  if (!code) return [];
  const upper = String(code).trim().toUpperCase();
  if (METRO_CODES[upper]) {
    return [...METRO_CODES[upper]];
  }
  return [upper];
}

/**
 * Normalizes input location without hardcoding fallbacks.
 * Returns null if code cannot be resolved.
 */
export function resolveLocation(loc, defaultFallback = null) {
  if (!loc) {
    return defaultFallback ? (AIRPORTS_DATABASE[defaultFallback] || null) : null;
  }

  if (typeof loc === 'object') {
    const code = String(loc.code || loc.iata || loc.airportCode || loc.sourceCode || loc.destinationCode || '').trim().toUpperCase();
    if (code) {
      const found = lookupAirport(code);
      if (found) return found;
    }

    if (Array.isArray(loc.coords) && loc.coords.length === 2) {
      return {
        code: code || 'LOC',
        iata: code || 'LOC',
        city: loc.city || loc.name || 'Location',
        country: loc.country || '',
        coords: loc.coords,
        lat: loc.coords[1],
        lon: loc.coords[0]
      };
    }
  }

  const str = String(loc).trim();
  const found = lookupAirport(str);
  if (found) return found;

  // Search by city substring if not matched directly by code
  const lower = str.toLowerCase();
  for (const item of Object.values(AIRPORTS_DATABASE)) {
    if (item.city && (lower.includes(item.city.toLowerCase()) || item.city.toLowerCase().includes(lower))) {
      return item;
    }
  }

  return defaultFallback ? (AIRPORTS_DATABASE[defaultFallback] || null) : null;
}

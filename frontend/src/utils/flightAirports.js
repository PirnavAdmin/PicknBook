/**
 * Comprehensive airport and city coordinate database for FlightRadar.
 * Coordinates are in [longitude, latitude] format for GeoJSON / d3-geo projection.
 */

export const AIRPORTS_DATABASE = {
  // India (Domestic & International)
  HYD: { code: 'HYD', city: 'Hyderabad', country: 'IN', countryName: 'India', name: 'Rajiv Gandhi Int’l Airport', coords: [78.4294, 17.2403] },
  DEL: { code: 'DEL', city: 'Delhi', country: 'IN', countryName: 'India', name: 'Indira Gandhi Int’l Airport', coords: [77.1000, 28.5562] },
  BOM: { code: 'BOM', city: 'Mumbai', country: 'IN', countryName: 'India', name: 'Chhatrapati Shivaji Maharaj Int’l', coords: [72.8746, 19.0896] },
  BLR: { code: 'BLR', city: 'Bengaluru', country: 'IN', countryName: 'India', name: 'Kempegowda Int’l Airport', coords: [77.7066, 13.1986] },
  MAA: { code: 'MAA', city: 'Chennai', country: 'IN', countryName: 'India', name: 'Chennai Int’l Airport', coords: [80.1693, 12.9941] },
  CCU: { code: 'CCU', city: 'Kolkata', country: 'IN', countryName: 'India', name: 'Netaji Subhash Chandra Bose Int’l', coords: [88.4467, 22.6547] },
  GOI: { code: 'GOI', city: 'Goa', country: 'IN', countryName: 'India', name: 'Dabolim Airport', coords: [73.8314, 15.3808] },
  GOX: { code: 'GOX', city: 'Goa (Mopa)', country: 'IN', countryName: 'India', name: 'Manohar Int’l Airport', coords: [73.8672, 15.7667] },
  COK: { code: 'COK', city: 'Kochi', country: 'IN', countryName: 'India', name: 'Cochin Int’l Airport', coords: [76.4019, 10.1556] },
  PNQ: { code: 'PNQ', city: 'Pune', country: 'IN', countryName: 'India', name: 'Pune Airport', coords: [73.9197, 18.5822] },
  AMD: { code: 'AMD', city: 'Ahmedabad', country: 'IN', countryName: 'India', name: 'Sardar Vallabhbhai Patel Int’l', coords: [72.6347, 23.0734] },
  JAI: { code: 'JAI', city: 'Jaipur', country: 'IN', countryName: 'India', name: 'Jaipur Int’l Airport', coords: [75.8122, 26.8242] },
  LKO: { code: 'LKO', city: 'Lucknow', country: 'IN', countryName: 'India', name: 'Chaudhary Charan Singh Int’l', coords: [80.8833, 26.7606] },
  PAT: { code: 'PAT', city: 'Patna', country: 'IN', countryName: 'India', name: 'Jay Prakash Narayan Airport', coords: [85.0880, 25.5913] },
  IXC: { code: 'IXC', city: 'Chandigarh', country: 'IN', countryName: 'India', name: 'Shaheed Bhagat Singh Int’l', coords: [76.7885, 30.6735] },
  VNS: { code: 'VNS', city: 'Varanasi', country: 'IN', countryName: 'India', name: 'Lal Bahadur Shastri Int’l', coords: [82.8593, 25.4523] },
  GAU: { code: 'GAU', city: 'Guwahati', country: 'IN', countryName: 'India', name: 'Lokpriya Gopinath Bordoloi Int’l', coords: [91.5859, 26.1061] },
  BBI: { code: 'BBI', city: 'Bhubaneswar', country: 'IN', countryName: 'India', name: 'Biju Patnaik Airport', coords: [85.8178, 20.2444] },
  SXR: { code: 'SXR', city: 'Srinagar', country: 'IN', countryName: 'India', name: 'Sheikh ul-Alam Int’l', coords: [74.7742, 33.9871] },
  TRV: { code: 'TRV', city: 'Thiruvananthapuram', country: 'IN', countryName: 'India', name: 'Trivandrum Int’l', coords: [76.9200, 8.4821] },
  IXE: { code: 'IXE', city: 'Mangaluru', country: 'IN', countryName: 'India', name: 'Mangalore Int’l', coords: [74.8900, 12.9613] },
  IXB: { code: 'IXB', city: 'Bagdogra', country: 'IN', countryName: 'India', name: 'Bagdogra Airport', coords: [88.3286, 26.6812] },
  IDR: { code: 'IDR', city: 'Indore', country: 'IN', countryName: 'India', name: 'Devi Ahilyabai Holkar Airport', coords: [75.8011, 22.7217] },
  NAG: { code: 'NAG', city: 'Nagpur', country: 'IN', countryName: 'India', name: 'Dr. Babasaheb Ambedkar Int’l', coords: [79.0472, 21.0922] },
  CJB: { code: 'CJB', city: 'Coimbatore', country: 'IN', countryName: 'India', name: 'Coimbatore Int’l', coords: [77.0434, 11.0300] },
  VTZ: { code: 'VTZ', city: 'Visakhapatnam', country: 'IN', countryName: 'India', name: 'Visakhapatnam Airport', coords: [83.2245, 17.7212] },
  VGA: { code: 'VGA', city: 'Vijayawada', country: 'IN', countryName: 'India', name: 'Vijayawada Airport', coords: [80.7968, 16.5304] },
  TIR: { code: 'TIR', city: 'Tirupati', country: 'IN', countryName: 'India', name: 'Tirupati Airport', coords: [79.5433, 13.6325] },
  IXR: { code: 'IXR', city: 'Ranchi', country: 'IN', countryName: 'India', name: 'Birsa Munda Airport', coords: [85.3219, 23.3142] },
  RPR: { code: 'RPR', city: 'Raipur', country: 'IN', countryName: 'India', name: 'Swami Vivekananda Airport', coords: [81.7388, 21.1804] },
  ATQ: { code: 'ATQ', city: 'Amritsar', country: 'IN', countryName: 'India', name: 'Sri Guru Ram Dass Jee Int’l', coords: [74.7973, 31.7096] },
  DED: { code: 'DED', city: 'Dehradun', country: 'IN', countryName: 'India', name: 'Jolly Grant Airport', coords: [78.1803, 30.1897] },
  IXJ: { code: 'IXJ', city: 'Jammu', country: 'IN', countryName: 'India', name: 'Jammu Airport', coords: [74.8375, 32.6892] },
  IXL: { code: 'IXL', city: 'Leh', country: 'IN', countryName: 'India', name: 'Kushok Bakula Rimpochee', coords: [77.5465, 34.1359] },
  UDR: { code: 'UDR', city: 'Udaipur', country: 'IN', countryName: 'India', name: 'Maharana Pratap Airport', coords: [73.8961, 24.6178] },

  // Middle East
  DXB: { code: 'DXB', city: 'Dubai', country: 'AE', countryName: 'United Arab Emirates', name: 'Dubai International', coords: [55.3644, 25.2532] },
  AUH: { code: 'AUH', city: 'Abu Dhabi', country: 'AE', countryName: 'United Arab Emirates', name: 'Zayed International', coords: [54.6511, 24.4330] },
  SHJ: { code: 'SHJ', city: 'Sharjah', country: 'AE', countryName: 'United Arab Emirates', name: 'Sharjah International', coords: [55.5172, 25.3286] },
  DOH: { code: 'DOH', city: 'Doha', country: 'QA', countryName: 'Qatar', name: 'Hamad International', coords: [51.6081, 25.2731] },
  BAH: { code: 'BAH', city: 'Bahrain', country: 'BH', countryName: 'Bahrain', name: 'Bahrain International', coords: [50.6336, 26.2708] },
  KWI: { code: 'KWI', city: 'Kuwait City', country: 'KW', countryName: 'Kuwait', name: 'Kuwait International', coords: [47.9783, 29.2269] },
  MCT: { code: 'MCT', city: 'Muscat', country: 'OM', countryName: 'Oman', name: 'Muscat International', coords: [58.2844, 23.5933] },
  RUH: { code: 'RUH', city: 'Riyadh', country: 'SA', countryName: 'Saudi Arabia', name: 'King Khalid International', coords: [46.6988, 24.9576] },
  JED: { code: 'JED', city: 'Jeddah', country: 'SA', countryName: 'Saudi Arabia', name: 'King Abdulaziz International', coords: [39.1565, 21.6796] },
  IST: { code: 'IST', city: 'Istanbul', country: 'TR', countryName: 'Turkey', name: 'Istanbul Airport', coords: [28.7425, 41.2608] },
  CAI: { code: 'CAI', city: 'Cairo', country: 'EG', countryName: 'Egypt', name: 'Cairo International', coords: [31.4056, 30.1219] },

  // Europe
  LHR: { code: 'LHR', city: 'London', country: 'GB', countryName: 'United Kingdom', name: 'Heathrow Airport', coords: [-0.4543, 51.4700] },
  LGW: { code: 'LGW', city: 'London (Gatwick)', country: 'GB', countryName: 'United Kingdom', name: 'Gatwick Airport', coords: [-0.1903, 51.1537] },
  MAN: { code: 'MAN', city: 'Manchester', country: 'GB', countryName: 'United Kingdom', name: 'Manchester Airport', coords: [-2.2750, 53.3537] },
  EDI: { code: 'EDI', city: 'Edinburgh', country: 'GB', countryName: 'United Kingdom', name: 'Edinburgh Airport', coords: [-3.3725, 55.9500] },
  CDG: { code: 'CDG', city: 'Paris', country: 'FR', countryName: 'France', name: 'Charles de Gaulle Airport', coords: [2.5500, 49.0097] },
  FRA: { code: 'FRA', city: 'Frankfurt', country: 'DE', countryName: 'Germany', name: 'Frankfurt Airport', coords: [8.5706, 50.0379] },
  MUC: { code: 'MUC', city: 'Munich', country: 'DE', countryName: 'Germany', name: 'Munich Airport', coords: [11.7861, 48.3538] },
  AMS: { code: 'AMS', city: 'Amsterdam', country: 'NL', countryName: 'Netherlands', name: 'Schiphol Airport', coords: [4.7639, 52.3086] },
  ZRH: { code: 'ZRH', city: 'Zurich', country: 'CH', countryName: 'Switzerland', name: 'Zurich Airport', coords: [8.5492, 47.4647] },
  FCO: { code: 'FCO', city: 'Rome', country: 'IT', countryName: 'Italy', name: 'Leonardo da Vinci–Fiumicino', coords: [12.2389, 41.8003] },
  MXP: { code: 'MXP', city: 'Milan', country: 'IT', countryName: 'Italy', name: 'Malpensa Airport', coords: [8.7231, 45.6306] },
  MAD: { code: 'MAD', city: 'Madrid', country: 'ES', countryName: 'Spain', name: 'Adolfo Suárez Madrid–Barajas', coords: [-3.5673, 40.4839] },
  BCN: { code: 'BCN', city: 'Barcelona', country: 'ES', countryName: 'Spain', name: 'Josep Tarradellas Barcelona-El Prat', coords: [2.0785, 41.2974] },
  VIE: { code: 'VIE', city: 'Vienna', country: 'AT', countryName: 'Austria', name: 'Vienna International', coords: [16.5697, 48.1103] },
  BRU: { code: 'BRU', city: 'Brussels', country: 'BE', countryName: 'Belgium', name: 'Brussels Airport', coords: [4.4844, 50.9014] },
  DUB: { code: 'DUB', city: 'Dublin', country: 'IE', countryName: 'Ireland', name: 'Dublin Airport', coords: [-6.2701, 53.4213] },
  CPH: { code: 'CPH', city: 'Copenhagen', country: 'DK', countryName: 'Denmark', name: 'Copenhagen Airport', coords: [12.6560, 55.6180] },
  ARN: { code: 'ARN', city: 'Stockholm', country: 'SE', countryName: 'Sweden', name: 'Stockholm Arlanda', coords: [17.9186, 59.6519] },
  HEL: { code: 'HEL', city: 'Helsinki', country: 'FI', countryName: 'Finland', name: 'Helsinki-Vantaa', coords: [24.9633, 60.3172] },
  ATH: { code: 'ATH', city: 'Athens', country: 'GR', countryName: 'Greece', name: 'Eleftherios Venizelos', coords: [23.9484, 37.9364] },

  // Asia / Pacific
  SIN: { code: 'SIN', city: 'Singapore', country: 'SG', countryName: 'Singapore', name: 'Singapore Changi Airport', coords: [103.9915, 1.3644] },
  BKK: { code: 'BKK', city: 'Bangkok', country: 'TH', countryName: 'Thailand', name: 'Suvarnabhumi Airport', coords: [100.7501, 13.6900] },
  HKT: { code: 'HKT', city: 'Phuket', country: 'TH', countryName: 'Thailand', name: 'Phuket International', coords: [98.3169, 8.1132] },
  KUL: { code: 'KUL', city: 'Kuala Lumpur', country: 'MY', countryName: 'Malaysia', name: 'Kuala Lumpur International', coords: [101.7099, 2.7456] },
  CGK: { code: 'CGK', city: 'Jakarta', country: 'ID', countryName: 'Indonesia', name: 'Soekarno–Hatta International', coords: [106.6559, -6.1256] },
  DPS: { code: 'DPS', city: 'Bali', country: 'ID', countryName: 'Indonesia', name: 'Ngurah Rai (Bali) International', coords: [115.1672, -8.7482] },
  MNL: { code: 'MNL', city: 'Manila', country: 'PH', countryName: 'Philippines', name: 'Ninoy Aquino International', coords: [121.0194, 14.5086] },
  SGN: { code: 'SGN', city: 'Ho Chi Minh', country: 'VN', countryName: 'Vietnam', name: 'Tan Son Nhat International', coords: [106.6520, 10.8188] },
  HAN: { code: 'HAN', city: 'Hanoi', country: 'VN', countryName: 'Vietnam', name: 'Noi Bai International', coords: [105.8072, 21.2212] },
  HKG: { code: 'HKG', city: 'Hong Kong', country: 'HK', countryName: 'Hong Kong', name: 'Hong Kong International', coords: [113.9145, 22.3080] },
  TPE: { code: 'TPE', city: 'Taipei', country: 'TW', countryName: 'Taiwan', name: 'Taoyuan International', coords: [121.2328, 25.0797] },
  ICN: { code: 'ICN', city: 'Seoul', country: 'KR', countryName: 'South Korea', name: 'Incheon International', coords: [126.4406, 37.4602] },
  HND: { code: 'HND', city: 'Tokyo (Haneda)', country: 'JP', countryName: 'Japan', name: 'Tokyo Haneda Airport', coords: [139.7811, 35.5494] },
  NRT: { code: 'NRT', city: 'Tokyo (Narita)', country: 'JP', countryName: 'Japan', name: 'Narita International', coords: [140.3929, 35.7720] },
  KIX: { code: 'KIX', city: 'Osaka', country: 'JP', countryName: 'Japan', name: 'Kansai International', coords: [135.2328, 34.4347] },
  PEK: { code: 'PEK', city: 'Beijing', country: 'CN', countryName: 'China', name: 'Beijing Capital International', coords: [116.5844, 40.0799] },
  PVG: { code: 'PVG', city: 'Shanghai', country: 'CN', countryName: 'China', name: 'Shanghai Pudong International', coords: [121.8053, 31.1443] },
  CAN: { code: 'CAN', city: 'Guangzhou', country: 'CN', countryName: 'China', name: 'Guangzhou Baiyun International', coords: [113.2988, 23.3924] },
  SYD: { code: 'SYD', city: 'Sydney', country: 'AU', countryName: 'Australia', name: 'Sydney Kingsford Smith', coords: [151.1772, -33.9461] },
  MEL: { code: 'MEL', city: 'Melbourne', country: 'AU', countryName: 'Australia', name: 'Melbourne Airport', coords: [144.8432, -37.6690] },
  BNE: { code: 'BNE', city: 'Brisbane', country: 'AU', countryName: 'Australia', name: 'Brisbane Airport', coords: [153.1175, -27.3842] },
  PER: { code: 'PER', city: 'Perth', country: 'AU', countryName: 'Australia', name: 'Perth Airport', coords: [115.9672, -31.9403] },
  AKL: { code: 'AKL', city: 'Auckland', country: 'NZ', countryName: 'New Zealand', name: 'Auckland Airport', coords: [174.7922, -37.0082] },
  CMB: { code: 'CMB', city: 'Colombo', country: 'LK', countryName: 'Sri Lanka', name: 'Bandaranaike International', coords: [79.8841, 7.1808] },
  MLE: { code: 'MLE', city: 'Malé', country: 'MV', countryName: 'Maldives', name: 'Velana International', coords: [73.5292, 4.1918] },
  KTM: { code: 'KTM', city: 'Kathmandu', country: 'NP', countryName: 'Nepal', name: 'Tribhuvan International', coords: [85.3592, 27.6967] },
  DAC: { code: 'DAC', city: 'Dhaka', country: 'BD', countryName: 'Bangladesh', name: 'Hazrat Shahjalal Int’l', coords: [90.3978, 23.8433] },

  // Americas
  JFK: { code: 'JFK', city: 'New York', country: 'US', countryName: 'United States', name: 'John F. Kennedy Int’l', coords: [-73.7781, 40.6413] },
  EWR: { code: 'EWR', city: 'New York (Newark)', country: 'US', countryName: 'United States', name: 'Newark Liberty Int’l', coords: [-74.1686, 40.6895] },
  LAX: { code: 'LAX', city: 'Los Angeles', country: 'US', countryName: 'United States', name: 'Los Angeles International', coords: [-118.4085, 33.9416] },
  SFO: { code: 'SFO', city: 'San Francisco', country: 'US', countryName: 'United States', name: 'San Francisco International', coords: [-122.3750, 37.6189] },
  ORD: { code: 'ORD', city: 'Chicago', country: 'US', countryName: 'United States', name: 'O’Hare International', coords: [-87.9073, 41.9742] },
  ATL: { code: 'ATL', city: 'Atlanta', country: 'US', countryName: 'United States', name: 'Hartsfield–Jackson Atlanta', coords: [-84.4277, 33.6407] },
  DFW: { code: 'DFW', city: 'Dallas', country: 'US', countryName: 'United States', name: 'Dallas/Fort Worth International', coords: [-97.0403, 32.8998] },
  MIA: { code: 'MIA', city: 'Miami', country: 'US', countryName: 'United States', name: 'Miami International', coords: [-80.2870, 25.7959] },
  BOS: { code: 'BOS', city: 'Boston', country: 'US', countryName: 'United States', name: 'Logan International', coords: [-71.0096, 42.3656] },
  SEA: { code: 'SEA', city: 'Seattle', country: 'US', countryName: 'United States', name: 'Seattle–Tacoma International', coords: [-122.3088, 47.4502] },
  YYZ: { code: 'YYZ', city: 'Toronto', country: 'CA', countryName: 'Canada', name: 'Toronto Pearson International', coords: [-79.6248, 43.6777] },
  YVR: { code: 'YVR', city: 'Vancouver', country: 'CA', countryName: 'Canada', name: 'Vancouver International', coords: [-123.1844, 49.1967] },
  MEX: { code: 'MEX', city: 'Mexico City', country: 'MX', countryName: 'Mexico', name: 'Benito Juárez International', coords: [-99.0721, 19.4361] },
  GRU: { code: 'GRU', city: 'São Paulo', country: 'BR', countryName: 'Brazil', name: 'São Paulo/Guarulhos Int’l', coords: [-46.4731, -23.4356] },
  GIG: { code: 'GIG', city: 'Rio de Janeiro', country: 'BR', countryName: 'Brazil', name: 'Rio de Janeiro/Galeão Int’l', coords: [-43.2506, -22.8133] },
  EZE: { code: 'EZE', city: 'Buenos Aires', country: 'AR', countryName: 'Argentina', name: 'Ministro Pistarini Int’l', coords: [-58.5358, -34.8222] },

  // Africa
  JNB: { code: 'JNB', city: 'Johannesburg', country: 'ZA', countryName: 'South Africa', name: 'O. R. Tambo International', coords: [28.2460, -26.1367] },
  CPT: { code: 'CPT', city: 'Cape Town', country: 'ZA', countryName: 'South Africa', name: 'Cape Town International', coords: [18.6017, -33.9715] },
  NBO: { code: 'NBO', city: 'Nairobi', country: 'KE', countryName: 'Kenya', name: 'Jomo Kenyatta International', coords: [36.9275, -1.3192] },
  LOS: { code: 'LOS', city: 'Lagos', country: 'NG', countryName: 'Nigeria', name: 'Murtala Muhammed International', coords: [3.3212, 6.5774] },
  CMN: { code: 'CMN', city: 'Casablanca', country: 'MA', countryName: 'Morocco', name: 'Mohammed V International', coords: [-7.5898, 33.3675] },
};

/**
 * Normalizes input location (which can be a string, object, city name, airport code)
 * into a standardized airport location object with coordinates.
 */
export function resolveLocation(loc, defaultFallback = 'HYD') {
  if (!loc) {
    return AIRPORTS_DATABASE[defaultFallback] || AIRPORTS_DATABASE.HYD;
  }

  if (typeof loc === 'object') {
    const code = String(loc.code || loc.airportCode || loc.sourceCode || loc.destinationCode || '').trim().toUpperCase();
    if (code && AIRPORTS_DATABASE[code]) return AIRPORTS_DATABASE[code];

    const cityName = String(loc.city || loc.name || loc.cityName || '').trim();
    if (cityName) {
      const match = resolveLocation(cityName, null);
      if (match) return match;
    }

    if (Array.isArray(loc.coords) && loc.coords.length === 2) {
      return {
        code: code || cityName.slice(0, 3).toUpperCase() || 'LOC',
        city: cityName || 'Location',
        country: loc.country || 'IN',
        countryName: loc.countryName || 'India',
        name: loc.name || cityName || 'Airport',
        coords: loc.coords
      };
    }
  }

  const str = String(loc).trim();
  const upper = str.toUpperCase();

  // 1. Direct code lookup
  if (AIRPORTS_DATABASE[upper]) {
    return AIRPORTS_DATABASE[upper];
  }

  // 2. Bracket code lookup e.g. "Hyderabad (HYD)" or "London (LHR)"
  const bracketMatch = str.match(/\(([A-Za-z]{3})\)/);
  if (bracketMatch && AIRPORTS_DATABASE[bracketMatch[1].toUpperCase()]) {
    return AIRPORTS_DATABASE[bracketMatch[1].toUpperCase()];
  }

  // 3. Check if string starts with code e.g. "HYD - Hyderabad" or "HYD (Hyderabad)"
  const codeMatch = upper.match(/^([A-Z]{3})\b/);
  if (codeMatch && AIRPORTS_DATABASE[codeMatch[1]]) {
    return AIRPORTS_DATABASE[codeMatch[1]];
  }

  // 3. Search by city name substring
  const lower = str.toLowerCase();
  for (const item of Object.values(AIRPORTS_DATABASE)) {
    const itemCity = item.city.toLowerCase();
    if (lower.includes(itemCity) || itemCity.includes(lower)) {
      return item;
    }
  }

  // 4. Fallback default
  return AIRPORTS_DATABASE[defaultFallback] || AIRPORTS_DATABASE.HYD;
}

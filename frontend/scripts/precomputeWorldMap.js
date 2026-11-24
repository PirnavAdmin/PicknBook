const fs = require('fs');
const path = require('path');
const d3Geo = require('d3-geo');
const topojson = require('topojson-client');
const world = require('world-atlas/countries-110m.json');

// 1. Setup projection exactly as specified:
// d3.geoEquirectangular().scale(1000/(2*Math.PI)).translate([500,250])
const projection = d3Geo.geoEquirectangular()
  .scale(1000 / (2 * Math.PI))
  .translate([500, 250]);

const pathGenerator = d3Geo.geoPath(projection);

// 2. Palette for greedy graph coloring:
const palette = [
  '#ffd3d1',
  '#ffe6c2',
  '#fff3b8',
  '#d4f0c8',
  '#c6ecf0',
  '#d6dbff',
  '#efd3f6'
];

const geometries = world.objects.countries.geometries;
const neighbors = topojson.neighbors(geometries);

// Greedy graph coloring
const colors = new Array(geometries.length);
geometries.forEach((g, i) => {
  const neighborColors = new Set(neighbors[i].map(n => colors[n]).filter(Boolean));
  colors[i] = palette.find(c => !neighborColors.has(c)) || palette[0];
});

// Map of numeric ID to ISO2 code for domestic/states detection
const NUMERIC_TO_ISO2 = {
  '356': 'IN', // India
  '840': 'US', // United States
  '124': 'CA', // Canada
  '036': 'AU', // Australia
  '076': 'BR', // Brazil
  '156': 'CN', // China
  '360': 'ID', // Indonesia
  '643': 'RU', // Russia
  '710': 'ZA', // South Africa
  '826': 'GB', // United Kingdom
  '784': 'AE', // United Arab Emirates
  '702': 'SG', // Singapore
  '250': 'FR', // France
  '276': 'DE', // Germany
  '392': 'JP', // Japan
  '410': 'KR', // South Korea
  '764': 'TH', // Thailand
  '458': 'MY', // Malaysia
  '528': 'NL', // Netherlands
  '756': 'CH', // Switzerland
  '724': 'ES', // Spain
  '380': 'IT', // Italy
  '792': 'TR', // Turkey
  '682': 'SA', // Saudi Arabia
  '634': 'QA', // Qatar
  '512': 'OM', // Oman
  '414': 'KW', // Kuwait
  '048': 'BH', // Bahrain
  '586': 'PK', // Pakistan
  '050': 'BD', // Bangladesh
  '144': 'LK', // Sri Lanka
  '524': 'NP'  // Nepal
};

const allFeatures = topojson.feature(world, world.objects.countries).features;

const precomputedCountries = [];

allFeatures.forEach((feature, index) => {
  const idStr = String(feature.id).padStart(3, '0');
  const name = feature.properties?.name || '';

  // Exclude Antarctica (id '010' or name 'Antarctica')
  if (idStr === '010' || name === 'Antarctica') {
    return;
  }

  const d = pathGenerator(feature);
  if (!d) return;

  const bounds = pathGenerator.bounds(feature); // [[x0, y0], [x1, y1]]
  const centroid = pathGenerator.centroid(feature); // [cx, cy]
  const area = pathGenerator.area(feature);

  const minX = Math.round(bounds[0][0] * 10) / 10;
  const minY = Math.round(bounds[0][1] * 10) / 10;
  const maxX = Math.round(bounds[1][0] * 10) / 10;
  const maxY = Math.round(bounds[1][1] * 10) / 10;

  precomputedCountries.push({
    id: idStr,
    iso2: NUMERIC_TO_ISO2[idStr] || NUMERIC_TO_ISO2[String(parseInt(idStr, 10))] || '',
    name,
    color: colors[index],
    d,
    centroid: [Math.round(centroid[0] * 10) / 10, Math.round(centroid[1] * 10) / 10],
    bbox: [minX, minY, maxX, maxY],
    width: Math.round((maxX - minX) * 10) / 10,
    height: Math.round((maxY - minY) * 10) / 10,
    area: Math.round(area)
  });
});

// Sort by area descending for collision detection priority
precomputedCountries.sort((a, b) => b.area - a.area);

// Also generate mesh borders for crisp rendering
const bordersMesh = topojson.mesh(world, world.objects.countries, (a, b) => a !== b);
const bordersPath = pathGenerator(bordersMesh);

const output = {
  viewBox: '0 20 1000 440',
  seaColor: '#fff1f0',
  borderColor: '#d9a9a6',
  bordersPath,
  countries: precomputedCountries
};

const outDir = path.join(__dirname, '../src/data');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outDir, 'precomputedWorldMap.json'),
  JSON.stringify(output),
  'utf8'
);

console.log(`Precomputed ${precomputedCountries.length} countries saved to src/data/precomputedWorldMap.json`);

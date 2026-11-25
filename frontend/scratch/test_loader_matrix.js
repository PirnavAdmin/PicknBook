const { resolveLocation, AIRPORTS_DATABASE } = require('../src/utils/flightAirports');

const testCases = [
  { source: 'HYD', dest: 'JAI', expected: 'India map loader' },
  { source: 'DEL', dest: 'BOM', expected: 'India map loader' },
  { source: 'HYD', dest: 'LHR', expected: 'World map loader' },
  { source: 'BOM', dest: 'DXB', expected: 'World map loader' },
  { source: 'DEL', dest: 'JFK', expected: 'World map loader' },
  { source: 'BLR', dest: 'CCU', expected: 'India map loader' },
  { source: 'MAA', dest: 'SIN', expected: 'World map loader' },
  { source: 'London (LHR)', dest: 'Mumbai (BOM)', expected: 'World map loader' },
  { source: 'Delhi (DEL)', dest: 'Jaipur (JAI)', expected: 'India map loader' }
];

let allPassed = true;

console.log('=== FLIGHT LOADER TEST MATRIX ===\n');

for (const t of testCases) {
  const src = resolveLocation(t.source, 'HYD');
  const dst = resolveLocation(t.dest, 'BOM');

  const isDomestic = src && dst && src.country === 'IN' && dst.country === 'IN';
  const actual = isDomestic ? 'India map loader' : 'World map loader';

  const pass = actual === t.expected;
  if (!pass) allPassed = false;

  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${t.source} -> ${t.dest}`);
  console.log(`       Source: ${src.code} (${src.city}, ${src.country}) coords: [${src.coords}]`);
  console.log(`       Dest:   ${dst.code} (${dst.city}, ${dst.country}) coords: [${dst.coords}]`);
  console.log(`       Result: ${actual} (Expected: ${t.expected})\n`);
}

if (!allPassed) {
  console.error('Some tests failed!');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED SUCCESSFULLY!');
}

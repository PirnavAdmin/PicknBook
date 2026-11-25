const fs = require('fs');
const path = require('path');

// 1. Verify AircraftSeatMap.jsx does not contain removed elements
const seatMapCode = fs.readFileSync(path.join(__dirname, '../src/components/seatmap/AircraftSeatMap.jsx'), 'utf8');

const checks = [
  { name: 'No cockpit windshield element', test: !seatMapCode.includes('aircraft-cockpit-windshield') },
  { name: 'No orientation labels element', test: !seatMapCode.includes('aircraft-orientation-labels') },
  { name: 'No Nose indicator text', test: !seatMapCode.includes('Nose') },
  { name: 'No Tail indicator text', test: !seatMapCode.includes('Tail ▶') && !seatMapCode.includes('▼ Tail') },
  { name: 'No tail lozenge', test: !seatMapCode.includes('tailFinPoints') },
  { name: 'Doors preserved', test: seatMapCode.includes('DoorBox') },
  { name: 'Galley icons preserved', test: seatMapCode.includes('GalleyIcon') },
  { name: 'Emergency exit preserved', test: seatMapCode.includes('EmergencyExit') },
  { name: 'ChairSeat preserved', test: seatMapCode.includes('ChairSeat') },
  { name: 'Row numbers preserved', test: seatMapCode.includes('aircraft-row-numbers') },
  { name: 'Seat letters preserved', test: seatMapCode.includes('aircraft-seat-letters') },
  { name: 'Red fuselage styling preserved (#D62828)', test: seatMapCode.includes('#D62828') },
];

console.log('=== AircraftSeatMap Component Verification ===');
let allPassed = true;
checks.forEach(c => {
  if (c.test) {
    console.log(`[PASS] ${c.name}`);
  } else {
    console.error(`[FAIL] ${c.name}`);
    allPassed = false;
  }
});

// 2. Verify FlightSeatSelectionPage.js
const pageCode = fs.readFileSync(path.join(__dirname, '../src/pages/booking/FlightSeatSelectionPage.js'), 'utf8');

const pageChecks = [
  { name: 'Uses transform scale (not CSS zoom)', test: pageCode.includes('transform: scale') || pageCode.includes('transform = `scale(${scale})`') },
  { name: 'No CSS zoom used', test: !pageCode.includes('style.zoom') && !pageCode.includes('zoom:') },
  { name: 'Viewport ref and seatMapRef used', test: pageCode.includes('mapContainerRef') && pageCode.includes('seatMapRef') },
  { name: 'Fit to screen toggle to Reset zoom', test: pageCode.includes('"Reset zoom" : "Fit to screen"') || pageCode.includes("'Reset zoom' : 'Fit to screen'") },
  { name: 'ResizeObserver implemented', test: pageCode.includes('ResizeObserver') },
  { name: 'Scalable wrapper exists', test: pageCode.includes('seatmap-scalable-wrapper') },
  { name: 'transformOrigin: top left', test: pageCode.includes('transformOrigin') && pageCode.includes('top left') },
  { name: 'Viewport height set to scrollHeight * scale', test: pageCode.includes('seatMapHeight * scale') || pageCode.includes('scrollHeight * scale') },
  { name: 'overflowX: hidden while fitted', test: pageCode.includes('overflowX = "hidden"') || pageCode.includes("overflowX = 'hidden'") },
  { name: 'scrollLeft = 0 while fitted', test: pageCode.includes('scrollLeft = 0') },
];

console.log('\n=== FlightSeatSelectionPage Verification ===');
pageChecks.forEach(c => {
  if (c.test) {
    console.log(`[PASS] ${c.name}`);
  } else {
    console.error(`[FAIL] ${c.name}`);
    allPassed = false;
  }
});

if (!allPassed) {
  process.exit(1);
} else {
  console.log('\nAll 22 verification checks PASSED successfully!');
}

const fs = require('fs');

function checkFile(path, keywords) {
  const content = fs.readFileSync(path, 'utf8');
  const lines = content.split('\n');
  console.log(`=== ${path} ===`);
  lines.forEach((line, idx) => {
    for (const kw of keywords) {
      if (line.toLowerCase().includes(kw.toLowerCase())) {
        console.log(`Line ${idx + 1} [${kw}]: ${line.trim()}`);
        break;
      }
    }
  });
}

checkFile('src/pages/booking/FlightSeatSelectionPage.js', ['nose', 'tail', 'fit to screen', 'fit', 'cockpit', 'windshield']);
checkFile('src/components/seatmap/AircraftSeatMap.jsx', ['nose', 'tail', 'fit to screen', 'fit', 'cockpit', 'windshield']);

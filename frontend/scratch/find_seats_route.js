const fs = require('fs');
const app = fs.readFileSync('src/App.js', 'utf8');
const lines = app.split('\n');
lines.forEach((l, idx) => {
  if (l.includes('flight/seats') || l.includes('FlightSeat') || l.includes('SeatSelection')) {
    console.log(`Line ${idx + 1}: ${l.trim()}`);
  }
});

export function groupFaresIntoRanges(seats) {
  if (!seats || seats.length === 0) return [];
  const fares = seats.map((seat) => {
    const val = seat?.SeatFare || seat?.seatFare || seat?.Fare || seat?.fare || seat?.BaseFare || seat?.baseFare;
    return Number(val);
  }).filter((f) => !isNaN(f) && f > 0);

  if (fares.length === 0) return [];
  const uniqueFares = [...new Set(fares)].sort((a, b) => a - b);
  
  return uniqueFares.map(f => ({
    id: `fare_${f}`,
    min: f,
    max: f,
    label: `₹ ${f}`
  }));
}

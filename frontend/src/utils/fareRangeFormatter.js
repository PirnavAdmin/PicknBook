export const MAX_FARE_CHIPS = 5;

export function buildFareFilters(availableSeats, maxChips = MAX_FARE_CHIPS) {
  if (!availableSeats || availableSeats.length === 0) return [];

  const fareMap = new Map();
  availableSeats.forEach(seat => {
    const fare = Number(seat.fare || seat.b2cDisplayFare || seat.priceInr || 0);
    if (fare > 0) {
      fareMap.set(fare, (fareMap.get(fare) || 0) + 1);
    }
  });

  const distinctFares = Array.from(fareMap.keys()).sort((a, b) => a - b);
  if (distinctFares.length === 0) return [];

  const fmt = (val) => new Intl.NumberFormat('en-IN', { 
    style: 'currency', 
    currency: 'INR', 
    maximumFractionDigits: 2 
  }).format(val);

  if (distinctFares.length <= maxChips) {
    return distinctFares.map(fare => {
      const count = fareMap.get(fare);
      return {
        id: `fare_${fare}`,
        min: fare,
        max: fare,
        label: `${fmt(fare)} (${count})`,
        count
      };
    });
  }

  const fareDistribution = distinctFares.map(fare => ({
    fare,
    count: fareMap.get(fare)
  }));

  const totalSeats = fareDistribution.reduce((sum, item) => sum + item.count, 0);
  const targetPerBucket = totalSeats / maxChips;

  const refinedBuckets = [];
  let startIdx = 0;
  
  for (let i = 0; i < maxChips; i++) {
    const remainingBuckets = maxChips - i;
    const remainingFares = distinctFares.length - startIdx;
    const minFares = Math.ceil(remainingFares / remainingBuckets);
    let endIdx = startIdx + minFares;
    
    let currentSeats = 0;
    for (let j = startIdx; j < endIdx; j++) {
      currentSeats += fareMap.get(distinctFares[j]);
    }
    
    while (endIdx < distinctFares.length && 
           currentSeats < targetPerBucket && 
           (distinctFares.length - endIdx) > (remainingBuckets - 1)) {
      currentSeats += fareMap.get(distinctFares[endIdx]);
      endIdx++;
    }

    const bucketFares = distinctFares.slice(startIdx, endIdx);
    const bucketMin = bucketFares[0];
    const bucketMax = bucketFares[bucketFares.length - 1];
    const bucketCount = bucketFares.reduce((sum, f) => sum + fareMap.get(f), 0);

    refinedBuckets.push({
      id: `range_${bucketMin}_${bucketMax}`,
      min: bucketMin,
      max: bucketMax,
      label: bucketMin === bucketMax 
        ? `${fmt(bucketMin)} (${bucketCount})` 
        : `${fmt(bucketMin)} – ${fmt(bucketMax)} (${bucketCount})`,
      count: bucketCount
    });
    
    startIdx = endIdx;
  }

  return refinedBuckets;
}

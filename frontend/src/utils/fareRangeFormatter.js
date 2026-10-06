/**
 * @typedef {Object} PriceBucket
 * @property {string} id - Unique identifier for the bucket
 * @property {number} min - Minimum fare (inclusive)
 * @property {number} max - Maximum fare (exclusive, except possibly the last bucket)
 * @property {string} label - Display label for the chip
 * @property {number} seatCount - Number of seats in this bucket
 */

/**
 * Formats a currency amount deterministically.
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  const formatter = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  return `₹${formatter.format(amount)}`;
}

/**
 * Groups fares into at most `maxChips` equal-width ranges based on available seats.
 * @param {Array<Object>} seats - The list of seat objects
 * @param {Object} [options] - Configuration options
 * @param {number} [options.maxChips=5] - Maximum number of chips to produce
 * @param {Array<{span: number, unit: number}>} [options.unitThresholds] - Thresholds for rounding unit
 * @param {number} [options.defaultUnit=100] - Default rounding unit if span exceeds thresholds
 * @returns {PriceBucket[]}
 */
export function groupFaresIntoRanges(seats, options = {}) {
  const {
    maxChips = 5,
    unitThresholds = [
      { span: 500, unit: 10 },
      { span: 5000, unit: 50 }
    ],
    defaultUnit = 100
  } = options;

  if (!Array.isArray(seats)) return [];

  // 1. Collect valid fares from available seats
  const fares = [];
  for (const seat of seats) {
    if (seat.status === 'booked') continue; // only consider bookable seats
    
    let rawFare = seat.b2cDisplayFare || seat.fareBeforeTax || seat.fare || seat.priceInr || 0;
    if (typeof rawFare === 'string') {
      rawFare = rawFare.replace(/[^\d.-]/g, '');
    }
    const parsed = Number(rawFare);
    if (!isNaN(parsed) && parsed > 0) {
      fares.push(parsed);
    }
  }

  // Edge case: No valid fares
  if (fares.length === 0) return [];

  const lowest = Math.min(...fares);
  const highest = Math.max(...fares);

  // Edge case: All fares are identical
  if (lowest === highest) {
    return [{
      id: `fare-${lowest}`,
      min: lowest,
      max: lowest,
      label: formatCurrency(lowest),
      seatCount: fares.length
    }];
  }

  // Edge case: <= 5 distinct fares
  const distinctFares = [...new Set(fares)].sort((a, b) => a - b);
  if (distinctFares.length <= maxChips) {
    return distinctFares.map(f => {
      return {
        id: `fare-${f}`,
        min: f,
        max: f,
        label: formatCurrency(f),
        seatCount: fares.filter(fare => fare === f).length
      };
    });
  }

  // 4. Build equal-width ranges
  const span = highest - lowest;
  let unit = defaultUnit;
  for (const t of unitThresholds) {
    if (span < t.span) {
      unit = t.unit;
      break;
    }
  }

  const rawStep = span / maxChips;
  const step = Math.ceil(rawStep / unit) * unit;
  const start = Math.floor(lowest / unit) * unit;

  const buckets = [];
  for (let i = 0; i < maxChips; i++) {
    const bMin = start + i * step;
    const bMax = start + (i + 1) * step;
    buckets.push({
      id: `range-${bMin}-${bMax}`,
      min: bMin,
      max: bMax,
      seatCount: 0
    });
  }

  // Assign fares to buckets
  fares.forEach(fare => {
    for (let i = 0; i < buckets.length; i++) {
      const b = buckets[i];
      const isLast = i === buckets.length - 1;
      // min inclusive, max exclusive EXCEPT for the very last bucket
      if (fare >= b.min && (isLast ? fare <= b.max : fare < b.max)) {
        b.seatCount++;
        break;
      }
    }
  });

  // Drop empty buckets
  const nonEmptyBuckets = buckets.filter(b => b.seatCount > 0);

  if (nonEmptyBuckets.length > 0) {
    // Clamp the max of the last non-empty bucket
    const last = nonEmptyBuckets[nonEmptyBuckets.length - 1];
    const clampedMax = Math.ceil(highest / unit) * unit;
    if (last.max > clampedMax) {
      last.max = clampedMax;
    }
    // Safety check just in case
    if (last.max < last.min) {
      last.max = last.min;
    }
  }

  // Format labels
  return nonEmptyBuckets.map(b => {
    let label = '';
    if (b.min === b.max) {
      label = formatCurrency(b.min);
    } else {
      label = `${formatCurrency(b.min)} – ${formatCurrency(b.max)}`;
    }
    return {
      id: b.id,
      min: b.min,
      max: b.max,
      label,
      seatCount: b.seatCount
    };
  });
}

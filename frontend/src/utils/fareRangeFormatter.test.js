import { groupFaresIntoRanges } from './fareRangeFormatter';

describe('fareRangeFormatter', () => {
  const createSeat = (fare, status = 'available') => ({
    b2cDisplayFare: fare,
    status
  });

  it('should return empty array if no valid fares', () => {
    const seats = [
      createSeat(0),
      createSeat(null),
      createSeat(-10),
      createSeat(100, 'booked')
    ];
    expect(groupFaresIntoRanges(seats)).toEqual([]);
  });

  it('should return one chip if all fares are equal', () => {
    const seats = [createSeat(1051), createSeat(1051), createSeat(1051)];
    const buckets = groupFaresIntoRanges(seats);
    expect(buckets).toHaveLength(1);
    expect(buckets[0].min).toBe(1051);
    expect(buckets[0].max).toBe(1051);
    expect(buckets[0].label).toBe('₹1,051');
    expect(buckets[0].seatCount).toBe(3);
  });

  it('should return exact chips if <= 5 distinct fares', () => {
    const seats = [
      createSeat(1000),
      createSeat(1100),
      createSeat(1100),
      createSeat(1200)
    ];
    const buckets = groupFaresIntoRanges(seats);
    expect(buckets).toHaveLength(3);
    expect(buckets[0].min).toBe(1000);
    expect(buckets[1].seatCount).toBe(2);
  });

  it('should group sample fares correctly (span < 5000 -> unit 50)', () => {
    // 1051.60 to 2057
    const fares = [1051.6, 1200, 1350, 1500, 1800, 2057];
    const seats = fares.map(f => createSeat(f));
    const buckets = groupFaresIntoRanges(seats);
    
    // lowest 1051.6, highest 2057, span 1005.4 => unit 50
    // start 1050, step 250
    // [1050, 1300), [1300, 1550), [1550, 1800), [1800, 2050), [2050, 2100]
    expect(buckets).toHaveLength(5);
    
    expect(buckets[0].min).toBe(1050);
    expect(buckets[0].max).toBe(1300);
    expect(buckets[0].seatCount).toBe(2); // 1051.6, 1200

    expect(buckets[1].min).toBe(1300);
    expect(buckets[1].max).toBe(1550);
    expect(buckets[1].seatCount).toBe(2); // 1350, 1500

    expect(buckets[2].min).toBe(1550);
    expect(buckets[2].max).toBe(1800);
    expect(buckets[2].seatCount).toBe(0); // dropped! Wait, no! We dropped empty buckets.
  });

  it('should handle clustered fares (drop empty buckets)', () => {
    const fares = [1051.6, 2057];
    const seats = fares.map(f => createSeat(f));
    const buckets = groupFaresIntoRanges(seats);
    
    expect(buckets).toHaveLength(2); // Only bucket 0 and bucket 4 have seats
    
    expect(buckets[0].min).toBe(1050);
    expect(buckets[0].max).toBe(1300);
    
    expect(buckets[1].min).toBe(2050);
    expect(buckets[1].max).toBe(2100);
    expect(buckets[1].seatCount).toBe(1); // 2057
  });

  it('should include highest fare in the last bucket without overshooting', () => {
    // lowest 1000, highest 1010, unit 10
    // span = 10 -> rawStep 2 -> step 10 -> start 1000
    // B0: 1000-1010
    // B4: 1040-1050
    const fares = [1000, 1001, 1002, 1003, 1004, 1005, 1006, 1007, 1008, 1009, 1010];
    const seats = fares.map(f => createSeat(f));
    
    const buckets = groupFaresIntoRanges(seats);
    expect(buckets).toHaveLength(2); // 1000-1010 and 1010-1020
    expect(buckets[0].min).toBe(1000);
    expect(buckets[0].max).toBe(1010);
    expect(buckets[0].seatCount).toBe(10); // 1000 to 1009
    
    expect(buckets[1].min).toBe(1010);
    expect(buckets[1].max).toBe(1010); // clamped
    expect(buckets[1].seatCount).toBe(1); // 1010
  });
});

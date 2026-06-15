using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Models;
using PickNBook.Api.Services.SeatLayouts;

namespace PickNBook.Api.Data;

public static class DbSeeder
{
    private static readonly TimeSpan IndiaOffset = TimeSpan.FromHours(5.5);

    private static readonly string[] AllowedTravelClasses =
    [
        "Economy",
        "Premium Economy",
        "Business",
        "Premium Business",
        "First Class"
    ];

    private static readonly Dictionary<string, int> ClassSeatConfig = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Economy"] = 120,
        ["Premium Economy"] = 24,
        ["Business"] = 18,
        ["Premium Business"] = 12,
        ["First Class"] = 8
    };

    private static readonly Dictionary<string, decimal> ClassPriceMultiplier = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Economy"] = 1.00m,
        ["Premium Economy"] = 1.35m,
        ["Business"] = 2.00m,
        ["Premium Business"] = 2.40m,
        ["First Class"] = 3.20m
    };

    public static async Task SeedAsync(AppDbContext dbContext, CancellationToken cancellationToken = default)
    {
        //await EnsureTablesAsync(dbContext, cancellationToken);

        var hasConvenienceFee = await dbContext.BusConvenienceFees.AnyAsync(cancellationToken);
        if (!hasConvenienceFee)
        {
            dbContext.BusConvenienceFees.Add(new BusConvenienceFee
            {
                FeeInr = 0m,
                EntryDateUtc = DateTime.UtcNow,
                UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "system",
                Status = "Active"
            });
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        var hasFlightConvenienceFee = await dbContext.FlightConvenienceFees.AnyAsync(cancellationToken);
        if (!hasFlightConvenienceFee)
        {
            dbContext.FlightConvenienceFees.Add(new FlightConvenienceFee
            {
                AmountType = "Fixed",
                Value = 0m,
                EntryDateUtc = DateTime.UtcNow,
                UpdateDateUtc = DateTime.UtcNow,
                UpdatedBy = "system",
                Status = "Active"
            });
            await dbContext.SaveChangesAsync(cancellationToken);
        }

        // Force re-seed if any existing bus has NULL BoardingPointsJson (e.g. after schema migration)
        var hasNullPoints = await dbContext.BusBookings.AnyAsync(x => x.BoardingPointsJson == null, cancellationToken);
        if (hasNullPoints)
        {
            await dbContext.BusSeats.ExecuteDeleteAsync(cancellationToken);
            await dbContext.BusReservations.ExecuteDeleteAsync(cancellationToken);
            await dbContext.BusBookings.ExecuteDeleteAsync(cancellationToken);
        }

        var hasBuses = await dbContext.BusBookings.AnyAsync(x => x.BusNumber == "PNB-B1001", cancellationToken);
        if (!hasBuses)
        {
            var buses = BuildBusSeed();
            await dbContext.BusBookings.AddRangeAsync(buses, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
            Console.WriteLine($"Seeded {buses.Count} rows into bus_bookings.");
        }

        var hasNewBuses = await dbContext.BusBookings.AnyAsync(x => x.BusNumber == "PNB-B2002", cancellationToken);
        if (!hasNewBuses)
        {
            var now = DateTime.UtcNow;
            var newBuses = new List<BusBooking>
            {
                new BusBooking
                {
                    BusNumber = "PNB-B2002",
                    OperatorName = "Kaveri Travels",
                    BusType = "AC Sleeper",
                    FromCity = "Hyderabad",
                    ToCity = "Vijayawada",
                    DepartureTime = now.AddDays(1),
                    ArrivalTime = now.AddDays(1).AddHours(4.8), // 4.8 hours = 288 minutes
                    PriceInr = 1100.00m,
                    AvailableSeats = 36,
                    TotalSeats = 36,
                    BoardingPoint = "MGBS",
                    DroppingPoint = "Benz Circle",
                    GstCategory = "AC",
                    BoardingPointsJson = "[{\"Name\":\"MGBS\",\"Address\":\"Bus Stop\"}]",
                    DroppingPointsJson = "[{\"Name\":\"Benz Circle\",\"Address\":\"Bus Stop\"}]"
                },
                new BusBooking
                {
                    BusNumber = "PNB-B2003",
                    OperatorName = "Morning Star Travels",
                    BusType = "Volvo AC Seater",
                    FromCity = "Hyderabad",
                    ToCity = "Vijayawada",
                    DepartureTime = now.AddDays(2),
                    ArrivalTime = now.AddDays(2).AddHours(4.5), // 4.5 hours = 270 minutes
                    PriceInr = 1300.00m,
                    AvailableSeats = 40,
                    TotalSeats = 40,
                    BoardingPoint = "Ameerpet",
                    DroppingPoint = "Benz Circle",
                    GstCategory = "VOLVO",
                    BoardingPointsJson = "[{\"Name\":\"Ameerpet\",\"Address\":\"Bus Stop\"}]",
                    DroppingPointsJson = "[{\"Name\":\"Benz Circle\",\"Address\":\"Bus Stop\"}]"
                },
                new BusBooking
                {
                    BusNumber = "PNB-B2004",
                    OperatorName = "Dhanunjaya Travels",
                    BusType = "Non-AC Sleeper",
                    FromCity = "Hyderabad",
                    ToCity = "Vijayawada",
                    DepartureTime = now.AddDays(3),
                    ArrivalTime = now.AddDays(3).AddHours(5.5), // 5.5 hours = 330 minutes
                    PriceInr = 800.00m,
                    AvailableSeats = 30,
                    TotalSeats = 30,
                    BoardingPoint = "MGBS",
                    DroppingPoint = "Benz Circle",
                    GstCategory = "Non-AC",
                    BoardingPointsJson = "[{\"Name\":\"MGBS\",\"Address\":\"Bus Stop\"}]",
                    DroppingPointsJson = "[{\"Name\":\"Benz Circle\",\"Address\":\"Bus Stop\"}]"
                },
                new BusBooking
                {
                    BusNumber = "PNB-B2005",
                    OperatorName = "Diwakar Travels",
                    BusType = "Non AC Seater/Sleeper 2+1",
                    FromCity = "Hyderabad",
                    ToCity = "Vijayawada",
                    DepartureTime = now.AddDays(4),
                    ArrivalTime = now.AddDays(4).AddHours(5.17), // 5.17 hours ~ 310 minutes
                    PriceInr = 700.00m,
                    AvailableSeats = 45,
                    TotalSeats = 45,
                    BoardingPoint = "Ameerpet",
                    DroppingPoint = "Benz Circle",
                    GstCategory = "Non-AC",
                    BoardingPointsJson = "[{\"Name\":\"Ameerpet\",\"Address\":\"Bus Stop\"}]",
                    DroppingPointsJson = "[{\"Name\":\"Benz Circle\",\"Address\":\"Bus Stop\"}]"
                },
                new BusBooking
                {
                    BusNumber = "PNB-B2006",
                    OperatorName = "Rajesh Travels",
                    BusType = "Non-AC Seater",
                    FromCity = "Hyderabad",
                    ToCity = "Vijayawada",
                    DepartureTime = now.AddDays(5),
                    ArrivalTime = now.AddDays(5).AddHours(5.33), // 5.33 hours ~ 320 minutes
                    PriceInr = 600.00m,
                    AvailableSeats = 44,
                    TotalSeats = 44,
                    BoardingPoint = "MGBS",
                    DroppingPoint = "Benz Circle",
                    GstCategory = "Non-AC",
                    BoardingPointsJson = "[{\"Name\":\"MGBS\",\"Address\":\"Bus Stop\"}]",
                    DroppingPointsJson = "[{\"Name\":\"Benz Circle\",\"Address\":\"Bus Stop\"}]"
                }
            };

            await dbContext.BusBookings.AddRangeAsync(newBuses, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
            Console.WriteLine("Seeded 5 new buses into bus_bookings.");
        }


      


       
        var hasFullWeekData = await dbContext.BusBookings
     .Where(x => x.DepartureTime > DateTime.UtcNow)
     .Select(x => x.DepartureTime.Date)
     .Distinct()
     .CountAsync(cancellationToken);

        if (hasFullWeekData < 7)
        {
            await InsertNextWeekBusSchedulesAsync(dbContext, cancellationToken);
        }

        await EnsureRichNextWeekFlightDataAsync(dbContext, cancellationToken);
        await EnsureSeatMapsAsync(dbContext, cancellationToken);
        await CleanDuplicatePointsInDbAsync(dbContext, cancellationToken);
    }
    
    private static async Task EnsureSeatMapsAsync(AppDbContext dbContext, CancellationToken cancellationToken)
    {
        // Seats are generated on-demand when accessed via APIs to preserve DB connections
        // await EnsureFlightSeatMapsAsync(dbContext, cancellationToken);
        // await EnsureBusSeatMapsAsync(dbContext, cancellationToken);
    }

    private static async Task EnsureFlightSeatMapsAsync(AppDbContext dbContext, CancellationToken cancellationToken)
    {
        var flightsWithoutSeats = await dbContext.FlightBookings
            .Where(f => !dbContext.FlightSeats.Any(s => s.FlightBookingId == f.Id))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        if (flightsWithoutSeats.Count == 0)
        {
            return;
        }

        // Deduplicate flight list in memory
        flightsWithoutSeats = flightsWithoutSeats.DistinctBy(f => f.Id).ToList();

        var seatsToInsert = new List<FlightSeat>();
        foreach (var flight in flightsWithoutSeats)
        {
            foreach (var travelClass in AllowedTravelClasses)
            {
                if (!ClassSeatConfig.TryGetValue(travelClass, out var totalSeats) || totalSeats <= 0)
                {
                    continue;
                }

                var seatCodes = BuildFlightSeatCodes(totalSeats);
                foreach (var seatCode in seatCodes)
                {
                    seatsToInsert.Add(new FlightSeat
                    {
                        FlightBookingId = flight.Id,
                        TravelClass = travelClass,
                        SeatCode = seatCode,
                        IsBooked = false
                    });
                }
            }
        }

        // Deduplicate generated seats in memory
        seatsToInsert = seatsToInsert
            .GroupBy(s => new { s.FlightBookingId, TravelClass = s.TravelClass.Trim().ToLowerInvariant(), SeatCode = s.SeatCode.Trim().ToLowerInvariant() })
            .Select(g => g.First())
            .ToList();

        if (seatsToInsert.Count > 0)
        {
            const int batchSize = 5000;
            for (var i = 0; i < seatsToInsert.Count; i += batchSize)
            {
                var batch = seatsToInsert.Skip(i).Take(batchSize).ToList();
                try
                {
                    await dbContext.FlightSeats.AddRangeAsync(batch, cancellationToken);
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
                catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("Duplicate entry") == true || ex.Message.Contains("Duplicate entry"))
                {
                    dbContext.ChangeTracker.Clear();
                    
                    var flightIdsInBatch = batch.Select(x => x.FlightBookingId).Distinct().ToList();
                    var existingSeats = await dbContext.FlightSeats
                        .Where(x => flightIdsInBatch.Contains(x.FlightBookingId))
                        .Select(x => new { x.FlightBookingId, x.TravelClass, x.SeatCode })
                        .ToListAsync(cancellationToken);
                        
                    var existingSet = existingSeats
                        .Select(x => $"{x.FlightBookingId}|{x.TravelClass.Trim()}|{x.SeatCode.Trim()}")
                        .ToHashSet(StringComparer.OrdinalIgnoreCase);
                        
                    var nonDuplicateSeats = batch
                        .Where(x => !existingSet.Contains($"{x.FlightBookingId}|{x.TravelClass.Trim()}|{x.SeatCode.Trim()}"))
                        .ToList();
                        
                    if (nonDuplicateSeats.Count > 0)
                    {
                        try
                        {
                            await dbContext.FlightSeats.AddRangeAsync(nonDuplicateSeats, cancellationToken);
                            await dbContext.SaveChangesAsync(cancellationToken);
                        }
                        catch (DbUpdateException saveEx) when (saveEx.InnerException?.Message.Contains("Duplicate entry") == true || saveEx.Message.Contains("Duplicate entry"))
                        {
                            // Swallowing duplicate entries as they already exist in the database.
                            dbContext.ChangeTracker.Clear();
                        }
                    }
                }
                dbContext.ChangeTracker.Clear();
            }
        }
    }

    private static async Task EnsureBusSeatMapsAsync(AppDbContext dbContext, CancellationToken cancellationToken)
    {
        var busesWithoutSeats = await dbContext.BusBookings
            .Where(b => !dbContext.BusSeats.Any(s => s.BusBookingId == b.Id))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        if (busesWithoutSeats.Count == 0)
        {
            return;
        }

        // Deduplicate buses in memory
        busesWithoutSeats = busesWithoutSeats.DistinctBy(b => b.Id).ToList();

        var seatsToInsert = new List<BusSeat>();
        foreach (var bus in busesWithoutSeats)
        {
            var seatCodes = BusSeatLayoutRegistry.BuildSeatCodes(
                Math.Max(1, bus.TotalSeats),
                bus.BusType);

            foreach (var seatCode in seatCodes)
            {
                var generatedSeatType = BusSeatLayoutRegistry.GetSeatType(
                    bus.BusType,
                    seatCode,
                    bus.TotalSeats);

                seatsToInsert.Add(new BusSeat
                {
                    BusBookingId = bus.Id,
                    SeatCode = seatCode,
                    SeatType = generatedSeatType,
                    IsBooked = false
                });
            }
        }

        // Deduplicate generated seats in memory
        seatsToInsert = seatsToInsert
            .GroupBy(s => new { s.BusBookingId, SeatCode = s.SeatCode.Trim().ToLowerInvariant() })
            .Select(g => g.First())
            .ToList();

        if (seatsToInsert.Count > 0)
        {
            const int batchSize = 5000;
            for (var i = 0; i < seatsToInsert.Count; i += batchSize)
            {
                var batch = seatsToInsert.Skip(i).Take(batchSize).ToList();
                try
                {
                    await dbContext.BusSeats.AddRangeAsync(batch, cancellationToken);
                    await dbContext.SaveChangesAsync(cancellationToken);
                }
                catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("Duplicate entry") == true || ex.Message.Contains("Duplicate entry"))
                {
                    dbContext.ChangeTracker.Clear();
                    
                    var busIdsInBatch = batch.Select(x => x.BusBookingId).Distinct().ToList();
                    var existingSeats = await dbContext.BusSeats
                        .Where(x => busIdsInBatch.Contains(x.BusBookingId))
                        .Select(x => new { x.BusBookingId, x.SeatCode })
                        .ToListAsync(cancellationToken);
                        
                    var existingSet = existingSeats
                        .Select(x => $"{x.BusBookingId}|{x.SeatCode.Trim()}")
                        .ToHashSet(StringComparer.OrdinalIgnoreCase);
                        
                    var nonDuplicateSeats = batch
                        .Where(x => !existingSet.Contains($"{x.BusBookingId}|{x.SeatCode.Trim()}"))
                        .ToList();
                        
                    if (nonDuplicateSeats.Count > 0)
                    {
                        try
                        {
                            await dbContext.BusSeats.AddRangeAsync(nonDuplicateSeats, cancellationToken);
                            await dbContext.SaveChangesAsync(cancellationToken);
                        }
                        catch (DbUpdateException saveEx) when (saveEx.InnerException?.Message.Contains("Duplicate entry") == true || saveEx.Message.Contains("Duplicate entry"))
                        {
                            // Swallowing duplicate entries as they already exist in the database.
                            dbContext.ChangeTracker.Clear();
                        }
                    }
                }
                dbContext.ChangeTracker.Clear();
            }
            Console.WriteLine($"Inserted {seatsToInsert.Count} new bus seats.");
        }
    }

    private static List<string> BuildFlightSeatCodes(int totalSeats)
    {
        var letters = new[] { 'A', 'B', 'C', 'D', 'E', 'F' };
        var seats = new List<string>(totalSeats);
        for (var i = 1; i <= totalSeats; i++)
        {
            var row = ((i - 1) / letters.Length) + 1;
            var letter = letters[(i - 1) % letters.Length];
            seats.Add($"{row}{letter}");
        }

        return seats;
    }

    

    private static async Task EnsureRichNextWeekFlightDataAsync(AppDbContext dbContext, CancellationToken cancellationToken)
    {
        var (startUtc, endUtc) = NextWeekUtcRange();

        var flightCountInNextWeek = await dbContext.FlightBookings
            .CountAsync(x => x.DepartureTime >= startUtc && x.DepartureTime < endUtc, cancellationToken);

        var inventoryCount = await dbContext.FlightClassInventories.CountAsync(cancellationToken);
        var looksRichAlready = flightCountInNextWeek >= 1500 && inventoryCount >= flightCountInNextWeek * AllowedTravelClasses.Length;

        if (looksRichAlready)
        {
            await EnsureClassInventoryForAllFlightsAsync(dbContext, cancellationToken);
            Console.WriteLine("Rich next-week flight data already available.");
            return;
        }

        await dbContext.FlightReservations.ExecuteDeleteAsync(cancellationToken);
        await dbContext.FlightSeats.ExecuteDeleteAsync(cancellationToken);
        await dbContext.FlightClassInventories.ExecuteDeleteAsync(cancellationToken);
        await dbContext.FlightBookings.ExecuteDeleteAsync(cancellationToken);

        var flights = BuildRichNextWeekFlightSeed();
        await dbContext.FlightBookings.AddRangeAsync(flights, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        var inventories = BuildClassInventories(flights);
        await dbContext.FlightClassInventories.AddRangeAsync(inventories, cancellationToken);
        await dbContext.SaveChangesAsync(cancellationToken);

        Console.WriteLine($"Seeded {flights.Count} rows into flight_bookings.");
        Console.WriteLine($"Seeded {inventories.Count} rows into flight_class_inventories.");
    }
   

    private static async Task EnsureClassInventoryForAllFlightsAsync(AppDbContext dbContext, CancellationToken cancellationToken)
    {
        var flightsWithoutInventory = await dbContext.FlightBookings
            .Where(f => !dbContext.FlightClassInventories.Any(i => i.FlightBookingId == f.Id))
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        if (flightsWithoutInventory.Count == 0)
        {
            return;
        }

        var toInsert = new List<FlightClassInventory>();
        foreach (var flight in flightsWithoutInventory)
        {
            foreach (var travelClass in AllowedTravelClasses)
            {
                var total = ClassSeatConfig[travelClass];
                toInsert.Add(new FlightClassInventory
                {
                    FlightBookingId = flight.Id,
                    TravelClass = travelClass,
                    TotalSeats = total,
                    AvailableSeats = total,
                    PriceInr = decimal.Round(flight.PriceInr * ClassPriceMultiplier[travelClass], 2, MidpointRounding.AwayFromZero)
                });
            }
        }

        if (toInsert.Count > 0)
        {
            await dbContext.FlightClassInventories.AddRangeAsync(toInsert, cancellationToken);
            await dbContext.SaveChangesAsync(cancellationToken);
            Console.WriteLine($"Added {toInsert.Count} missing class inventory rows.");
        }
    }

   

    private static List<FlightBooking> BuildRichNextWeekFlightSeed()
    {
        var cities = new[]
        {
            "Delhi", "Mumbai", "Bengaluru", "Chennai", "Hyderabad",
            "Kolkata", "Pune", "Ahmedabad", "Jaipur", "Kochi"
        };

        var airlines = new[]
        {
            new AirlineDef("Air India", "AI"),
            new AirlineDef("IndiGo", "6E"),
            new AirlineDef("Vistara", "UK"),
            new AirlineDef("Akasa Air", "QP"),
            new AirlineDef("SpiceJet", "SG"),
            new AirlineDef("Air India Express", "IX")
        };

        var departureSlots = new[] { (6, 20), (12, 10), (19, 35) };
        var flights = new List<FlightBooking>();

        for (var day = 7; day <= 13; day++)
        {
            foreach (var fromCity in cities)
            {
                foreach (var toCity in cities)
                {
                    if (fromCity.Equals(toCity, StringComparison.OrdinalIgnoreCase))
                    {
                        continue;
                    }

                    foreach (var slot in departureSlots)
                    {
                        var key = $"{fromCity}-{toCity}-{day}-{slot.Item1}:{slot.Item2}";
                        var hash = StableHash(key);
                        var airline = airlines[hash % airlines.Length];
                        var durationMinutes = 65 + (hash % 170); // 65m .. 234m

                        var departure = DepartureAtUtcFromIst(day, slot.Item1, slot.Item2);
                        var economyPrice = decimal.Round(2400m + (durationMinutes * 18m) + (hash % 1800), 2, MidpointRounding.AwayFromZero);
                        var totalSeats = ClassSeatConfig.Values.Sum();

                        flights.Add(new FlightBooking
                        {
                            FlightNumber = $"{airline.Code}-{100 + (hash % 900)}",
                            Airline = airline.Name,
                            FromCity = fromCity,
                            ToCity = toCity,
                            DepartureTime = departure,
                            ArrivalTime = departure.AddMinutes(durationMinutes),
                            PriceInr = economyPrice,
                            AvailableSeats = totalSeats,
                            TotalSeats = totalSeats,
                            CabinClass = "MultiClass"
                        });
                    }
                }
            }
        }

        return flights;
    }

    private static List<FlightClassInventory> BuildClassInventories(IEnumerable<FlightBooking> flights)
    {
        var rows = new List<FlightClassInventory>();
        foreach (var flight in flights)
        {
            foreach (var travelClass in AllowedTravelClasses)
            {
                var seats = ClassSeatConfig[travelClass];
                rows.Add(new FlightClassInventory
                {
                    FlightBookingId = flight.Id,
                    TravelClass = travelClass,
                    TotalSeats = seats,
                    AvailableSeats = seats,
                    PriceInr = decimal.Round(flight.PriceInr * ClassPriceMultiplier[travelClass], 2, MidpointRounding.AwayFromZero)
                });
            }
        }

        return rows;
    }

    private static string GetBoardingPointsJson(string from, string to, string defaultPoint)
    {
        var key = $"{from.Trim()} -> {to.Trim()}".ToLowerInvariant();
        var list = key switch
        {
            "mumbai -> pune" => new[]
            {
                new { name = "Borivali", address = "National Park Gate, Borivali East" },
                new { name = "Andheri", address = "Western Express Highway, Andheri East" },
                new { name = "Dadar", address = "Dadar TT Circle, Dadar East" },
                new { name = "Sion", address = "Sion Circle, Sion East" },
                new { name = "Vashi", address = "Near Vashi Highway, Vashi" }
            },
            "delhi -> jaipur" => new[]
            {
                new { name = "ISBT Kashmere Gate", address = "ISBT Kashmere Gate, Delhi" },
                new { name = "Majnu Ka Tila", address = "Majnu Ka Tila, Delhi" },
                new { name = "Karol Bagh", address = "Karol Bagh, Delhi" },
                new { name = "Dhaula Kuan", address = "Dhaula Kuan Bus Stop, Delhi" },
                new { name = "IFFCO Chowk", address = "IFFCO Chowk, NH-48, Gurugram" }
            },
            "bengaluru -> chennai" => new[]
            {
                new { name = "Majestic", address = "Majestic, Bengaluru" },
                new { name = "Kalasipalyam", address = "Kalasipalyam Main Road, Bengaluru" },
                new { name = "Indiranagar", address = "100 Feet Road, Indiranagar" },
                new { name = "Madiwala", address = "Madiwala Bypass, Bengaluru" },
                new { name = "Silk Board", address = "Silk Board Junction, Bengaluru" }
            },
            "hyderabad -> bengaluru" => new[]
            {
                new { name = "Miyapur", address = "Miyapur Metro Station, Hyderabad" },
                new { name = "KPHB", address = "KPHB Phase 1, Hyderabad" },
                new { name = "Ameerpet", address = "Ameerpet Road, Hyderabad" },
                new { name = "MGBS", address = "MGBS Platform 10, Hyderabad" },
                new { name = "Gachibowli", address = "Outer Ring Road, Hyderabad" }
            },
            "ahmedabad -> udaipur" => new[]
            {
                new { name = "Paldi", address = "Paldi Cross Road, Ahmedabad" },
                new { name = "Kalupur", address = "Kalupur Station Road, Ahmedabad" },
                new { name = "Geeta Mandir", address = "Geeta Mandir, Ahmedabad" },
                new { name = "Naroda", address = "Naroda GIDC Road, Ahmedabad" },
                new { name = "Chiloda", address = "Chiloda Bypass, Gandhinagar" }
            },
            "chennai -> coimbatore" => new[]
            {
                new { name = "Koyambedu", address = "Koyambedu, Chennai" },
                new { name = "Ashok Pillar", address = "Ashok Nagar, Chennai" },
                new { name = "Guindy", address = "Guindy Junction, Chennai" },
                new { name = "Tambaram", address = "Tambaram West, Chennai" },
                new { name = "Perungalathur", address = "Grand Southern Trunk Road, Chennai" }
            },
            "kolkata -> bhubaneswar" => new[]
            {
                new { name = "Esplanade", address = "Esplanade Metro Gate 2, Kolkata" },
                new { name = "Babughat", address = "Babughat Jetty, Kolkata" },
                new { name = "Dankuni", address = "Dankuni Bypass, Kolkata" },
                new { name = "Santragachi", address = "Santragachi Crossing, Howrah" },
                new { name = "Kolaghat", address = "Kolaghat Bypass, NH-16" }
            },
            "goa -> mumbai" => new[]
            {
                new { name = "Margao", address = "Margao City, Goa" },
                new { name = "Panaji", address = "Kadamba Terminal, Panaji" },
                new { name = "Mapusa", address = "Mapusa Cross Road, Goa" },
                new { name = "Sawantwadi", address = "Sawantwadi Highway, NH-66" },
                new { name = "Kudal", address = "Kudal Crossing, NH-66" }
            },
            "jaipur -> delhi" => new[]
            {
                new { name = "200 Feet Bypass", address = "200 Feet Bypass, Ajmer Road, Jaipur" },
                new { name = "Sindhi Camp", address = "Platform 3, Sindhi Camp, Jaipur" },
                new { name = "Transport Nagar", address = "Transport Nagar Crossing, Jaipur" },
                new { name = "Kukas", address = "Kukas Highway, NH-48" },
                new { name = "Shahpura", address = "Shahpura Highway, NH-48" }
            },
            "lucknow -> delhi" => new[]
            {
                new { name = "Charbagh", address = "Charbagh Station Road, Lucknow" },
                new { name = "Alambagh", address = "Alambagh Metro Pillar 42, Lucknow" },
                new { name = "Nahariya Chauraha", address = "Nahariya Crossing, Lucknow" },
                new { name = "Kamta Chauraha", address = "Kamta Crossing, Lucknow" },
                new { name = "Polytechnic Chauraha", address = "Polytechnic Chauraha, Lucknow" }
            },
            "hyderabad -> vijayawada" => new[]
            {
                new { name = "Miyapur", address = "Near Metro Station" },
                new { name = "KPHB", address = "Pillar No A738" },
                new { name = "Kukatpally", address = "Near Metro Station" },
                new { name = "Ameerpet", address = "Ameerpet Metro, Hyderabad" },
                new { name = "MGBS", address = "Platform No 12, MGBS" }
            },
            "bengaluru -> mysuru" => new[]
            {
                new { name = "Majestic", address = "Majestic, Bengaluru" },
                new { name = "Satellite Bus Stand", address = "Satellite Terminal, Bengaluru" },
                new { name = "Kengeri", address = "Kengeri Mysore Road, Bengaluru" },
                new { name = "Bidadi", address = "Bidadi Bypass, Mysore Road" },
                new { name = "Ramanagara", address = "Ramanagara Highway" }
            },
            "delhi -> chandigarh" => new[]
            {
                new { name = "Majnu Ka Tila", address = "Majnu Ka Tila, Delhi" },
                new { name = "Kashmiri Gate", address = "ISBT Terminal, Kashmiri Gate, Delhi" },
                new { name = "Jahangirpuri", address = "Jahangirpuri Metro, Delhi" },
                new { name = "Karnal Bypass", address = "Karnal Bypass Road, Delhi" },
                new { name = "Murthal", address = "Murthal Bypass, NH-44" }
            },
            "pune -> nagpur" => new[]
            {
                new { name = "Swargate", address = "Swargate Flyover, Pune" },
                new { name = "Shivajinagar", address = "Shivajinagar Station Road" },
                new { name = "Viman Nagar", address = "Pune-Ahmednagar Highway" },
                new { name = "Kharadi", address = "Kharadi Bypass Circle, Pune" },
                new { name = "Wagholi", address = "Wagholi Road, Pune" }
            },
            "surat -> ahmedabad" => new[]
            {
                new { name = "Adajan", address = "Adajan Patia, Surat" },
                new { name = "Sahara Darwaja", address = "Sahara Darwaja Crossing, Surat" },
                new { name = "Kamrej", address = "Kamrej Toll Plaza, NH-48" },
                new { name = "Kim", address = "Kim Highway Crossing, Surat" },
                new { name = "Ankleshwar", address = "Ankleshwar Bypass Circle, NH-48" }
            },
            "bhopal -> indore" => new[]
            {
                new { name = "Nadra Bus Stand", address = "Nadra Bus Stand, Bhopal" },
                new { name = "Halalpur", address = "Halalpur Road, Bhopal" },
                new { name = "Lalghati", address = "Lalghati Chauraha, Bhopal" },
                new { name = "Bairagarh", address = "Bairagarh Bypass, Bhopal" },
                new { name = "Sehore", address = "Sehore Highway Crossing" }
            },
            "visakhapatnam -> hyderabad" => new[]
            {
                new { name = "Maddilapalem", address = "Maddilapalem Junction, Vizag" },
                new { name = "Gurudwara", address = "Gurudwara Lane, Vizag" },
                new { name = "Gajuwaka", address = "Gajuwaka Junction, Vizag" },
                new { name = "Kurmannapalem", address = "Kurmannapalem Bypass, Vizag" },
                new { name = "Anakapalle", address = "Anakapalle Highway, NH-16" }
            },
            "mumbai -> goa" => new[]
            {
                new { name = "Borivali", address = "National Park Gate, Borivali East" },
                new { name = "Andheri", address = "Western Express Highway, Andheri East" },
                new { name = "Sion", address = "Sion Circle, Sion East" },
                new { name = "Vashi", address = "Near Vashi Highway, Vashi" },
                new { name = "Panvel", address = "Kalamboli Circle, Panvel" }
            },
            _ => new[]
            {
                new { name = defaultPoint, address = "Bus Stop" }
            }
        };

        return System.Text.Json.JsonSerializer.Serialize(list);
    }

    private static string GetDroppingPointsJson(string from, string to, string defaultPoint)
    {
        var key = $"{from.Trim()} -> {to.Trim()}".ToLowerInvariant();
        var list = key switch
        {
            "mumbai -> pune" => new[]
            {
                new { name = "Wakad", address = "Wakad Bypass, Wakad" },
                new { name = "Hinjawadi", address = "Hinjawadi Phase 1, Shivaji Chowk" },
                new { name = "Chandani Chowk", address = "Chandani Chowk Road, Pune" },
                new { name = "Shivajinagar", address = "Near Railway Station, Shivajinagar" },
                new { name = "Swargate", address = "Swargate Flyover, Pune" }
            },
            "delhi -> jaipur" => new[]
            {
                new { name = "Achrol", address = "NH-48 Achrol Bypass" },
                new { name = "Amer Road", address = "Amer Road, Jaipur" },
                new { name = "Sindhi Camp", address = "Platform No 4, Sindhi Camp" },
                new { name = "Transport Nagar", address = "Near Transport Nagar Crossing" },
                new { name = "200 Feet Bypass", address = "200 Feet Bypass, Jaipur" }
            },
            "bengaluru -> chennai" => new[]
            {
                new { name = "Sriperumbudur", address = "Sriperumbudur Toll Plaza" },
                new { name = "Poonamallee", address = "Poonamallee Junction, Chennai" },
                new { name = "Koyambedu", address = "Koyambedu, Chennai" },
                new { name = "Guindy", address = "Guindy Flyover, Chennai" },
                new { name = "Tambaram", address = "Tambaram East, Chennai" }
            },
            "hyderabad -> bengaluru" => new[]
            {
                new { name = "Hebbal", address = "Hebbal Junction, Bengaluru" },
                new { name = "Majestic", address = "Majestic, Bengaluru" },
                new { name = "Madiwala", address = "Madiwala Junction, Bengaluru" },
                new { name = "Silk Board", address = "Silk Board, Bengaluru" },
                new { name = "Electronic City", address = "Electronic City Phase 1, Bengaluru" }
            },
            "ahmedabad -> udaipur" => new[]
            {
                new { name = "Nathdwara", address = "Nathdwara Bypass, Udaipur Road" },
                new { name = "Paras Circle", address = "Paras Circle, Udaipur" },
                new { name = "Reti Stand", address = "Reti Stand, Udaipur" },
                new { name = "Udaipole", address = "Udaipole City Center, Udaipur" },
                new { name = "Thokar Chauraha", address = "Thokar Crossing, Udaipur" }
            },
            "chennai -> coimbatore" => new[]
            {
                new { name = "Avinashi", address = "Avinashi Bypass Road" },
                new { name = "Hope College", address = "Hope College, Avinashi Road, Coimbatore" },
                new { name = "Gandhipuram", address = "Gandhipuram, Coimbatore" },
                new { name = "Omni Bus Stand", address = "Sathy Road, Coimbatore" },
                new { name = "Singanallur", address = "Trichy Road, Singanallur" }
            },
            "kolkata -> bhubaneswar" => new[]
            {
                new { name = "Balasore", address = "Balasore Junction, NH-16" },
                new { name = "Bhadrak", address = "Bhadrak Town, NH-16" },
                new { name = "Cuttack", address = "Cuttack Link Road Circle" },
                new { name = "Vani Vihar", address = "Vani Vihar, Bhubaneswar" },
                new { name = "Baramunda", address = "Baramunda ISBT, Bhubaneswar" }
            },
            "goa -> mumbai" => new[]
            {
                new { name = "Vashi", address = "Sion-Panvel Highway, Vashi" },
                new { name = "Chembur", address = "Amar Mahal Flyover, Chembur" },
                new { name = "Sion", address = "Sion Circle, Mumbai" },
                new { name = "Dadar", address = "Dadar East, Mumbai" },
                new { name = "Borivali", address = "Borivali East Highway, Mumbai" }
            },
            "jaipur -> delhi" => new[]
            {
                new { name = "IFFCO Chowk", address = "IFFCO Chowk, NH-48, Gurugram" },
                new { name = "Dhaula Kuan", address = "Dhaula Kuan Metro, Delhi" },
                new { name = "Karol Bagh", address = "Karol Bagh Road, Delhi" },
                new { name = "ISBT Kashmere Gate", address = "ISBT Kashmere Gate, Delhi" },
                new { name = "Majnu Ka Tila", address = "Majnu Ka Tila, Delhi" }
            },
            "lucknow -> delhi" => new[]
            {
                new { name = "Greater Noida", address = "Pari Chowk Highway, Greater Noida" },
                new { name = "Noida", address = "Sector 37 Metro Station, Noida" },
                new { name = "Anand Vihar", address = "Anand Vihar ISBT Terminal, Delhi" },
                new { name = "Kashmiri Gate", address = "Kashmiri Gate Terminal, Delhi" },
                new { name = "Majnu Ka Tila", address = "Majnu Ka Tila, Delhi" }
            },
            "hyderabad -> vijayawada" => new[]
            {
                new { name = "Ibrahimpatnam", address = "Ibrahimpatnam Junction" },
                new { name = "Benz Circle", address = "Bus Stop" },
                new { name = "RTC Bus Stand", address = "RTC Bus Stand" },
                new { name = "Mangalagiri", address = "Mangalagiri Bypass Road" },
                new { name = "Gollapudi", address = "Gollapudi Bypass Road" }
            },
            "bengaluru -> mysuru" => new[]
            {
                new { name = "Srirangapatna", address = "Srirangapatna Toll Plaza" },
                new { name = "Columbia Asia Junction", address = "Columbia Asia Hospital, Mysuru" },
                new { name = "Mysuru Suburban", address = "Platform 5, Mysuru" },
                new { name = "Mysuru Palace", address = "Mysuru Palace Area" },
                new { name = "Chamundi Hill", address = "Chamundi Hill Crossing, Mysuru" }
            },
            "delhi -> chandigarh" => new[]
            {
                new { name = "Ambala", address = "Ambala Cantt Bypass, NH-44" },
                new { name = "Zirakpur", address = "Zirakpur Bypass Road" },
                new { name = "Tribune Chowk", address = "Tribune Chowk, Chandigarh" },
                new { name = "Sector 17", address = "Sector 17 Bus Stand, Chandigarh" },
                new { name = "Sector 43", address = "Sector 43 Bus Stand, Chandigarh" }
            },
            "pune -> nagpur" => new[]
            {
                new { name = "Amravati", address = "Amravati Bypass Road, NH-53" },
                new { name = "Butibori", address = "Butibori Industrial Area, Nagpur" },
                new { name = "Wardha Road", address = "Airport T-Point, Wardha Road, Nagpur" },
                new { name = "Ravi Nagar", address = "Ravi Nagar Crossing, Nagpur" },
                new { name = "Ganeshpeth", address = "Ganeshpeth Central Terminal, Nagpur" }
            },
            "surat -> ahmedabad" => new[]
            {
                new { name = "Nadiad", address = "Nadiad Toll Plaza, NE-1" },
                new { name = "CTM", address = "CTM Double Bridge, Ahmedabad" },
                new { name = "Geeta Mandir", address = "Geeta Mandir, Ahmedabad" },
                new { name = "Kalupur", address = "Kalupur Station Road, Ahmedabad" },
                new { name = "Paldi", address = "Paldi City Center, Ahmedabad" }
            },
            "bhopal -> indore" => new[]
            {
                new { name = "Dewas", address = "Dewas Toll Plaza, NH-52" },
                new { name = "Manglia", address = "Manglia Square, Indore" },
                new { name = "Vijay Nagar", address = "Vijay Nagar Square, Indore" },
                new { name = "Radisson", address = "Radisson Hotel Circle, Indore" },
                new { name = "Sarvate", address = "Sarvate Bus Stand Terminal, Indore" }
            },
            "visakhapatnam -> hyderabad" => new[]
            {
                new { name = "Vanasthalipuram", address = "Vanasthalipuram Toll Gate" },
                new { name = "LB Nagar", address = "Near Ring Road, LB Nagar" },
                new { name = "MGBS", address = "Platform No 11, MGBS" },
                new { name = "Ameerpet", address = "Near Big Bazaar, Ameerpet" },
                new { name = "Miyapur", address = "Allwyn X Road, Miyapur" }
            },
            "mumbai -> goa" => new[]
            {
                new { name = "Sawantwadi", address = "Sawantwadi Highway, NH-66" },
                new { name = "Mapusa", address = "Mapusa Cross Road, Goa" },
                new { name = "Panaji", address = "Kadamba Terminal, Panaji" },
                new { name = "Margao", address = "Margao City, Goa" },
                new { name = "Canacona", address = "Canacona Highway, Goa" }
            },
            _ => new[]
            {
                new { name = defaultPoint, address = "Bus Stop" }
            }
        };

        return System.Text.Json.JsonSerializer.Serialize(list);
    }

    private static List<BusBooking> BuildBusSeed()
    {
        var templates = new[]
        {
            new BusTemplate("PNB-B1001", "VRL Travels", "AC Sleeper", "Mumbai", "Pune", 1, 6, 0, 210, 850m, 18, 36, "Borivali", "Swargate",
                GetBoardingPointsJson("Mumbai", "Pune", "Borivali"), GetDroppingPointsJson("Mumbai", "Pune", "Swargate")),
            new BusTemplate("PNB-B1002", "RedBus Partner", "Non-AC Seater", "Delhi", "Jaipur", 1, 7, 30, 300, 650m, 22, 44, "ISBT Kashmere Gate", "Sindhi Camp",
                GetBoardingPointsJson("Delhi", "Jaipur", "ISBT Kashmere Gate"), GetDroppingPointsJson("Delhi", "Jaipur", "Sindhi Camp")),
            new BusTemplate("PNB-B1003", "SRS Travels", "AC Sleeper", "Bengaluru", "Chennai", 1, 22, 0, 390, 1200m, 14, 32, "Madiwala", "Koyambedu",
                GetBoardingPointsJson("Bengaluru", "Chennai", "Madiwala"), GetDroppingPointsJson("Bengaluru", "Chennai", "Koyambedu")),
            new BusTemplate("PNB-B1004", "Orange Travels", "Volvo Multi-Axle", "Hyderabad", "Bengaluru", 1, 21, 15, 510, 1450m, 16, 40, "MGBS", "Majestic",
                GetBoardingPointsJson("Hyderabad", "Bengaluru", "MGBS"), GetDroppingPointsJson("Hyderabad", "Bengaluru", "Majestic")),
            new BusTemplate("PNB-B1005", "Gujarat Travels", "AC Seater", "Ahmedabad", "Udaipur", 2, 8, 45, 330, 980m, 20, 40, "Paldi", "Udaipole",
                GetBoardingPointsJson("Ahmedabad", "Udaipur", "Paldi"), GetDroppingPointsJson("Ahmedabad", "Udaipur", "Udaipole")),
            new BusTemplate("PNB-B1006", "Parveen Travels", "AC Sleeper", "Chennai", "Coimbatore", 2, 22, 30, 470, 1350m, 19, 36, "Perungalathur", "Gandhipuram",
                GetBoardingPointsJson("Chennai", "Coimbatore", "Perungalathur"), GetDroppingPointsJson("Chennai", "Coimbatore", "Gandhipuram")),
            new BusTemplate("PNB-B1007", "GreenLine", "Volvo AC", "Kolkata", "Bhubaneswar", 2, 20, 0, 430, 1250m, 17, 40, "Esplanade", "Baramunda",
                GetBoardingPointsJson("Kolkata", "Bhubaneswar", "Esplanade"), GetDroppingPointsJson("Kolkata", "Bhubaneswar", "Baramunda")),
            new BusTemplate("PNB-B1008", "Neeta Tours", "AC Sleeper", "Goa", "Mumbai", 2, 18, 45, 710, 1650m, 12, 34, "Mapusa", "Dadar",
                GetBoardingPointsJson("Goa", "Mumbai", "Mapusa"), GetDroppingPointsJson("Goa", "Mumbai", "Dadar")),
            new BusTemplate("PNB-B1009", "RSRTC", "Non-AC Seater", "Jaipur", "Delhi", 3, 9, 15, 310, 620m, 25, 48, "Sindhi Camp", "ISBT Kashmere Gate",
                GetBoardingPointsJson("Jaipur", "Delhi", "Sindhi Camp"), GetDroppingPointsJson("Jaipur", "Delhi", "ISBT Kashmere Gate")),
            new BusTemplate("PNB-B1010", "IntrCity", "AC Sleeper", "Lucknow", "Delhi", 3, 21, 0, 560, 1550m, 13, 30, "Alambagh", "Anand Vihar",
                GetBoardingPointsJson("Lucknow", "Delhi", "Alambagh"), GetDroppingPointsJson("Lucknow", "Delhi", "Anand Vihar")),
            new BusTemplate("PNB-B1011", "TSRTC", "AC Seater", "Hyderabad", "Vijayawada", 3, 6, 50, 330, 900m, 24, 44, "Ameerpet", "Benz Circle",
                GetBoardingPointsJson("Hyderabad", "Vijayawada", "Ameerpet"), GetDroppingPointsJson("Hyderabad", "Vijayawada", "Benz Circle")),
            new BusTemplate("PNB-B1012", "KSRTC", "AC Seater", "Bengaluru", "Mysuru", 3, 7, 10, 190, 550m, 27, 44, "Satellite Bus Stand", "Mysuru Suburban",
                GetBoardingPointsJson("Bengaluru", "Mysuru", "Satellite Bus Stand"), GetDroppingPointsJson("Bengaluru", "Mysuru", "Mysuru Suburban")),
            new BusTemplate("PNB-B1013", "HRTC", "Volvo AC", "Delhi", "Chandigarh", 4, 5, 30, 260, 780m, 20, 40, "Majnu Ka Tila", "Sector 43",
                GetBoardingPointsJson("Delhi", "Chandigarh", "Majnu Ka Tila"), GetDroppingPointsJson("Delhi", "Chandigarh", "Sector 43")),
            new BusTemplate("PNB-B1014", "AbhiBus Partner", "AC Sleeper", "Pune", "Nagpur", 4, 20, 40, 720, 1750m, 11, 30, "Wakad", "Ravi Nagar",
                GetBoardingPointsJson("Pune", "Nagpur", "Wakad"), GetDroppingPointsJson("Pune", "Nagpur", "Ravi Nagar")),
            new BusTemplate("PNB-B1015", "Patel Travels", "Non-AC Sleeper", "Surat", "Ahmedabad", 4, 23, 15, 270, 740m, 18, 40, "Adajan", "Geeta Mandir",
                GetBoardingPointsJson("Surat", "Ahmedabad", "Adajan"), GetDroppingPointsJson("Surat", "Ahmedabad", "Geeta Mandir")),
            new BusTemplate("PNB-B1016", "Sangitam", "AC Sleeper", "Bhopal", "Indore", 5, 6, 45, 240, 620m, 21, 36, "Nadra Bus Stand", "Sarvate",
                GetBoardingPointsJson("Bhopal", "Indore", "Nadra Bus Stand"), GetDroppingPointsJson("Bhopal", "Indore", "Sarvate")),
            new BusTemplate("PNB-B1017", "Orange Travels", "AC Sleeper", "Visakhapatnam", "Hyderabad", 5, 19, 20, 760, 1850m, 10, 28, "Maddilapalem", "Miyapur",
                GetBoardingPointsJson("Visakhapatnam", "Hyderabad", "Maddilapalem"), GetDroppingPointsJson("Visakhapatnam", "Hyderabad", "Miyapur")),
            new BusTemplate("PNB-B1018", "VRL Travels", "Volvo AC Seater", "Mumbai", "Goa", 5, 20, 10, 690, 1700m, 9, 40, "Sion", "Panaji",
                GetBoardingPointsJson("Mumbai", "Goa", "Sion"), GetDroppingPointsJson("Mumbai", "Goa", "Panaji")),
            new BusTemplate("PNB-B2001", "SURESH TRAVELS", "Non AC Seater/Sleeper 2+1", "Hyderabad", "Vijayawada", 5, 15, 30, 480, 750m, 45, 45, "MGBS", "Benz Circle",
                GetBoardingPointsJson("Hyderabad", "Vijayawada", "MGBS"), GetDroppingPointsJson("Hyderabad", "Vijayawada", "Benz Circle")),
            new BusTemplate("PNB-B2002", "Kaveri Travels", "AC Sleeper", "Hyderabad", "Vijayawada", 1, 23, 0, 300, 1100m, 36, 36, "MGBS", "Benz Circle",
                GetBoardingPointsJson("Hyderabad", "Vijayawada", "MGBS"), GetDroppingPointsJson("Hyderabad", "Vijayawada", "Benz Circle")),
            new BusTemplate("PNB-B2003", "Morning Star Travels", "Volvo AC Seater", "Hyderabad", "Vijayawada", 2, 8, 30, 270, 1300m, 40, 40, "Ameerpet", "Benz Circle",
                GetBoardingPointsJson("Hyderabad", "Vijayawada", "Ameerpet"), GetDroppingPointsJson("Hyderabad", "Vijayawada", "Benz Circle")),
            new BusTemplate("PNB-B2004", "Dhanunjaya Travels", "Non-AC Sleeper", "Hyderabad", "Vijayawada", 3, 22, 15, 330, 800m, 30, 30, "MGBS", "Benz Circle",
                GetBoardingPointsJson("Hyderabad", "Vijayawada", "MGBS"), GetDroppingPointsJson("Hyderabad", "Vijayawada", "Benz Circle")),
            new BusTemplate("PNB-B2005", "Diwakar Travels", "Non AC Seater/Sleeper 2+1", "Hyderabad", "Vijayawada", 4, 14, 0, 310, 700m, 45, 45, "Ameerpet", "Benz Circle",
                GetBoardingPointsJson("Hyderabad", "Vijayawada", "Ameerpet"), GetDroppingPointsJson("Hyderabad", "Vijayawada", "Benz Circle")),
            new BusTemplate("PNB-B2006", "Rajesh Travels", "Non-AC Seater", "Hyderabad", "Vijayawada", 5, 10, 0, 320, 600m, 44, 44, "MGBS", "Benz Circle",
                GetBoardingPointsJson("Hyderabad", "Vijayawada", "MGBS"), GetDroppingPointsJson("Hyderabad", "Vijayawada", "Benz Circle")),
            new BusTemplate("TS-HYB-002", "Royal Travels", "SEATER/SLEEPER 2+1 HYBRID AC", "Delhi", "Jaipur", 5, 18, 0, 420, 1350m, 36, 36, "Delhi ISBT", "Jaipur Sindhi Camp",
                GetBoardingPointsJson("Delhi", "Jaipur", "Delhi ISBT"), GetDroppingPointsJson("Delhi", "Jaipur", "Jaipur Sindhi Camp"))
        };
        
        return templates.Select(t =>
        {
            var departure = DepartureAtUtcFromIst(t.DayOffset, t.DepartureHour, t.DepartureMinute);
            var boardingPoint = t.BoardingPoint;
            var droppingPoint = t.DroppingPoint;

            try
            {
                var options = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };
                var bps = System.Text.Json.JsonSerializer.Deserialize<List<PickNBook.Api.Models.DTOs.BusPointDto>>(t.BoardingPointsJson, options);
                var dps = System.Text.Json.JsonSerializer.Deserialize<List<PickNBook.Api.Models.DTOs.BusPointDto>>(t.DroppingPointsJson, options);
                if (bps != null && bps.Count > 0)
                {
                    boardingPoint = bps[0].Name;
                }
                if (dps != null && dps.Count > 0)
                {
                    droppingPoint = dps[dps.Count - 1].Name;
                }
            }
            catch {}

            string assignedGstCategory = "AC";
            if (t.BusType.Contains("Non-AC", StringComparison.OrdinalIgnoreCase) || 
                t.BusType.Contains("Non AC", StringComparison.OrdinalIgnoreCase))
            {
                assignedGstCategory = "Non-AC";
            }
            else if (t.BusType.Contains("Volvo", StringComparison.OrdinalIgnoreCase))
            {
                assignedGstCategory = "VOLVO";
            }

            return new BusBooking
            {
                BusNumber = t.BusNumber,
                OperatorName = t.OperatorName,
                BusType = t.BusType,
                GstCategory = assignedGstCategory,
                FromCity = t.FromCity,
                ToCity = t.ToCity,
                DepartureTime = departure,
                ArrivalTime = departure.AddMinutes(t.DurationMinutes),
                PriceInr = t.PriceInr,
                AvailableSeats = t.AvailableSeats,
                TotalSeats = t.TotalSeats,
                BoardingPoint = boardingPoint,
                DroppingPoint = droppingPoint,
                BoardingPointsJson = t.BoardingPointsJson,
                DroppingPointsJson = t.DroppingPointsJson
            };
        }).ToList();
    }
    private static async Task InsertNextWeekBusSchedulesAsync(
        AppDbContext dbContext,
        CancellationToken cancellationToken)
    {
        var todayIst = DateTimeOffset.UtcNow.ToOffset(IndiaOffset).Date;

        // ── 1. Fetch one template row per unique bus+route ──────────────────────
        var allRows = await dbContext.BusBookings
            .AsNoTracking()
            .ToListAsync(cancellationToken);

        var templates = allRows
            .GroupBy(x => new
            {
                x.BusNumber,
                x.FromCity,
                x.ToCity,
                Time = x.DepartureTime.Add(IndiaOffset).TimeOfDay
            })
            .Select(g => g.OrderBy(x => x.Id).First())   // always pick the seed/original row
            .ToList();

        // ── 2. Load ALL existing keys for the next 7 days in ONE query ──────────
        var windowStart = DateTime.SpecifyKind(todayIst.AddDays(1) - IndiaOffset, DateTimeKind.Utc);
        var windowEnd = DateTime.SpecifyKind(todayIst.AddDays(8) - IndiaOffset, DateTimeKind.Utc);

        var existingKeys = await dbContext.BusBookings
            .AsNoTracking()
            .Where(x => x.DepartureTime >= windowStart && x.DepartureTime < windowEnd)
            .Select(x => new { x.BusNumber, x.FromCity, x.ToCity, x.DepartureTime })
            .ToListAsync(cancellationToken);

        // Use minute-precision string key — immune to sub-minute tick differences
        var existingSet = existingKeys
            .Select(x => $"{x.BusNumber}|{x.FromCity}|{x.ToCity}|{x.DepartureTime:yyyy-MM-ddTHH:mm:ss}")
            .ToHashSet(StringComparer.OrdinalIgnoreCase);

        // ── 3. Build only the genuinely missing rows ────────────────────────────
        var newBuses = new List<BusBooking>();

        foreach (var template in templates)
        {
            for (int i = 1; i <= 7; i++)
            {
                var newDateIst = todayIst.AddDays(i);

                var depIstTime = template.DepartureTime.Add(IndiaOffset).TimeOfDay;
                var depIst = new DateTime(newDateIst.Year, newDateIst.Month, newDateIst.Day).Add(depIstTime);
                var depUtc = DateTime.SpecifyKind(depIst - IndiaOffset, DateTimeKind.Utc);

                // ✅ ONE set lookup instead of one DB round-trip per row
                var key = $"{template.BusNumber}|{template.FromCity}|{template.ToCity}|{depUtc:yyyy-MM-ddTHH:mm:ss}";
                if (existingSet.Contains(key))
                    continue;

                var duration = template.ArrivalTime - template.DepartureTime;
                if (duration <= TimeSpan.Zero)
                    duration = TimeSpan.FromMinutes(300);

                newBuses.Add(new BusBooking
                {
                    BusNumber = template.BusNumber,
                    OperatorName = template.OperatorName,
                    BusType = template.BusType,
                    GstCategory = template.GstCategory,
                    FromCity = template.FromCity,
                    ToCity = template.ToCity,
                    BoardingPoint = template.BoardingPoint,
                    DroppingPoint = template.DroppingPoint,
                    BoardingPointsJson = template.BoardingPointsJson,
                    DroppingPointsJson = template.DroppingPointsJson,
                    DepartureTime = depUtc,
                    ArrivalTime = depUtc.Add(duration),
                    PriceInr = template.PriceInr,
                    TotalSeats = template.TotalSeats,
                    AvailableSeats = template.TotalSeats
                });
            }
        }

        // ── 4. Insert only if there is something new ────────────────────────────
        if (newBuses.Count == 0)
            return;

        await dbContext.BusBookings.AddRangeAsync(newBuses, cancellationToken);

        try
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            Console.WriteLine($"Inserted {newBuses.Count} new bus schedule rows.");
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("Duplicate") == true)
        {
            // DB-level safety net — should never fire now
            Console.WriteLine("Duplicate insert caught and ignored.");
            dbContext.ChangeTracker.Clear();
        }
    }

    private static (DateTime StartUtc, DateTime EndUtc) NextWeekUtcRange()
    {
        var todayIst = DateTimeOffset.UtcNow.ToOffset(IndiaOffset).Date;
        var startIst = new DateTimeOffset(todayIst.Year, todayIst.Month, todayIst.Day, 0, 0, 0, IndiaOffset).AddDays(7);
        var endIst = startIst.AddDays(7);
        return (startIst.UtcDateTime, endIst.UtcDateTime);
    }

    private static DateTime DepartureAtUtcFromIst(int dayOffset, int hour, int minute)
    {
        var todayIst = DateTimeOffset.UtcNow.ToOffset(IndiaOffset).Date;
        var date = todayIst.AddDays(dayOffset);
        var departureIst = new DateTimeOffset(date.Year, date.Month, date.Day, hour, minute, 0, IndiaOffset);
        return departureIst.UtcDateTime;
    }

    private static int StableHash(string value)
    {
        unchecked
        {
            var hash = 23;
            foreach (var c in value)
            {
                hash = (hash * 31) + c;
            }

            return Math.Abs(hash);
        }
    }

    private sealed record BusTemplate(
        string BusNumber,
        string OperatorName,
        string BusType,
        string FromCity,
        string ToCity,
        int DayOffset,
        int DepartureHour,
        int DepartureMinute,
        int DurationMinutes,
        decimal PriceInr,
        int AvailableSeats,
        int TotalSeats,
        string BoardingPoint,
        string DroppingPoint,
        string BoardingPointsJson,
        string DroppingPointsJson);

    private sealed record AirlineDef(string Name, string Code);

    private static (List<PickNBook.Api.Models.DTOs.BusPointDto> Boarding, List<PickNBook.Api.Models.DTOs.BusPointDto> Dropping) FilterDuplicatePoints(
        List<PickNBook.Api.Models.DTOs.BusPointDto> boarding,
        List<PickNBook.Api.Models.DTOs.BusPointDto> dropping)
    {
        if (boarding == null) boarding = new();
        if (dropping == null) dropping = new();

        if (boarding.Count == 0 || dropping.Count == 0)
        {
            return (boarding, dropping);
        }

        var boardingNames = boarding.Select(x => x.Name.Trim().ToLowerInvariant()).ToHashSet();
        var filteredDropping = new List<PickNBook.Api.Models.DTOs.BusPointDto>();

        foreach (var dp in dropping)
        {
            var dpName = dp.Name.Trim().ToLowerInvariant();
            if (boardingNames.Contains(dpName))
            {
                continue; 
            }
            filteredDropping.Add(dp);
        }

        if (filteredDropping.Count == 0)
        {
            filteredDropping.Add(dropping[0]);
            if (boarding.Count > 1)
            {
                var firstDroppingName = dropping[0].Name.Trim().ToLowerInvariant();
                boarding = boarding.Where(bp => bp.Name.Trim().ToLowerInvariant() != firstDroppingName).ToList();
            }
        }

        return (boarding, filteredDropping);
    }

    private static async Task CleanDuplicatePointsInDbAsync(AppDbContext dbContext, CancellationToken cancellationToken)
    {
        var buses = await dbContext.BusBookings.ToListAsync(cancellationToken);
        var modified = false;
        var options = new System.Text.Json.JsonSerializerOptions { PropertyNameCaseInsensitive = true };

        foreach (var bus in buses)
        {
            if (string.IsNullOrWhiteSpace(bus.BoardingPointsJson) || string.IsNullOrWhiteSpace(bus.DroppingPointsJson))
            {
                continue;
            }

            List<PickNBook.Api.Models.DTOs.BusPointDto>? boarding = null;
            List<PickNBook.Api.Models.DTOs.BusPointDto>? dropping = null;

            try
            {
                boarding = System.Text.Json.JsonSerializer.Deserialize<List<PickNBook.Api.Models.DTOs.BusPointDto>>(bus.BoardingPointsJson, options);
                dropping = System.Text.Json.JsonSerializer.Deserialize<List<PickNBook.Api.Models.DTOs.BusPointDto>>(bus.DroppingPointsJson, options);
            }
            catch
            {
                // Ignore parsing errors
            }

            if (boarding != null && dropping != null)
            {
                var (cleanBoarding, cleanDropping) = FilterDuplicatePoints(boarding, dropping);

                var newBoardingJson = System.Text.Json.JsonSerializer.Serialize(cleanBoarding);
                var newDroppingJson = System.Text.Json.JsonSerializer.Serialize(cleanDropping);

                var firstBoardingPoint = cleanBoarding.Count > 0 ? cleanBoarding[0].Name : bus.BoardingPoint;
                var lastDroppingPoint = cleanDropping.Count > 0 ? cleanDropping[cleanDropping.Count - 1].Name : bus.DroppingPoint;

                if (bus.BoardingPointsJson != newBoardingJson || bus.DroppingPointsJson != newDroppingJson || bus.BoardingPoint != firstBoardingPoint || bus.DroppingPoint != lastDroppingPoint)
                {
                    bus.BoardingPointsJson = newBoardingJson;
                    bus.DroppingPointsJson = newDroppingJson;
                    bus.BoardingPoint = firstBoardingPoint;
                    bus.DroppingPoint = lastDroppingPoint;
                    modified = true;
                }
            }
        }

        if (modified)
        {
            await dbContext.SaveChangesAsync(cancellationToken);
            Console.WriteLine("Cleaned up duplicate boarding/dropping points in existing database bookings.");
        }
    }
}

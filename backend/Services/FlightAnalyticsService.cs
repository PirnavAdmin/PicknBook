using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Services;

public interface IFlightAnalyticsService
{
    Task<FeaturedFlightsDto> GetFeaturedFlights(
        string origin,
        string destination,
        decimal? budget);
}

public class FlightAnalyticsService : IFlightAnalyticsService
{
    private readonly IAmadeusService _amadeusService;
    private readonly AppDbContext _context;

    public FlightAnalyticsService(
        IAmadeusService amadeusService,
        AppDbContext context)
    {
        _amadeusService = amadeusService;
        _context = context;
    }

    public async Task<FeaturedFlightsDto> GetFeaturedFlights(
        string origin,
        string destination,
        decimal? budget)
    {
        var flights = await _amadeusService.SearchFlightsAsync(
            origin,
            destination,
            DateTime.UtcNow.Date);

        if (flights == null || !flights.Any())
        {
            return new FeaturedFlightsDto();
        }

        // De-duplicate same offer variants returned by provider.
        var uniqueFlights = flights
            .GroupBy(f => new
            {
                f.Airline,
                f.Origin,
                f.Destination,
                f.DepartureTime,
                f.ArrivalTime,
                f.Price,
                f.Currency,
                f.DurationMinutes,
                f.StopsCount
            })
            .Select(g => g
                .OrderByDescending(x => x.AvailableSeats)
                .First())
            .ToList();

        // =============================
        // CHEAPEST
        // =============================
        var cheapest = uniqueFlights
            .OrderBy(f => f.Price)
            .FirstOrDefault();

        if (cheapest != null)
        {
            await SaveCheapestFlight(origin, destination, cheapest);
        }

        // =============================
        // UNDER BUDGET (LIMIT 5)
        // budget=null means no budget filtering.
        // =============================
        var underBudgetBase = budget.HasValue
            ? uniqueFlights.Where(f => f.Price <= budget.Value)
            : uniqueFlights;

        var underBudget = underBudgetBase
            .OrderBy(f => f.Price)
            .Take(5)
            .ToList();

        // =============================
        // FASTEST (Prefer Non-Stop)
        // =============================
        var fastestNonStop = uniqueFlights
            .Where(f => f.StopsCount == 0)
            .OrderBy(f => f.DurationMinutes)
            .ThenBy(f => f.Price)
            .FirstOrDefault();

        var fastestCheapest = fastestNonStop ?? uniqueFlights
            .OrderBy(f => f.DurationMinutes)
            .ThenBy(f => f.Price)
            .FirstOrDefault();

        // =============================
        // CHEAPEST AIRLINE
        // =============================
        var cheapestAirline = uniqueFlights
            .GroupBy(f => f.Airline)
            .OrderBy(g => g.Min(f => f.Price))
            .FirstOrDefault()?.Key;

        // =============================
        // LIMITED SEATS (<=5)
        // =============================
        var limitedSeats = uniqueFlights
            .Where(f => f.AvailableSeats <= 5)
            .OrderBy(f => f.AvailableSeats)
            .Take(5)
            .ToList();

        // =============================
        // WEEKLY CHEAPEST (LAST 7 DAYS)
        // =============================
        var oneWeekAgo = DateTime.UtcNow.AddDays(-7);

        var weeklyCheapest = await _context.CheapestFlights
            .Where(x => x.RecordedAt >= oneWeekAgo
                        && !string.IsNullOrWhiteSpace(x.Currency)
                        && x.Currency == "INR"
                        && x.AvailableSeats > 0
                        && x.DurationMinutes > 0
                        && x.ArrivalDate > x.DepartureDate)
            .OrderBy(x => x.Price)
            .Select(x => new FlightOfferDto
            {
                Airline = x.Airline,
                Origin = x.Origin,
                Destination = x.Destination,
                Price = x.Price,
                Currency = x.Currency,
                AvailableSeats = x.AvailableSeats,
                IsLimitedSeats = x.IsLimitedSeats,
                DurationMinutes = x.DurationMinutes,
                StopsCount = x.StopsCount,
                DepartureTime = DateTime.SpecifyKind(x.DepartureDate, DateTimeKind.Utc),
                ArrivalTime = DateTime.SpecifyKind(x.ArrivalDate, DateTimeKind.Utc)
            })
            .FirstOrDefaultAsync();

        return new FeaturedFlightsDto
        {
            CheapestRoute = cheapest,
            UnderBudgetFlights = underBudget,
            FastestCheapestCombo = fastestCheapest,
            CheapestAirline = cheapestAirline,
            LimitedSeatFlights = limitedSeats,
            WeeklyCheapestFlight = weeklyCheapest
        };
    }

    private async Task SaveCheapestFlight(
        string origin,
        string destination,
        FlightOfferDto flight)
    {
        var today = DateTime.UtcNow.Date;

        // Remove records older than 7 days
        var oneWeekAgo = DateTime.UtcNow.AddDays(-7);
        var oldFlights = _context.CheapestFlights
            .Where(x => x.RecordedAt < oneWeekAgo);

        _context.CheapestFlights.RemoveRange(oldFlights);

        // Upsert today's record so newly added fields are always populated.
        var existing = await _context.CheapestFlights
            .FirstOrDefaultAsync(x => x.RecordedAt.Date == today
                                      && x.Origin == origin
                                      && x.Destination == destination);

        if (existing == null)
        {
            _context.CheapestFlights.Add(new CheapestFlight
            {
                Origin = origin,
                Destination = destination,
                Airline = flight.Airline,
                Price = flight.Price,
                DepartureDate = DateTime.SpecifyKind(flight.DepartureTime, DateTimeKind.Utc),
                ArrivalDate = DateTime.SpecifyKind(flight.ArrivalTime, DateTimeKind.Utc),
                Currency = flight.Currency ?? "INR",
                AvailableSeats = flight.AvailableSeats,
                IsLimitedSeats = flight.IsLimitedSeats,
                StopsCount = flight.StopsCount,
                DurationMinutes = flight.DurationMinutes,
                RecordedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc)
            });
        }
        else
        {
            existing.Airline = flight.Airline;
            existing.Price = flight.Price;
            existing.DepartureDate = DateTime.SpecifyKind(flight.DepartureTime, DateTimeKind.Utc);
            existing.ArrivalDate = DateTime.SpecifyKind(flight.ArrivalTime, DateTimeKind.Utc);
            existing.Currency = flight.Currency ?? "INR";
            existing.AvailableSeats = flight.AvailableSeats;
            existing.IsLimitedSeats = flight.IsLimitedSeats;
            existing.StopsCount = flight.StopsCount;
            existing.DurationMinutes = flight.DurationMinutes;
            existing.RecordedAt = DateTime.SpecifyKind(DateTime.UtcNow, DateTimeKind.Utc);
        }

        await _context.SaveChangesAsync();
    }
}

using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Data;
using PickNBook.Api.Models.DTOs;
using System.Text.Json;

namespace PickNBook.Api.Controllers
{


    public class PlacesController(AppDbContext dbContext) : BaseApiController
    {
        private static readonly Lazy<List<PlaceSuggestionDto>> AirportCities = new(LoadAirportCities);

        [HttpGet]
        public async Task<IActionResult> GetPlaces(
            [FromQuery] string? query,
            [FromQuery] string tripType = "all",
            [FromQuery] string field = "all",
            [FromQuery] int limit = 20)
        {
            if (limit <= 0)
            {
                return BadRequest("limit must be greater than 0.");
            }

            limit = Math.Min(limit, 100);

            var normalizedTripType = tripType.Trim().ToLowerInvariant();
            if (normalizedTripType is not ("all" or "flight" or "bus"))
            {
                return BadRequest("tripType must be one of: all, flight, bus.");
            }

            var normalizedField = field.Trim().ToLowerInvariant();
            if (normalizedField is not ("all" or "from" or "to"))
            {
                return BadRequest("field must be one of: all, from, to.");
            }

            var cityCandidates = new List<PlaceSuggestionDto>();

            if (normalizedTripType is "all" or "flight")
            {
                var airportCities = AirportCities.Value;
                if (airportCities.Count > 0)
                {
                    cityCandidates.AddRange(airportCities);
                }
                else
                {
                    if (normalizedField is "all" or "from")
                    {
                        var fromCities = await dbContext.FlightBookings
                            .AsNoTracking()
                            .Select(x => x.FromCity)
                            .ToListAsync();
                        cityCandidates.AddRange(fromCities.Select(x => new PlaceSuggestionDto
                        {
                            CityName = x,
                            UsageCount = 1
                        }));
                    }

                    if (normalizedField is "all" or "to")
                    {
                        var toCities = await dbContext.FlightBookings
                            .AsNoTracking()
                            .Select(x => x.ToCity)
                            .ToListAsync();
                        cityCandidates.AddRange(toCities.Select(x => new PlaceSuggestionDto
                        {
                            CityName = x,
                            UsageCount = 1
                        }));
                    }
                }
            }

            if (normalizedTripType is "all" or "bus")
            {
                if (normalizedField is "all" or "from")
                {
                    var fromCities = await dbContext.BusBookings
                        .AsNoTracking()
                        .Select(x => x.FromCity)
                        .ToListAsync();
                    cityCandidates.AddRange(fromCities.Select(x => new PlaceSuggestionDto
                    {
                        CityName = x,
                        UsageCount = 1
                    }));
                }

                if (normalizedField is "all" or "to")
                {
                    var toCities = await dbContext.BusBookings
                        .AsNoTracking()
                        .Select(x => x.ToCity)
                        .ToListAsync();
                    cityCandidates.AddRange(toCities.Select(x => new PlaceSuggestionDto
                    {
                        CityName = x,
                        UsageCount = 1
                    }));
                }
            }

            if (!string.IsNullOrWhiteSpace(query))
            {
                var keyword = query.Trim();
                cityCandidates = cityCandidates
                    .Where(x => x.CityName.Contains(keyword, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            var response = cityCandidates
                .Where(x => !string.IsNullOrWhiteSpace(x.CityName))
                .GroupBy(x => x.CityName.Trim(), StringComparer.OrdinalIgnoreCase)
                .Select(g => new PlaceSuggestionDto
                {
                    CityName = g.OrderBy(x => x.CityName).First().CityName,
                    UsageCount = g.Sum(x => x.UsageCount)
                })
                .OrderByDescending(x => x.UsageCount)
                .ThenBy(x => x.CityName)
                .Take(limit)
                .ToList();

            return Ok(response);
        }

        private static List<PlaceSuggestionDto> LoadAirportCities()
        {
            try
            {
                var baseDir = AppContext.BaseDirectory;
                var filePath = Path.Combine(baseDir, "Data", "airport_cities_in.json");
                if (!System.IO.File.Exists(filePath))
                {
                    return [];
                }

                var json = System.IO.File.ReadAllText(filePath);
                var data = JsonSerializer.Deserialize<List<PlaceSuggestionDto>>(json, new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                });

                return data ?? [];
            }
            catch
            {
                return [];
            }
        }
    }
}

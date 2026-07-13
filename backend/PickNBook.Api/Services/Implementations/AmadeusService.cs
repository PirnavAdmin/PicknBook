using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using PickNBook.Api.Models;
using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;

namespace PickNBook.Api.Services
{
    public interface IAmadeusService
    {
        Task<List<FlightOfferDto>> SearchFlightsAsync(
            string origin,
            string destination,
            DateTime departureDate);
    }

    public class AmadeusService : IAmadeusService
    {
        private readonly HttpClient _httpClient;
        private readonly AmadeusSettings _settings;
        private readonly IMemoryCache _cache;

        private string? _accessToken;
        private DateTime _tokenExpiry;

        public AmadeusService(
            HttpClient httpClient,
            IOptions<AmadeusSettings> settings,
            IMemoryCache cache)
        {
            _httpClient = httpClient;
            _httpClient.Timeout = TimeSpan.FromSeconds(60);
            _settings = settings.Value;
            _cache = cache;
        }

        // =====================================
        // GET ACCESS TOKEN (With Caching)
        // =====================================
        private async Task<string> GetAccessTokenAsync()
        {
            if (!string.IsNullOrEmpty(_accessToken) &&
                _tokenExpiry > DateTime.UtcNow)
            {
                return _accessToken;
            }

            var request = new HttpRequestMessage(
                HttpMethod.Post,
                $"{_settings.BaseUrl}/v1/security/oauth2/token");

            request.Content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("grant_type", "client_credentials"),
                new KeyValuePair<string, string>("client_id", _settings.ClientId),
                new KeyValuePair<string, string>("client_secret", _settings.ClientSecret)
            });

            var response = await _httpClient.SendAsync(request);

            if (!response.IsSuccessStatusCode)
                throw new Exception("Failed to get Amadeus access token.");

            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);

            _accessToken = json.RootElement
                .GetProperty("access_token")
                .GetString();

            var expiresIn = json.RootElement
                .GetProperty("expires_in")
                .GetInt32();

            _tokenExpiry = DateTime.UtcNow.AddSeconds(expiresIn - 60);

            return _accessToken!;
        }

        // =====================================
        // SEARCH FLIGHTS (With Memory Cache)
        // =====================================
        public async Task<List<FlightOfferDto>> SearchFlightsAsync(
            string origin,
            string destination,
            DateTime departureDate)
        {
            string cacheKey = $"FLIGHTS-{origin}-{destination}-{departureDate:yyyy-MM-dd}-INR-ALL";

            if (_cache.TryGetValue(cacheKey, out List<FlightOfferDto>? cachedFlights)
                && cachedFlights != null)
            {
                return cachedFlights;
            }

            var token = await GetAccessTokenAsync();

            _httpClient.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", token);

            // Fetch all offers (non-stop + layovers).
            var flights = await FetchFlightsFromApiAsync(
                origin,
                destination,
                departureDate,
                nonStop: false);

            _cache.Set(cacheKey, flights, TimeSpan.FromMinutes(10));

            return flights;
        }

        private async Task<List<FlightOfferDto>> FetchFlightsFromApiAsync(
            string origin,
            string destination,
            DateTime departureDate,
            bool nonStop)
        {
            var url =
                $"{_settings.BaseUrl}/v2/shopping/flight-offers" +
                $"?originLocationCode={origin}" +
                $"&destinationLocationCode={destination}" +
                $"&departureDate={departureDate:yyyy-MM-dd}" +
                $"&adults=1" +
                $"&nonStop={nonStop.ToString().ToLowerInvariant()}" +
                $"&currencyCode=INR" +
                $"&max=50";

            var response = await _httpClient.GetAsync(url);

            if (!response.IsSuccessStatusCode)
                throw new Exception("Failed to fetch flight offers from Amadeus.");

            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);
            var flights = new List<FlightOfferDto>();

            if (!json.RootElement.TryGetProperty("data", out var dataElement))
            {
                return flights;
            }

            foreach (var offer in dataElement.EnumerateArray())
            {
                var itinerary = offer.GetProperty("itineraries")[0];
                var segments = itinerary.GetProperty("segments");

                var firstSegment = segments[0];
                var lastSegment = segments[segments.GetArrayLength() - 1];

                var price = decimal.Parse(
                    offer.GetProperty("price")
                         .GetProperty("total")
                         .GetString()!,
                    CultureInfo.InvariantCulture);

                string? cabin = null;
                string? brandedFare = null;
                string? brandedFareLabel = null;
                decimal? checkedBagsWeight = null;
                string? checkedBagsUnit = null;
                int? checkedBagsQuantity = null;
                decimal? cabinBagsWeight = null;
                string? cabinBagsUnit = null;
                int? cabinBagsQuantity = null;

                if (offer.TryGetProperty("travelerPricings", out var travelerPricings) && travelerPricings.GetArrayLength() > 0)
                {
                    var travelerPricing = travelerPricings[0];
                    if (travelerPricing.TryGetProperty("fareDetailsBySegment", out var fareDetailsBySegment) && fareDetailsBySegment.GetArrayLength() > 0)
                    {
                        var segmentDetails = fareDetailsBySegment[0];
                        if (segmentDetails.TryGetProperty("cabin", out var cabinElement))
                        {
                            cabin = cabinElement.GetString();
                        }
                        if (segmentDetails.TryGetProperty("brandedFare", out var bfElement))
                        {
                            brandedFare = bfElement.GetString();
                        }
                        if (segmentDetails.TryGetProperty("brandedFareLabel", out var bflElement))
                        {
                            brandedFareLabel = bflElement.GetString();
                        }

                        // Checked bags
                        if (segmentDetails.TryGetProperty("includedCheckedBags", out var checkedBagsElement))
                        {
                            if (checkedBagsElement.TryGetProperty("weight", out var weightElement))
                            {
                                if (weightElement.ValueKind == JsonValueKind.Number)
                                    checkedBagsWeight = weightElement.GetDecimal();
                                else if (decimal.TryParse(weightElement.GetString(), out var wVal))
                                    checkedBagsWeight = wVal;
                            }
                            if (checkedBagsElement.TryGetProperty("weightUnit", out var unitElement))
                            {
                                checkedBagsUnit = unitElement.GetString();
                            }
                            if (checkedBagsElement.TryGetProperty("quantity", out var qtyElement))
                            {
                                if (qtyElement.ValueKind == JsonValueKind.Number)
                                    checkedBagsQuantity = qtyElement.GetInt32();
                                else if (int.TryParse(qtyElement.GetString(), out var qVal))
                                    checkedBagsQuantity = qVal;
                            }
                        }

                        // Cabin bags
                        if (segmentDetails.TryGetProperty("includedCabinBags", out var cabinBagsElement))
                        {
                            if (cabinBagsElement.TryGetProperty("weight", out var weightElement))
                            {
                                if (weightElement.ValueKind == JsonValueKind.Number)
                                    cabinBagsWeight = weightElement.GetDecimal();
                                else if (decimal.TryParse(weightElement.GetString(), out var wVal))
                                    cabinBagsWeight = wVal;
                            }
                            if (cabinBagsElement.TryGetProperty("weightUnit", out var unitElement))
                            {
                                cabinBagsUnit = unitElement.GetString();
                            }
                            if (cabinBagsElement.TryGetProperty("quantity", out var qtyElement))
                            {
                                if (qtyElement.ValueKind == JsonValueKind.Number)
                                    cabinBagsQuantity = qtyElement.GetInt32();
                                else if (int.TryParse(qtyElement.GetString(), out var qVal))
                                    cabinBagsQuantity = qVal;
                            }
                        }
                    }
                }

                var seats = offer.TryGetProperty("numberOfBookableSeats", out var seatsEl) ? seatsEl.GetInt32() : 9;

                flights.Add(new FlightOfferDto
                {
                    // Use operating carrier for display; validating carrier can be constant.
                    Airline = firstSegment.GetProperty("carrierCode").GetString(),
                    Origin = firstSegment.GetProperty("departure").GetProperty("iataCode").GetString(),
                    Destination = lastSegment.GetProperty("arrival").GetProperty("iataCode").GetString(),
                    DepartureTime = firstSegment.GetProperty("departure").GetProperty("at").GetDateTime(),
                    ArrivalTime = lastSegment.GetProperty("arrival").GetProperty("at").GetDateTime(),
                    Price = price,
                    Currency = offer.GetProperty("price").GetProperty("currency").GetString(),
                    AvailableSeats = seats,
                    IsLimitedSeats = seats <= 5,
                    StopsCount = Math.Max(segments.GetArrayLength() - 1, 0),
                    DurationMinutes = CalculateDurationMinutes(
                        itinerary.GetProperty("duration").GetString()!),

                    // Set segment-specific details
                    Cabin = cabin,
                    BrandedFare = brandedFare,
                    BrandedFareLabel = brandedFareLabel,
                    CheckedBagsWeight = checkedBagsWeight,
                    CheckedBagsUnit = checkedBagsUnit,
                    CheckedBagsQuantity = checkedBagsQuantity,
                    CabinBagsWeight = cabinBagsWeight,
                    CabinBagsUnit = cabinBagsUnit,
                    CabinBagsQuantity = cabinBagsQuantity
                });
            }


            return flights;
        }

        // =====================================
        // Convert ISO Duration to Minutes
        // =====================================
        private int CalculateDurationMinutes(string duration)
        {
            var time = System.Xml.XmlConvert.ToTimeSpan(duration);
            return (int)time.TotalMinutes;
        }
    }
}

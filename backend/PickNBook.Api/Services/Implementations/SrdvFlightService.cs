using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using PickNBook.Api.Models.Config;
using PickNBook.Api.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;

namespace PickNBook.Api.Services
{
    public class SrdvFlightService : ISrdvFlightService
    {
        private readonly HttpClient _httpClient;
        private readonly SrdvSettings _settings;
        private readonly IMemoryCache _cache;
        
        private string? _tokenId;
        private DateTime _tokenExpiry;

        public SrdvFlightService(HttpClient httpClient, IOptions<SrdvSettings> settings, IMemoryCache cache)
        {
            _httpClient = httpClient;
            _httpClient.Timeout = TimeSpan.FromSeconds(60);
            _settings = settings.Value;
            _cache = cache;

            if (!string.IsNullOrEmpty(_settings.ApiToken))
            {
                _httpClient.DefaultRequestHeaders.Remove("Api-Token");
                _httpClient.DefaultRequestHeaders.Add("Api-Token", _settings.ApiToken);
            }
        }

        public async Task<string> AuthenticateAsync()
        {
            if (!string.IsNullOrEmpty(_tokenId) && _tokenExpiry > DateTime.UtcNow)
            {
                return _tokenId;
            }

            var requestBody = new
            {
                ClientId = _settings.ClientId,
                UserName = _settings.UserName,
                Password = _settings.Password,
                EndUserIp = "127.0.0.1" // Replace with actual logic to fetch IP if needed
            };

            var response = await _httpClient.PostAsJsonAsync($"{_settings.FlightBaseUrl}/Authenticate", requestBody);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);
            
            if (json.RootElement.GetProperty("Status").GetInt32() == 1)
            {
                var token = json.RootElement.GetProperty("TokenId").GetString();
                _tokenId = token;
                _tokenExpiry = DateTime.UtcNow.AddHours(23); // Typical token validity
                return token!;
            }
            
            throw new Exception("SRDV Authentication Failed.");
        }

        public async Task<List<FlightOfferDto>> SearchFlightsAsync(
            string origin, 
            string destination, 
            DateTime departureDate, 
            int adultCount = 1, 
            int childCount = 0, 
            int infantCount = 0)
        {
            var token = await AuthenticateAsync();

            var requestBody = new
            {
                EndUserIp = "127.0.0.1",
                TokenId = token,
                AdultCount = adultCount.ToString(),
                ChildCount = childCount.ToString(),
                InfantCount = infantCount.ToString(),
                DirectFlight = "false",
                OneStopFlight = "false",
                JourneyType = "1",
                PreferredAirlines = null as string[],
                Segments = new[]
                {
                    new
                    {
                        Origin = origin,
                        Destination = destination,
                        FlightCabinClass = "1", // Economy
                        PreferredDepartureTime = departureDate.ToString("yyyy-MM-ddT00:00:00"),
                        PreferredArrivalTime = departureDate.ToString("yyyy-MM-ddT00:00:00")
                    }
                },
                Sources = null as string[]
            };

            var response = await _httpClient.PostAsJsonAsync($"{_settings.FlightBaseUrl}/Search", requestBody);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);
            
            var offers = new List<FlightOfferDto>();
            
            if (json.RootElement.GetProperty("Response").GetProperty("ResponseStatus").GetInt32() == 1)
            {
                var traceId = json.RootElement.GetProperty("Response").GetProperty("TraceId").GetString();
                var results = json.RootElement.GetProperty("Response").GetProperty("Results")[0];
                
                foreach (var result in results.EnumerateArray())
                {
                    var isLcc = result.GetProperty("IsLcc").GetBoolean();
                    var resultIndex = result.GetProperty("ResultIndex").GetString();
                    var srdvIndex = result.GetProperty("SrdvIndex").GetInt32();
                    var srdvType = result.GetProperty("SrdvType").GetString();
                    
                    var priceObj = result.GetProperty("Fare").GetProperty("PublishedFare");
                    var price = priceObj.GetDecimal();
                    
                    var segmentsJson = result.GetProperty("Segments").GetRawText();
                    var firstSegment = result.GetProperty("Segments")[0][0];
                    var lastSegment = result.GetProperty("Segments")[0][result.GetProperty("Segments")[0].GetArrayLength() - 1];
                    
                    var airline = firstSegment.GetProperty("Airline").GetProperty("AirlineName").GetString();
                    var depTime = firstSegment.GetProperty("Origin").GetProperty("DepTime").GetDateTime();
                    var arrTime = lastSegment.GetProperty("Destination").GetProperty("ArrTime").GetDateTime();
                    
                    offers.Add(new FlightOfferDto
                    {
                        Airline = airline!,
                        Origin = origin,
                        Destination = destination,
                        DepartureTime = depTime,
                        ArrivalTime = arrTime,
                        Price = price,
                        Currency = "INR",
                        AvailableSeats = result.TryGetProperty("AvailableSeats", out var seats) ? seats.GetInt32() : 9,
                        StopsCount = result.GetProperty("Segments")[0].GetArrayLength() - 1,
                        TraceId = traceId,
                        ResultIndex = resultIndex,
                        SrdvIndex = srdvIndex,
                        IsLcc = isLcc,
                        SrdvType = srdvType,
                        SegmentsJson = segmentsJson,
                        DurationMinutes = (int)(arrTime - depTime).TotalMinutes
                    });
                }
            }
            
            return offers;
        }

        public async Task<FlightFareQuoteDto> GetFareQuoteAsync(string traceId, string resultIndex)
        {
            var token = await AuthenticateAsync();
            
            var requestBody = new
            {
                EndUserIp = "127.0.0.1",
                TokenId = token,
                TraceId = traceId,
                ResultIndex = resultIndex
            };

            var response = await _httpClient.PostAsJsonAsync($"{_settings.FlightBaseUrl}/FareQuote", requestBody);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);
            
            var res = new FlightFareQuoteDto();
            res.ResponseJson = content;
            
            if (json.RootElement.GetProperty("Response").GetProperty("ResponseStatus").GetInt32() == 1)
            {
                res.IsAvailable = json.RootElement.GetProperty("Response").GetProperty("Results").GetProperty("IsPriceChanged").GetBoolean() == false;
                res.IsPriceChanged = json.RootElement.GetProperty("Response").GetProperty("Results").GetProperty("IsPriceChanged").GetBoolean();
                res.NewPrice = json.RootElement.GetProperty("Response").GetProperty("Results").GetProperty("Fare").GetProperty("PublishedFare").GetDecimal();
            }
            
            return res;
        }

        public async Task<FlightBookingResponseDto> BookFlightAsync(FlightBookingRequestDto request)
        {
            var token = await AuthenticateAsync();
            
            var requestBody = new
            {
                EndUserIp = "127.0.0.1",
                TokenId = token,
                TraceId = request.TraceId,
                ResultIndex = request.ResultIndex,
                Passengers = request.Passengers
            };

            var response = await _httpClient.PostAsJsonAsync($"{_settings.FlightBaseUrl}/Book", requestBody);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);
            
            var res = new FlightBookingResponseDto();
            res.ResponseJson = content;
            
            if (json.RootElement.GetProperty("Response").GetProperty("ResponseStatus").GetInt32() == 1)
            {
                res.Success = true;
                res.SrdvBookingId = json.RootElement.GetProperty("Response").GetProperty("Response").GetProperty("BookingId").GetString();
                res.Pnr = json.RootElement.GetProperty("Response").GetProperty("Response").GetProperty("PNR").GetString();
            }
            else
            {
                res.Success = false;
                res.ErrorMessage = json.RootElement.GetProperty("Response").GetProperty("Error").GetProperty("ErrorMessage").GetString();
            }
            
            return res;
        }

        public async Task<FlightTicketResponseDto> TicketFlightAsync(string pnr, string bookingId)
        {
            var token = await AuthenticateAsync();
            
            var requestBody = new
            {
                EndUserIp = "127.0.0.1",
                TokenId = token,
                TraceId = "", // Might need from context if required, but typically Ticket takes PNR/BookingId
                PNR = pnr,
                BookingId = bookingId
            };

            var response = await _httpClient.PostAsJsonAsync($"{_settings.FlightBaseUrl}/Ticket", requestBody);
            response.EnsureSuccessStatusCode();

            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);
            
            var res = new FlightTicketResponseDto();
            res.TicketResponseJson = content;
            
            if (json.RootElement.GetProperty("Response").GetProperty("ResponseStatus").GetInt32() == 1)
            {
                res.Success = true;
                res.Pnr = json.RootElement.GetProperty("Response").GetProperty("Response").GetProperty("PNR").GetString();
            }
            else
            {
                res.Success = false;
                res.ErrorMessage = json.RootElement.GetProperty("Response").GetProperty("Error").GetProperty("ErrorMessage").GetString();
            }
            
            return res;
        }
    }
}

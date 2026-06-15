using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading.Tasks;

namespace PickNBook.Api.Services
{
    public class AmadeusHotelService : IAmadeusHotelService
    {
        private readonly HttpClient _httpClient;
        private readonly AmadeusSettings _settings;
        private readonly IMemoryCache _cache;
        private readonly ILogger<AmadeusHotelService> _logger;

        private const string TokenCacheKey = "AmadeusHotelAccessTokenKey";

        public AmadeusHotelService(
            HttpClient httpClient,
            IOptions<AmadeusSettings> settings,
            IMemoryCache cache,
            ILogger<AmadeusHotelService> logger)
        {
            _httpClient = httpClient;
            _settings = settings.Value;
            _cache = cache;
            _logger = logger;
        }

        // =====================================
        // GET ACCESS TOKEN (With Caching)
        // =====================================
        private async Task<string> GetAccessTokenAsync()
        {
            if (_cache.TryGetValue(TokenCacheKey, out string? cachedToken) && !string.IsNullOrEmpty(cachedToken))
            {
                return cachedToken;
            }

            _logger.LogInformation("Amadeus token cache miss. Requesting new access token from Amadeus.");

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
            {
                _logger.LogError("Failed to get Amadeus access token. Status: {Status}", response.StatusCode);
                throw new Exception("Failed to authenticate with Amadeus provider.");
            }

            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);

            var accessToken = json.RootElement.GetProperty("access_token").GetString();
            var expiresIn = json.RootElement.GetProperty("expires_in").GetInt32();

            // Cache token slightly less than expiry to avoid edge cases
            var cacheEntryOptions = new MemoryCacheEntryOptions()
                .SetAbsoluteExpiration(TimeSpan.FromSeconds(expiresIn - 60));

            _cache.Set(TokenCacheKey, accessToken, cacheEntryOptions);

            return accessToken!;
        }

        // =====================================
        // STEP 1 & 2: HOTEL SEARCH FLOW
        // =====================================
        public async Task<List<HotelSearchResponseDto>> SearchHotelsAsync(
            string cityCode,
            DateTime checkInDate,
            DateTime checkOutDate,
            int adults,
            int rooms)
        {
            _logger.LogInformation("Starting Hotel search for city: {CityCode}, CheckIn: {CheckIn:yyyy-MM-dd}, CheckOut: {CheckOut:yyyy-MM-dd}, Adults: {Adults}, Rooms: {Rooms}",
                cityCode, checkInDate, checkOutDate, adults, rooms);

            // Step 1: Get Hotel IDs
            var hotelIds = await GetHotelIdsByCityAsync(cityCode);
            if (hotelIds == null || hotelIds.Count == 0)
            {
                _logger.LogWarning("No hotels found in city code: {CityCode}", cityCode);
                return new List<HotelSearchResponseDto>();
            }

            // Limit to 20 hotel IDs to prevent exceeding the Amadeus Multi-Hotel Shopping limit
            var limitedHotelIds = hotelIds.Take(20).ToList();

            // Step 2: Fetch Shopping Offers
            var token = await GetAccessTokenAsync();
            var hotelIdsCsv = string.Join(",", limitedHotelIds);
            var url = $"{_settings.BaseUrl}/v3/shopping/hotel-offers" +
                     $"?hotelIds={hotelIdsCsv}" +
                     $"&checkInDate={checkInDate:yyyy-MM-dd}" +
                     $"&checkOutDate={checkOutDate:yyyy-MM-dd}" +
                     $"&adults={adults}" +
                     $"&roomQuantity={rooms}" +
                     $"&currency=INR";

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Amadeus Shopping Offers API failed: Status {Status}, Response: {Error}", response.StatusCode, errorContent);
                throw new Exception("Amadeus hotel offers search service failed.");
            }

            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);
            var hotelOffers = new List<HotelSearchResponseDto>();

            if (!json.RootElement.TryGetProperty("data", out var dataEl) || dataEl.ValueKind != JsonValueKind.Array)
            {
                return hotelOffers;
            }

            foreach (var hotelEl in dataEl.EnumerateArray())
            {
                var hotelDto = new HotelSearchResponseDto();

                if (hotelEl.TryGetProperty("hotel", out var hotelInfoEl))
                {
                    hotelDto.HotelId = hotelInfoEl.TryGetProperty("hotelId", out var idEl) ? idEl.GetString() ?? "" : "";
                    hotelDto.Name = hotelInfoEl.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? "" : "";
                    hotelDto.CityCode = hotelInfoEl.TryGetProperty("cityCode", out var ccEl) ? ccEl.GetString() ?? "" : "";

                    if (hotelInfoEl.TryGetProperty("latitude", out var latEl) && latEl.ValueKind == JsonValueKind.Number)
                    {
                        hotelDto.Latitude = latEl.GetDouble();
                    }
                    if (hotelInfoEl.TryGetProperty("longitude", out var lonEl) && lonEl.ValueKind == JsonValueKind.Number)
                    {
                        hotelDto.Longitude = lonEl.GetDouble();
                    }

                    if (hotelInfoEl.TryGetProperty("address", out var addrEl))
                    {
                        var addressParts = new List<string>();
                        if (addrEl.TryGetProperty("lines", out var linesEl) && linesEl.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var line in linesEl.EnumerateArray())
                            {
                                addressParts.Add(line.GetString() ?? "");
                            }
                        }
                        if (addrEl.TryGetProperty("cityName", out var cityEl))
                        {
                            addressParts.Add(cityEl.GetString() ?? "");
                        }
                        if (addrEl.TryGetProperty("countryCode", out var countryEl))
                        {
                            addressParts.Add(countryEl.GetString() ?? "");
                        }
                        hotelDto.Address = string.Join(", ", addressParts.Where(s => !string.IsNullOrWhiteSpace(s)));
                    }
                }

                if (hotelEl.TryGetProperty("offers", out var offersEl) && offersEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var offerEl in offersEl.EnumerateArray())
                    {
                        var offerDto = MapOfferJson(offerEl, hotelDto);
                        hotelDto.Offers.Add(offerDto);
                    }
                }

                if (hotelDto.Offers.Count > 0)
                {
                    hotelOffers.Add(hotelDto);
                }
            }

            return hotelOffers;
        }

        private async Task<List<string>> GetHotelIdsByCityAsync(string cityCode)
        {
            var token = await GetAccessTokenAsync();
            var url = $"{_settings.BaseUrl}/v1/reference-data/locations/hotels/by-city?cityCode={cityCode}";

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Amadeus reference-data by-city API failed: Status {Status}, Response: {Error}", response.StatusCode, errorContent);
                throw new Exception("Amadeus reference-data location service failed.");
            }

            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);
            var hotelIds = new List<string>();

            if (json.RootElement.TryGetProperty("data", out var dataEl) && dataEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var hotelEl in dataEl.EnumerateArray())
                {
                    if (hotelEl.TryGetProperty("hotelId", out var idEl))
                    {
                        var idVal = idEl.GetString();
                        if (!string.IsNullOrEmpty(idVal))
                        {
                            hotelIds.Add(idVal);
                        }
                    }
                }
            }

            return hotelIds;
        }

        // =====================================
        // REVALIDATE AND GET DETAILS BY OFFER ID
        // =====================================
        public async Task<HotelOfferDto?> GetOfferDetailsAsync(string offerId)
        {
            _logger.LogInformation("Revalidating offer details for OfferId: {OfferId}", offerId);
            var token = await GetAccessTokenAsync();
            var url = $"{_settings.BaseUrl}/v3/shopping/hotel-offers/{offerId}";

            var request = new HttpRequestMessage(HttpMethod.Get, url);
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    _logger.LogWarning("Offer not found: {OfferId}", offerId);
                    return null;
                }
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Amadeus Single Offer API failed: Status {Status}, Response: {Error}", response.StatusCode, errorContent);
                throw new Exception("Amadeus revalidation service failed.");
            }

            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);

            if (!json.RootElement.TryGetProperty("data", out var dataEl))
            {
                return null;
            }

            JsonElement hotelEl = default;
            JsonElement offersEl = default;

            if (dataEl.ValueKind == JsonValueKind.Object)
            {
                if (dataEl.TryGetProperty("hotel", out var hEl)) hotelEl = hEl;
                if (dataEl.TryGetProperty("offers", out var oEl)) offersEl = oEl;
            }
            else if (dataEl.ValueKind == JsonValueKind.Array && dataEl.GetArrayLength() > 0)
            {
                var firstEl = dataEl[0];
                if (firstEl.TryGetProperty("hotel", out var hEl)) hotelEl = hEl;
                if (firstEl.TryGetProperty("offers", out var oEl)) offersEl = oEl;
            }

            if (offersEl.ValueKind != JsonValueKind.Array || offersEl.GetArrayLength() == 0)
            {
                return null;
            }

            var hotelDto = new HotelSearchResponseDto();
            if (hotelEl.ValueKind == JsonValueKind.Object)
            {
                hotelDto.HotelId = hotelEl.TryGetProperty("hotelId", out var idEl) ? idEl.GetString() ?? "" : "";
                hotelDto.Name = hotelEl.TryGetProperty("name", out var nameEl) ? nameEl.GetString() ?? "" : "";
                hotelDto.CityCode = hotelEl.TryGetProperty("cityCode", out var ccEl) ? ccEl.GetString() ?? "" : "";

                if (hotelEl.TryGetProperty("latitude", out var latEl) && latEl.ValueKind == JsonValueKind.Number)
                {
                    hotelDto.Latitude = latEl.GetDouble();
                }
                if (hotelEl.TryGetProperty("longitude", out var lonEl) && lonEl.ValueKind == JsonValueKind.Number)
                {
                    hotelDto.Longitude = lonEl.GetDouble();
                }

                if (hotelEl.TryGetProperty("address", out var addrEl))
                {
                    var addressParts = new List<string>();
                    if (addrEl.TryGetProperty("lines", out var linesEl) && linesEl.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var line in linesEl.EnumerateArray())
                        {
                            addressParts.Add(line.GetString() ?? "");
                        }
                    }
                    if (addrEl.TryGetProperty("cityName", out var cityEl))
                    {
                        addressParts.Add(cityEl.GetString() ?? "");
                    }
                    if (addrEl.TryGetProperty("countryCode", out var countryEl))
                    {
                        addressParts.Add(countryEl.GetString() ?? "");
                    }
                    hotelDto.Address = string.Join(", ", addressParts.Where(s => !string.IsNullOrWhiteSpace(s)));
                }
            }

            foreach (var offerEl in offersEl.EnumerateArray())
            {
                var currentOfferId = offerEl.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;
                if (currentOfferId == offerId)
                {
                    return MapOfferJson(offerEl, hotelDto);
                }
            }

            if (offersEl.GetArrayLength() > 0)
            {
                return MapOfferJson(offersEl[0], hotelDto);
            }

            return null;
        }

        // =====================================
        // BOOK HOTEL AT AMADEUS
        // =====================================
        public async Task<HotelBookingResponseDto> BookHotelAsync(
            string offerId,
            string guestName,
            string guestEmail,
            string guestPhone,
            string userId)
        {
            _logger.LogInformation("Sending booking request to Amadeus v2 for OfferId: {OfferId}", offerId);
            var token = await GetAccessTokenAsync();
            var url = $"{_settings.BaseUrl}/v2/booking/hotel-orders";

            var nameParts = guestName.Trim().Split(' ', 2);
            var firstName = nameParts[0];
            var lastName = nameParts.Length > 1 ? nameParts[1] : "Guest";

            var normalizedPhone = guestPhone.Trim();
            if (!normalizedPhone.StartsWith("+"))
            {
                if (normalizedPhone.Length == 10 && normalizedPhone.All(char.IsDigit))
                {
                    normalizedPhone = "+91" + normalizedPhone;
                }
                else
                {
                    normalizedPhone = "+" + normalizedPhone;
                }
            }

            var bookingPayload = new
            {
                data = new
                {
                    type = "hotel-order",
                    guests = new[]
                    {
                        new
                        {
                            tid = 1,
                            title = "MR",
                            firstName = firstName.ToUpperInvariant(),
                            lastName = lastName.ToUpperInvariant(),
                            contact = new
                            {
                                phone = normalizedPhone,
                                email = guestEmail
                            }
                        }
                    },
                    travelAgent = new
                    {
                        contact = new
                        {
                            email = "agent@example.com"
                        }
                    },
                    roomAssociations = new[]
                    {
                        new
                        {
                            hotelOfferId = offerId,
                            guestReferences = new[]
                            {
                                new
                                {
                                    guestReference = "1"
                                }
                            }
                        }
                    },
                    payment = new
                    {
                        method = "CREDIT_CARD",
                        paymentCard = new
                        {
                            paymentCardInfo = new
                            {
                                vendorCode = "VI",
                                cardNumber = "4111111111111111",
                                expiryDate = "2026-12",
                                holderName = (firstName + " " + lastName).ToUpperInvariant()
                            }
                        }
                    }
                }
            };

            var payloadStr = JsonSerializer.Serialize(bookingPayload);
            var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(payloadStr, System.Text.Encoding.UTF8, "application/json")
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Amadeus Hotel Booking API v2 failed. Status: {Status}, Response: {Response}", response.StatusCode, errorContent);
                
                string errorMsg = "Amadeus booking provider rejected the booking details or the offer has expired.";
                try
                {
                    using var doc = JsonDocument.Parse(errorContent);
                    if (doc.RootElement.TryGetProperty("errors", out var errorsEl) && errorsEl.ValueKind == JsonValueKind.Array && errorsEl.GetArrayLength() > 0)
                    {
                        var firstErr = errorsEl[0];
                        if (firstErr.TryGetProperty("detail", out var detailEl))
                        {
                            var detailStr = detailEl.GetString();
                            if (!string.IsNullOrEmpty(detailStr))
                            {
                                errorMsg = $"{errorMsg} (Provider Detail: {detailStr})";
                            }
                        }
                    }
                }
                catch { }

                throw new Exception(errorMsg);
            }

            var content = await response.Content.ReadAsStringAsync();
            var json = JsonDocument.Parse(content);
            var bookingResponse = new HotelBookingResponseDto();

            if (json.RootElement.TryGetProperty("data", out var dataEl))
            {
                if (dataEl.ValueKind == JsonValueKind.Object)
                {
                    bookingResponse.ProviderBookingId = dataEl.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;

                    if (string.IsNullOrEmpty(bookingResponse.ProviderBookingId) && dataEl.TryGetProperty("associatedRecords", out var recordsEl) && recordsEl.ValueKind == JsonValueKind.Array && recordsEl.GetArrayLength() > 0)
                    {
                        bookingResponse.ProviderBookingId = recordsEl[0].TryGetProperty("reference", out var refEl) ? refEl.GetString() : null;
                    }
                }
                else if (dataEl.ValueKind == JsonValueKind.Array && dataEl.GetArrayLength() > 0)
                {
                    var bookingData = dataEl[0];
                    bookingResponse.ProviderBookingId = bookingData.TryGetProperty("id", out var idEl) ? idEl.GetString() : null;

                    if (string.IsNullOrEmpty(bookingResponse.ProviderBookingId) && bookingData.TryGetProperty("associatedRecords", out var recordsEl) && recordsEl.ValueKind == JsonValueKind.Array && recordsEl.GetArrayLength() > 0)
                    {
                        bookingResponse.ProviderBookingId = recordsEl[0].TryGetProperty("reference", out var refEl) ? refEl.GetString() : null;
                    }
                }
            }

            if (string.IsNullOrEmpty(bookingResponse.ProviderBookingId))
            {
                bookingResponse.ProviderBookingId = Guid.NewGuid().ToString("N").Substring(0, 10).ToUpper();
            }

            return bookingResponse;
        }

        // =====================================
        // CANCEL HOTEL BOOKING
        // =====================================
        public async Task<bool> CancelBookingAsync(string providerBookingId)
        {
            _logger.LogInformation("Sending hotel cancellation request to Amadeus for BookingId: {BookingId}", providerBookingId);
            try
            {
                var token = await GetAccessTokenAsync();
                var url = $"{_settings.BaseUrl}/v1/booking/hotel-bookings/{providerBookingId}";

                var request = new HttpRequestMessage(HttpMethod.Delete, url);
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);

                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Amadeus successfully cancelled hotel booking {BookingId}", providerBookingId);
                    return true;
                }

                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Amadeus cancellation returned status {Status}. Response: {Response}", response.StatusCode, error);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception thrown while trying to cancel booking {BookingId} at Amadeus", providerBookingId);
                return false;
            }
        }

        // =====================================
        // PARSER HELPER METHOD
        // =====================================
        private HotelOfferDto MapOfferJson(JsonElement offerEl, HotelSearchResponseDto hotelDto)
        {
            var offerDto = new HotelOfferDto
            {
                HotelId = hotelDto.HotelId,
                HotelName = hotelDto.Name,
                CityCode = hotelDto.CityCode,
                Latitude = hotelDto.Latitude,
                Longitude = hotelDto.Longitude,
                Address = hotelDto.Address,
                OfferId = offerEl.TryGetProperty("id", out var idEl) ? idEl.GetString() ?? "" : "",
                CheckInDate = offerEl.TryGetProperty("checkInDate", out var cidEl) && DateTime.TryParse(cidEl.GetString(), out var cid) ? cid : DateTime.MinValue,
                CheckOutDate = offerEl.TryGetProperty("checkOutDate", out var codEl) && DateTime.TryParse(codEl.GetString(), out var cod) ? cod : DateTime.MinValue,
                RoomQuantity = offerEl.TryGetProperty("roomQuantity", out var rqEl) && rqEl.ValueKind == JsonValueKind.Number ? rqEl.GetInt32() : 1
            };

            if (offerEl.TryGetProperty("room", out var roomEl))
            {
                if (roomEl.TryGetProperty("typeEstimated", out var typeEstEl))
                {
                    offerDto.RoomCategory = typeEstEl.TryGetProperty("category", out var catEl) ? catEl.GetString() ?? "" : "";
                    offerDto.BedType = typeEstEl.TryGetProperty("bedType", out var btEl) ? btEl.GetString() ?? "" : "";
                    offerDto.Beds = typeEstEl.TryGetProperty("beds", out var bedsEl) && bedsEl.ValueKind == JsonValueKind.Number ? bedsEl.GetInt32() : 0;
                }
                if (roomEl.TryGetProperty("description", out var descEl))
                {
                    offerDto.RoomDescription = descEl.TryGetProperty("text", out var textEl) ? textEl.GetString() ?? "" : "";
                }
            }

            if (offerEl.TryGetProperty("price", out var priceEl))
            {
                offerDto.Currency = priceEl.TryGetProperty("currency", out var currEl) ? currEl.GetString() ?? "INR" : "INR";
                if (priceEl.TryGetProperty("total", out var totalEl) && decimal.TryParse(totalEl.GetString(), NumberStyles.Any, CultureInfo.InvariantCulture, out var totalVal))
                {
                    offerDto.Price = totalVal;
                }
            }

            if (offerEl.TryGetProperty("policies", out var policiesEl))
            {
                offerDto.PaymentType = policiesEl.TryGetProperty("paymentType", out var ptEl) ? ptEl.GetString() ?? "" : "";

                if (policiesEl.TryGetProperty("checkInOut", out var checkInOutEl))
                {
                    offerDto.CheckInTime = checkInOutEl.TryGetProperty("checkInTime", out var citEl) ? citEl.GetString() ?? "" : "";
                    offerDto.CheckOutTime = checkInOutEl.TryGetProperty("checkOutTime", out var cotEl) ? cotEl.GetString() ?? "" : "";
                }

                if (policiesEl.TryGetProperty("cancellations", out var cancelsEl) && cancelsEl.ValueKind == JsonValueKind.Array && cancelsEl.GetArrayLength() > 0)
                {
                    var cancelEl = cancelsEl[0];
                    if (cancelEl.TryGetProperty("deadline", out var dlEl) && DateTime.TryParse(dlEl.GetString(), out var dl))
                    {
                        offerDto.CancellationDeadline = dl;
                    }
                    if (cancelEl.TryGetProperty("description", out var cDescEl))
                    {
                        offerDto.CancellationPolicy = cDescEl.TryGetProperty("text", out var ctEl) ? ctEl.GetString() ?? "" : "";
                    }
                }
            }

            return offerDto;
        }
    }
}

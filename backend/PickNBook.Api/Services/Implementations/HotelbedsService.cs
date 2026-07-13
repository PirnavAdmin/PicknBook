using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

namespace PickNBook.Api.Services
{
    public class HotelbedsService : IHotelService
    {
        private readonly HttpClient _httpClient;
        private readonly HotelbedsSettings _settings;
        private readonly AppDbContext _dbContext;
        private readonly ILogger<HotelbedsService> _logger;

        public HotelbedsService(
            HttpClient httpClient,
            IOptions<HotelbedsSettings> settings,
            AppDbContext dbContext,
            ILogger<HotelbedsService> logger)
        {
            _httpClient = httpClient;
            _settings = settings.Value;
            _dbContext = dbContext;
            _logger = logger;
        }

        // =====================================
        // SIGNATURE GENERATOR (Api-key + Secret + Timestamp)
        // =====================================
        private string GenerateSignature()
        {
            var apiKey = _settings.ApiKey;
            var secret = _settings.Secret;
            var timestamp = DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString();
            var signatureInput = apiKey + secret + timestamp;

            using var sha256 = SHA256.Create();
            var bytes = Encoding.UTF8.GetBytes(signatureInput);
            var hash = sha256.ComputeHash(bytes);

            var sb = new StringBuilder();
            foreach (var b in hash)
            {
                sb.Append(b.ToString("x2"));
            }
            return sb.ToString();
        }

        private void AddRequiredHeaders(HttpRequestMessage request)
        {
            request.Headers.Add("Api-key", _settings.ApiKey);
            request.Headers.Add("X-Signature", GenerateSignature());
            request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        }

        private async Task<HotelPricingSetting> GetActivePricingSettingAsync()
        {
            var setting = await _dbContext.HotelPricingSettings
                .FirstOrDefaultAsync(s => s.IsActive);

            if (setting == null)
            {
                // Fallback to default values
                return new HotelPricingSetting
                {
                    MarkupType = "Percentage",
                    MarkupValue = 10.00m,
                    ConvenienceFeeType = "Flat",
                    ConvenienceFeeValue = 250.00m,
                    GstPercent = 18.00m
                };
            }
            return setting;
        }

        private decimal ApplyMarkup(decimal netRate, HotelPricingSetting setting)
        {
            decimal markupAmount = 0m;
            if (setting.MarkupType == "Percentage")
            {
                markupAmount = netRate * (setting.MarkupValue / 100m);
            }
            else if (setting.MarkupType == "Flat")
            {
                markupAmount = setting.MarkupValue;
            }
            return decimal.Round(netRate + markupAmount, 2, MidpointRounding.AwayFromZero);
        }

        // =====================================
        // HOTEL AVAILABILITY SEARCH
        // =====================================
        public async Task<List<HotelSearchResponseDto>> SearchHotelsAsync(
            string cityCode,
            DateTime checkInDate,
            DateTime checkOutDate,
            int adults,
            int rooms)
        {
            var pricingSetting = await GetActivePricingSettingAsync();

            _logger.LogInformation("Starting Hotelbeds search for city: {CityCode}, CheckIn: {CheckIn:yyyy-MM-dd}, CheckOut: {CheckOut:yyyy-MM-dd}, Adults: {Adults}, Rooms: {Rooms}",
                cityCode, checkInDate, checkOutDate, adults, rooms);

            var url = $"{_settings.BaseUrl}/hotel-api/1.0/hotels";
            var requestBody = new
            {
                stay = new
                {
                    checkIn = checkInDate.ToString("yyyy-MM-dd"),
                    checkOut = checkOutDate.ToString("yyyy-MM-dd")
                },
                occupancies = new[]
                {
                    new
                    {
                        rooms = rooms,
                        adults = adults,
                        children = 0
                    }
                },
                destination = new
                {
                    code = cityCode.ToUpperInvariant()
                }
            };

            var payloadStr = JsonSerializer.Serialize(requestBody);
            var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(payloadStr, Encoding.UTF8, "application/json")
            };
            AddRequiredHeaders(request);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Hotelbeds Availability search failed: Status {Status}, Response: {Error}", response.StatusCode, errorContent);
                throw new Exception($"Hotelbeds search provider failed. Status: {response.StatusCode}");
            }

            var content = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);
            var hotelsList = new List<HotelSearchResponseDto>();

            if (!doc.RootElement.TryGetProperty("hotels", out var hotelsContainer) ||
                !hotelsContainer.TryGetProperty("hotels", out var hotelsArray) ||
                hotelsArray.ValueKind != JsonValueKind.Array)
            {
                return hotelsList;
            }

            foreach (var hotelEl in hotelsArray.EnumerateArray())
            {
                var hotelDto = new HotelSearchResponseDto
                {
                    HotelId = hotelEl.TryGetProperty("code", out var codeProp) ? codeProp.GetInt32().ToString() : string.Empty,
                    Name = hotelEl.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? string.Empty : string.Empty,
                    CityCode = hotelEl.TryGetProperty("destinationCode", out var dcProp) ? dcProp.GetString() ?? cityCode : cityCode,
                    Address = hotelEl.TryGetProperty("address", out var addrProp) ? addrProp.GetString() ?? string.Empty : string.Empty
                };

                double rating = 4.0;
                if (hotelEl.TryGetProperty("categoryName", out var catEl) && catEl.ValueKind == JsonValueKind.String)
                {
                    var catStr = catEl.GetString();
                    if (!string.IsNullOrEmpty(catStr))
                    {
                        var digits = new string(catStr.TakeWhile(c => char.IsDigit(c) || c == '.').ToArray());
                        if (double.TryParse(digits, out var parsedRating))
                        {
                            rating = parsedRating;
                        }
                        else
                        {
                            if (catStr.Contains("5")) rating = 5.0;
                            else if (catStr.Contains("4")) rating = 4.0;
                            else if (catStr.Contains("3")) rating = 3.0;
                            else if (catStr.Contains("2")) rating = 2.0;
                            else if (catStr.Contains("1")) rating = 1.0;
                        }
                    }
                }
                if (rating == 4.0)
                {
                    int idVal = int.TryParse(hotelDto.HotelId, out var id) ? id : hotelDto.HotelId.GetHashCode();
                    rating = 3.5 + Math.Round((double)(Math.Abs(idVal) % 16) / 10.0, 1);
                    if (rating > 5.0) rating = 5.0;
                }
                hotelDto.Rating = rating;

                if (hotelEl.TryGetProperty("latitude", out var latEl))
                {
                    if (latEl.ValueKind == JsonValueKind.Number) hotelDto.Latitude = latEl.GetDouble();
                    else if (latEl.ValueKind == JsonValueKind.String && double.TryParse(latEl.GetString(), out var latVal)) hotelDto.Latitude = latVal;
                }

                if (hotelEl.TryGetProperty("longitude", out var lonEl))
                {
                    if (lonEl.ValueKind == JsonValueKind.Number) hotelDto.Longitude = lonEl.GetDouble();
                    else if (lonEl.ValueKind == JsonValueKind.String && double.TryParse(lonEl.GetString(), out var lonVal)) hotelDto.Longitude = lonVal;
                }

                if (hotelEl.TryGetProperty("rooms", out var roomsEl) && roomsEl.ValueKind == JsonValueKind.Array)
                {
                    foreach (var roomEl in roomsEl.EnumerateArray())
                    {
                        var roomName = roomEl.TryGetProperty("name", out var rnProp) ? rnProp.GetString() ?? string.Empty : string.Empty;

                        if (roomEl.TryGetProperty("rates", out var ratesEl) && ratesEl.ValueKind == JsonValueKind.Array)
                        {
                            foreach (var rateEl in ratesEl.EnumerateArray())
                            {
                                var offerDto = new HotelOfferDto
                                {
                                    OfferId = rateEl.TryGetProperty("rateKey", out var rkProp) ? rkProp.GetString() ?? string.Empty : string.Empty,
                                    HotelId = hotelDto.HotelId,
                                    HotelName = hotelDto.Name,
                                    CityCode = hotelDto.CityCode,
                                    Latitude = hotelDto.Latitude,
                                    Longitude = hotelDto.Longitude,
                                    Address = hotelDto.Address,
                                    CheckInDate = checkInDate.ToString("yyyy-MM-dd"),
                                    CheckOutDate = checkOutDate.ToString("yyyy-MM-dd"),
                                    RoomQuantity = rooms,
                                    RoomCategory = roomName,
                                    RoomDescription = roomName,
                                    BedType = roomName,
                                    Beds = adults,
                                    Currency = "INR",
                                    PaymentType = rateEl.TryGetProperty("paymentType", out var ptProp) ? ptProp.GetString() ?? string.Empty : string.Empty
                                };

                                if (rateEl.TryGetProperty("net", out var netEl))
                                {
                                    decimal netPrice = 0m;
                                    if (netEl.ValueKind == JsonValueKind.Number) netPrice = netEl.GetDecimal();
                                    else if (netEl.ValueKind == JsonValueKind.String && decimal.TryParse(netEl.GetString(), out var netVal)) netPrice = netVal;

                                    offerDto.Price = ApplyMarkup(netPrice, pricingSetting);
                                }

                                if (rateEl.TryGetProperty("cancellationPolicies", out var cpEl) && cpEl.ValueKind == JsonValueKind.Array && cpEl.GetArrayLength() > 0)
                                {
                                    var firstPolicy = cpEl[0];
                                    if (firstPolicy.TryGetProperty("from", out var fromEl) && DateTime.TryParse(fromEl.GetString(), out var fromDate))
                                    {
                                        offerDto.CancellationDeadline = fromDate;
                                    }
                                    if (firstPolicy.TryGetProperty("amount", out var amtEl))
                                    {
                                        var amt = amtEl.ValueKind == JsonValueKind.Number ? amtEl.GetDecimal().ToString() : amtEl.GetString();
                                        offerDto.CancellationPolicy = $"Cancellation fee of {amt} applies starting from {offerDto.CancellationDeadline:dd MMM yyyy}.";
                                    }
                                }

                                hotelDto.Offers.Add(offerDto);
                            }
                        }
                    }
                }

                if (hotelDto.Offers.Count > 0)
                {
                    hotelsList.Add(hotelDto);
                }
            }

            // Fetch and map hotel images from Content API
            var hotelIds = hotelsList.Select(h => h.HotelId).Where(id => !string.IsNullOrEmpty(id)).Distinct().ToList();
            if (hotelIds.Count > 0)
            {
                try
                {
                    var codesParam = string.Join(",", hotelIds);
                    var contentUrl = $"{_settings.BaseUrl}/hotel-content-api/1.0/hotels?codes={codesParam}&fields=images,facilities&language=ENG";

                    var contentRequest = new HttpRequestMessage(HttpMethod.Get, contentUrl);
                    AddRequiredHeaders(contentRequest);

                    var contentResponse = await _httpClient.SendAsync(contentRequest);
                    if (contentResponse.IsSuccessStatusCode)
                    {
                        var contentStr = await contentResponse.Content.ReadAsStringAsync();
                        using var contentDoc = JsonDocument.Parse(contentStr);
                        if (contentDoc.RootElement.TryGetProperty("hotels", out var contentHotelsArray) && contentHotelsArray.ValueKind == JsonValueKind.Array)
                        {
                            var imagesMap = new Dictionary<string, List<string>>();
                            var amenitiesMap = new Dictionary<string, List<string>>();
                            foreach (var chEl in contentHotelsArray.EnumerateArray())
                            {
                                var hId = chEl.TryGetProperty("code", out var codeProp) ? codeProp.GetInt32().ToString() : string.Empty;
                                if (string.IsNullOrEmpty(hId)) continue;

                                var imgUrls = new List<string>();
                                if (chEl.TryGetProperty("images", out var imagesArr) && imagesArr.ValueKind == JsonValueKind.Array)
                                {
                                    foreach (var imgEl in imagesArr.EnumerateArray())
                                    {
                                        if (imgEl.TryGetProperty("path", out var pathProp))
                                        {
                                            var path = pathProp.GetString();
                                            if (!string.IsNullOrEmpty(path))
                                            {
                                                imgUrls.Add($"https://photos.hotelbeds.com/giata/bigger/{path}");
                                            }
                                        }
                                    }
                                }
                                imagesMap[hId] = imgUrls;

                                var amenitiesList = new List<string>();
                                if (chEl.TryGetProperty("facilities", out var facilitiesArr) && facilitiesArr.ValueKind == JsonValueKind.Array)
                                {
                                    foreach (var facEl in facilitiesArr.EnumerateArray())
                                    {
                                        var hasFacility = !facEl.TryGetProperty("indYesOrNo", out var yesNoProp) || yesNoProp.GetBoolean();
                                        if (hasFacility && facEl.TryGetProperty("description", out var descProp))
                                        {
                                            var amenityName = descProp.ValueKind == JsonValueKind.Object && descProp.TryGetProperty("content", out var contentProp)
                                                ? contentProp.GetString()
                                                : descProp.GetString();

                                            if (!string.IsNullOrEmpty(amenityName) && !amenitiesList.Contains(amenityName))
                                            {
                                                amenitiesList.Add(amenityName);
                                            }
                                        }
                                    }
                                }
                                amenitiesMap[hId] = amenitiesList;
                            }

                            foreach (var hotel in hotelsList)
                            {
                                if (imagesMap.TryGetValue(hotel.HotelId, out var imgs))
                                {
                                    hotel.Images = imgs;
                                }
                                if (amenitiesMap.TryGetValue(hotel.HotelId, out var amenities))
                                {
                                    hotel.Amenities = amenities;
                                }
                            }
                        }
                    }
                    else
                    {
                        var errStr = await contentResponse.Content.ReadAsStringAsync();
                        _logger.LogWarning("Hotelbeds Content API returned non-success code {Status}. Detail: {Error}", contentResponse.StatusCode, errStr);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to retrieve hotel images from Content API");
                }
            }

            return hotelsList;
        }

        // =====================================
        // REVALIDATE AND GET DETAILS BY OFFER ID
        // =====================================
        public async Task<HotelOfferDto?> GetOfferDetailsAsync(string offerId)
        {
            var pricingSetting = await GetActivePricingSettingAsync();
            _logger.LogInformation("Revalidating details for OfferId/RateKey: {OfferId}", offerId);

            var url = $"{_settings.BaseUrl}/hotel-api/1.0/checkrates";
            var requestBody = new
            {
                rooms = new[]
                {
                    new
                    {
                        rateKey = offerId
                    }
                }
            };

            var payloadStr = JsonSerializer.Serialize(requestBody);
            var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(payloadStr, Encoding.UTF8, "application/json")
            };
            AddRequiredHeaders(request);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                {
                    _logger.LogWarning("Offer / RateKey not found: {OfferId}", offerId);
                    return null;
                }
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Hotelbeds Checkrates failed: Status {Status}, Response: {Error}", response.StatusCode, errorContent);
                throw new Exception("Hotelbeds Checkrates service failed.");
            }

            var content = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);
            if (!doc.RootElement.TryGetProperty("hotel", out var hotelEl))
            {
                return null;
            }

            var hotelName = hotelEl.TryGetProperty("name", out var nameProp) ? nameProp.GetString() ?? string.Empty : string.Empty;
            var hotelId = hotelEl.TryGetProperty("code", out var codeProp) ? codeProp.GetInt32().ToString() : string.Empty;
            var destinationCode = hotelEl.TryGetProperty("destinationCode", out var dcProp) ? dcProp.GetString() ?? string.Empty : string.Empty;
            var address = hotelEl.TryGetProperty("address", out var addrProp) ? addrProp.GetString() ?? string.Empty : string.Empty;

            double? latitude = null;
            if (hotelEl.TryGetProperty("latitude", out var latEl))
            {
                if (latEl.ValueKind == JsonValueKind.Number) latitude = latEl.GetDouble();
                else if (latEl.ValueKind == JsonValueKind.String && double.TryParse(latEl.GetString(), out var latVal)) latitude = latVal;
            }

            double? longitude = null;
            if (hotelEl.TryGetProperty("longitude", out var lonEl))
            {
                if (lonEl.ValueKind == JsonValueKind.Number) longitude = lonEl.GetDouble();
                else if (lonEl.ValueKind == JsonValueKind.String && double.TryParse(lonEl.GetString(), out var lonVal)) longitude = lonVal;
            }

            DateTime checkInDate = DateTime.MinValue;
            if (hotelEl.TryGetProperty("checkIn", out var ciEl) && DateTime.TryParse(ciEl.GetString(), out var ciDate))
            {
                checkInDate = ciDate;
            }

            DateTime checkOutDate = DateTime.MinValue;
            if (hotelEl.TryGetProperty("checkOut", out var coEl) && DateTime.TryParse(coEl.GetString(), out var coDate))
            {
                checkOutDate = coDate;
            }

            if (hotelEl.TryGetProperty("rooms", out var roomsEl) && roomsEl.ValueKind == JsonValueKind.Array)
            {
                foreach (var roomEl in roomsEl.EnumerateArray())
                {
                    var roomName = roomEl.TryGetProperty("name", out var rnProp) ? rnProp.GetString() ?? string.Empty : string.Empty;

                    if (roomEl.TryGetProperty("rates", out var ratesEl) && ratesEl.ValueKind == JsonValueKind.Array)
                    {
                        foreach (var rateEl in ratesEl.EnumerateArray())
                        {
                            var currentRateKey = rateEl.TryGetProperty("rateKey", out var rkProp) ? rkProp.GetString() : null;
                            if (currentRateKey == offerId || string.IsNullOrEmpty(currentRateKey))
                            {
                                var offerDto = new HotelOfferDto
                                {
                                    OfferId = currentRateKey ?? offerId,
                                    HotelId = hotelId,
                                    HotelName = hotelName,
                                    CityCode = destinationCode,
                                    Latitude = latitude,
                                    Longitude = longitude,
                                    Address = address,
                                    CheckInDate = checkInDate.ToString("yyyy-MM-dd"),
                                    CheckOutDate = checkOutDate.ToString("yyyy-MM-dd"),
                                    RoomQuantity = rateEl.TryGetProperty("allotment", out var allotProp) && allotProp.ValueKind == JsonValueKind.Number ? allotProp.GetInt32() : 1,
                                    RoomCategory = roomName,
                                    RoomDescription = roomName,
                                    BedType = roomName,
                                    Beds = 1,
                                    Currency = "INR",
                                    PaymentType = rateEl.TryGetProperty("paymentType", out var ptProp) ? ptProp.GetString() ?? string.Empty : string.Empty
                                };

                                if (rateEl.TryGetProperty("net", out var netEl))
                                {
                                    decimal netPrice = 0m;
                                    if (netEl.ValueKind == JsonValueKind.Number) netPrice = netEl.GetDecimal();
                                    else if (netEl.ValueKind == JsonValueKind.String && decimal.TryParse(netEl.GetString(), out var netVal)) netPrice = netVal;

                                    offerDto.Price = ApplyMarkup(netPrice, pricingSetting);
                                }

                                if (rateEl.TryGetProperty("cancellationPolicies", out var cpEl) && cpEl.ValueKind == JsonValueKind.Array && cpEl.GetArrayLength() > 0)
                                {
                                    var firstPolicy = cpEl[0];
                                    if (firstPolicy.TryGetProperty("from", out var fromEl) && DateTime.TryParse(fromEl.GetString(), out var fromDate))
                                    {
                                        offerDto.CancellationDeadline = fromDate;
                                    }
                                    if (firstPolicy.TryGetProperty("amount", out var amtEl))
                                    {
                                        var amt = amtEl.ValueKind == JsonValueKind.Number ? amtEl.GetDecimal().ToString() : amtEl.GetString();
                                        offerDto.CancellationPolicy = $"Cancellation fee of {amt} applies starting from {offerDto.CancellationDeadline:dd MMM yyyy}.";
                                    }
                                }

                                return offerDto;
                            }
                        }
                    }
                }
            }

            return null;
        }

        // =====================================
        // BOOK HOTEL AT HOTELBEDS
        // =====================================
        public async Task<HotelBookingResponseDto> BookHotelAsync(
            string offerId,
            string guestName,
            string guestEmail,
            string guestPhone,
            string userId)
        {
            _logger.LogInformation("Sending booking request to Hotelbeds for OfferId/RateKey: {OfferId}", offerId);

            var url = $"{_settings.BaseUrl}/hotel-api/1.0/bookings";
            var nameParts = guestName.Trim().Split(' ', 2);
            var firstName = nameParts[0];
            var lastName = nameParts.Length > 1 ? nameParts[1] : "Guest";

            var clientRef = $"HB-{DateTimeOffset.UtcNow.ToUnixTimeSeconds()}-{Random.Shared.Next(10, 100)}";
            var bookingPayload = new
            {
                clientReference = clientRef,
                holder = new
                {
                    name = firstName,
                    surname = lastName
                },
                rooms = new[]
                {
                    new
                    {
                        rateKey = offerId,
                        paxes = new[]
                        {
                            new
                            {
                                roomId = 1,
                                type = "AD",
                                name = firstName,
                                surname = lastName
                            }
                        }
                    }
                }
            };

            var payloadStr = JsonSerializer.Serialize(bookingPayload);
            var request = new HttpRequestMessage(HttpMethod.Post, url)
            {
                Content = new StringContent(payloadStr, Encoding.UTF8, "application/json")
            };
            AddRequiredHeaders(request);

            var response = await _httpClient.SendAsync(request);
            if (!response.IsSuccessStatusCode)
            {
                var errorContent = await response.Content.ReadAsStringAsync();
                _logger.LogError("Hotelbeds Booking API failed. Status: {Status}, Response: {Response}", response.StatusCode, errorContent);
                throw new Exception($"Hotelbeds booking provider rejected the booking details. Details: {errorContent}");
            }

            var content = await response.Content.ReadAsStringAsync();
            using var doc = JsonDocument.Parse(content);
            if (!doc.RootElement.TryGetProperty("booking", out var bookingEl))
            {
                throw new Exception("Hotelbeds booking response was missing critical booking node.");
            }

            var providerBookingId = bookingEl.TryGetProperty("reference", out var refEl) ? refEl.GetString() : string.Empty;
            var status = bookingEl.TryGetProperty("status", out var statusEl) ? statusEl.GetString() : "Booked";

            decimal price = 0;
            if (bookingEl.TryGetProperty("totalAmount", out var totalEl))
            {
                if (totalEl.ValueKind == JsonValueKind.Number) price = totalEl.GetDecimal();
                else if (totalEl.ValueKind == JsonValueKind.String && decimal.TryParse(totalEl.GetString(), out var totalVal)) price = totalVal;
            }

            var currency = bookingEl.TryGetProperty("currency", out var currEl) ? currEl.GetString() ?? "INR" : "INR";

            if (string.IsNullOrEmpty(providerBookingId))
            {
                providerBookingId = Guid.NewGuid().ToString("N").Substring(0, 10).ToUpper();
            }

            return new HotelBookingResponseDto
            {
                ProviderBookingId = providerBookingId,
                Status = status == "CONFIRMED" ? "Confirmed" : status,
                OfferId = offerId,
                GuestName = guestName,
                GuestEmail = guestEmail,
                GuestPhone = guestPhone,
                UserId = userId,
                Price = price,
                Currency = currency,
                CreatedAt = DateTime.UtcNow
            };
        }

        // =====================================
        // CANCEL HOTEL BOOKING AT HOTELBEDS
        // =====================================
        public async Task<bool> CancelBookingAsync(string providerBookingId)
        {
            _logger.LogInformation("Sending hotel cancellation request to Hotelbeds for BookingId: {BookingId}", providerBookingId);
            try
            {
                var url = $"{_settings.BaseUrl}/hotel-api/1.0/bookings/{providerBookingId}?cancellationFlag=CANCELLATION";
                var request = new HttpRequestMessage(HttpMethod.Delete, url);
                AddRequiredHeaders(request);

                var response = await _httpClient.SendAsync(request);
                if (response.IsSuccessStatusCode)
                {
                    _logger.LogInformation("Hotelbeds successfully cancelled booking {BookingId}", providerBookingId);
                    return true;
                }

                var error = await response.Content.ReadAsStringAsync();
                _logger.LogWarning("Hotelbeds cancellation returned status {Status}. Response: {Response}", response.StatusCode, error);
                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Exception thrown while trying to cancel booking {BookingId} at Hotelbeds", providerBookingId);
                return false;
            }
        }
    }
}

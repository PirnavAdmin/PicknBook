using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Moq.Protected;
using FluentAssertions;
using Xunit;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Services;

namespace PickNBook.Api.Tests.Unit
{
    public class HotelbedsServiceTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        [Fact]
        public async Task SearchHotelsAsync_MapsImagesAndAmenitiesCorrectly()
        {
            // Arrange
            using var db = CreateDbContext();
            
            // Set up fallback or active settings
            var pricingSetting = new HotelPricingSetting
            {
                MarkupType = "Percentage",
                MarkupValue = 10m,
                IsActive = true
            };
            db.HotelPricingSettings.Add(pricingSetting);
            await db.SaveChangesAsync();

            var settings = new HotelbedsSettings
            {
                BaseUrl = "https://api.test.hotelbeds.com",
                ApiKey = "dummyKey",
                Secret = "dummySecret"
            };
            var optionsMock = new Mock<IOptions<HotelbedsSettings>>();
            optionsMock.Setup(o => o.Value).Returns(settings);

            var loggerMock = new Mock<ILogger<HotelbedsService>>();

            // Mock HttpMessageHandler to return search results and then content API results
            var handlerMock = new Mock<HttpMessageHandler>(MockBehavior.Strict);

            var availabilityResponseJson = @"
            {
              ""hotels"": {
                ""hotels"": [
                  {
                    ""code"": 12345,
                    ""name"": ""Grand Plaza Test"",
                    ""destinationCode"": ""DEL"",
                    ""address"": ""Test Road"",
                    ""latitude"": 28.61,
                    ""longitude"": 77.20,
                    ""rooms"": [
                      {
                        ""code"": ""DBL.DX"",
                        ""name"": ""Double Deluxe Room"",
                        ""rates"": [
                          {
                            ""rateKey"": ""rateKey123"",
                            ""paymentType"": ""VARIOUS"",
                            ""net"": 5000.00
                          }
                        ]
                      }
                    ]
                  }
                ]
              }
            }";

            var contentResponseJson = @"
            {
              ""hotels"": [
                {
                  ""code"": 12345,
                  ""images"": [
                    {
                      ""path"": ""00/012/012a.jpg""
                    }
                  ],
                  ""facilities"": [
                    {
                      ""facilityCode"": 10,
                      ""facilityGroupCode"": 10,
                      ""indYesOrNo"": true,
                      ""description"": {
                        ""content"": ""Wireless internet connection""
                      }
                    },
                    {
                      ""facilityCode"": 20,
                      ""facilityGroupCode"": 20,
                      ""indYesOrNo"": false,
                      ""description"": {
                        ""content"": ""Parking (extra charge)""
                      }
                    },
                    {
                      ""facilityCode"": 30,
                      ""facilityGroupCode"": 30,
                      ""description"": ""Outdoor swimming pool""
                    }
                  ]
                }
              ]
            }";

            // First call: Availability search
            handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.Is<HttpRequestMessage>(req => req.Method == HttpMethod.Post && req.RequestUri.ToString().Contains("/hotel-api/1.0/hotels")),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(availabilityResponseJson, System.Text.Encoding.UTF8, "application/json")
                });

            // Second call: Content API
            handlerMock
                .Protected()
                .Setup<Task<HttpResponseMessage>>(
                    "SendAsync",
                    ItExpr.Is<HttpRequestMessage>(req => req.Method == HttpMethod.Get && req.RequestUri.ToString().Contains("/hotel-content-api/1.0/hotels")),
                    ItExpr.IsAny<CancellationToken>()
                )
                .ReturnsAsync(new HttpResponseMessage
                {
                    StatusCode = HttpStatusCode.OK,
                    Content = new StringContent(contentResponseJson, System.Text.Encoding.UTF8, "application/json")
                });

            var httpClient = new HttpClient(handlerMock.Object);
            var service = new HotelbedsService(httpClient, optionsMock.Object, db, loggerMock.Object);

            // Act
            var results = await service.SearchHotelsAsync("DEL", DateTime.UtcNow.AddDays(1), DateTime.UtcNow.AddDays(2), 2, 1);

            // Assert
            results.Should().NotBeNull();
            results.Should().ContainSingle();

            var hotel = results.First();
            hotel.HotelId.Should().Be("12345");
            hotel.Name.Should().Be("Grand Plaza Test");
            hotel.Address.Should().Be("Test Road");

            // Verify markup logic applied: 5000 + 10% = 5500
            hotel.Offers.Should().ContainSingle();
            hotel.Offers.First().Price.Should().Be(5500m);

            // Verify images mapping
            hotel.Images.Should().ContainSingle();
            hotel.Images.First().Should().Be("https://photos.hotelbeds.com/giata/bigger/00/012/012a.jpg");

            // Verify amenities mapping
            hotel.Amenities.Should().HaveCount(2);
            hotel.Amenities.Should().Contain("Wireless internet connection");
            hotel.Amenities.Should().Contain("Outdoor swimming pool");
            hotel.Amenities.Should().NotContain("Parking (extra charge)"); // indYesOrNo was false
        }
    }
}

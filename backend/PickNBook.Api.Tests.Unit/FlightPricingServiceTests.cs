using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Moq;
using FluentAssertions;
using Xunit;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Services;

namespace PickNBook.Api.Tests.Unit
{
    public class FlightPricingServiceTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        [Fact]
        public async Task CalculatePricingAsync_FirstTimeCoupon_AppliesWhenNoPriorBooking()
        {
            // Arrange
            using var db = CreateDbContext();
            
            // Add a test coupon
            var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5.5));
            var coupon = new FlightCoupon
            {
                CouponCode = "FIRST50",
                CouponType = "Percentage",
                Value = 50,
                Status = "Active",
                StartDate = today.AddDays(-1),
                ExpiryDate = today.AddDays(5),
                IsFirstTimeUserOnly = true
            };
            db.FlightCoupons.Add(coupon);

            // Add flight convenience fee fallback
            db.FlightConvenienceFees.Add(new FlightConvenienceFee
            {
                AmountType = "Fixed",
                Value = 150,
                Status = "Active",
                UpdateDateUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            var flight = new FlightBooking
            {
                Id = 1,
                FlightNumber = "AI-101",
                Airline = "Air India",
                FromCity = "DEL",
                ToCity = "BOM",
                DepartureTime = DateTime.UtcNow.AddDays(1),
                ArrivalTime = DateTime.UtcNow.AddDays(1).AddHours(2),
                PriceInr = 2000,
                TotalSeats = 100,
                AvailableSeats = 100
            };

            var mockMarkup = new Mock<IFlightMarkupService>();
            mockMarkup.Setup(m => m.CalculateMarkupAsync(It.IsAny<string>(), It.IsAny<TripType>(), It.IsAny<decimal>()))
                .ReturnsAsync(0m);

            var mockPromo = new Mock<IFlightPromotionEngine>();
            mockPromo.Setup(p => p.GetBestPromotionAsync(It.IsAny<FlightPromotionEvaluationContext>()))
                .ReturnsAsync((FlightPromotion)null);

            var mockHistory = new Mock<IUserBookingHistoryService>();
            mockHistory.Setup(h => h.HasPriorBookingAsync("user123", It.IsAny<string>()))
                .ReturnsAsync(false); // No prior booking

            var service = new FlightPricingService(db, mockMarkup.Object, mockPromo.Object, mockHistory.Object);

            // Act
            var breakdown = await service.CalculatePricingAsync(
                flight,
                "Economy",
                TripType.OneWay,
                1,
                "FIRST50",
                "user123");

            // Assert
            breakdown.CouponDiscount.Should().Be(1000m); // 50% of 2000
            breakdown.FinalAmount.Should().Be(1150m); // 2000 - 1000 + 150 convenience fee
        }

        [Fact]
        public async Task CalculatePricingAsync_FirstTimeCoupon_DoesNotApplyWhenUserHasPriorBooking()
        {
            // Arrange
            using var db = CreateDbContext();
            
            // Add a test coupon
            var today = DateOnly.FromDateTime(DateTime.UtcNow.AddHours(5.5));
            var coupon = new FlightCoupon
            {
                CouponCode = "FIRST50",
                CouponType = "Percentage",
                Value = 50,
                Status = "Active",
                StartDate = today.AddDays(-1),
                ExpiryDate = today.AddDays(5),
                IsFirstTimeUserOnly = true
            };
            db.FlightCoupons.Add(coupon);

            db.FlightConvenienceFees.Add(new FlightConvenienceFee
            {
                AmountType = "Fixed",
                Value = 150,
                Status = "Active",
                UpdateDateUtc = DateTime.UtcNow
            });
            await db.SaveChangesAsync();

            var flight = new FlightBooking
            {
                Id = 1,
                FlightNumber = "AI-101",
                Airline = "Air India",
                FromCity = "DEL",
                ToCity = "BOM",
                DepartureTime = DateTime.UtcNow.AddDays(1),
                ArrivalTime = DateTime.UtcNow.AddDays(1).AddHours(2),
                PriceInr = 2000,
                TotalSeats = 100,
                AvailableSeats = 100
            };

            var mockMarkup = new Mock<IFlightMarkupService>();
            mockMarkup.Setup(m => m.CalculateMarkupAsync(It.IsAny<string>(), It.IsAny<TripType>(), It.IsAny<decimal>()))
                .ReturnsAsync(0m);

            var mockPromo = new Mock<IFlightPromotionEngine>();
            mockPromo.Setup(p => p.GetBestPromotionAsync(It.IsAny<FlightPromotionEvaluationContext>()))
                .ReturnsAsync((FlightPromotion)null);

            var mockHistory = new Mock<IUserBookingHistoryService>();
            mockHistory.Setup(h => h.HasPriorBookingAsync("user123", It.IsAny<string>()))
                .ReturnsAsync(true); // User has prior bookings

            var service = new FlightPricingService(db, mockMarkup.Object, mockPromo.Object, mockHistory.Object);

            // Act
            var breakdown = await service.CalculatePricingAsync(
                flight,
                "Economy",
                TripType.OneWay,
                1,
                "FIRST50",
                "user123");

            // Assert
            breakdown.CouponDiscount.Should().Be(0m); // Discount should be 0 since they have prior bookings
            breakdown.FinalAmount.Should().Be(2150m); // 2000 + 150 convenience fee
        }
    }
}

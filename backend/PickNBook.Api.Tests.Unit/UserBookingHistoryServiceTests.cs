using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using FluentAssertions;
using Xunit;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Services;

namespace PickNBook.Api.Tests.Unit
{
    public class UserBookingHistoryServiceTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        [Fact]
        public async Task HasPriorBookingAsync_NoReservations_ReturnsFalse()
        {
            // Arrange
            using var db = CreateDbContext();
            var service = new UserBookingHistoryService(db);

            // Act
            var result = await service.HasPriorBookingAsync("user123", "9999999999");

            // Assert
            result.Should().BeFalse();
        }

        [Fact]
        public async Task HasPriorBookingAsync_PriorFlightReservationExists_ReturnsTrue()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightReservations.Add(new FlightReservation
            {
                Id = 1,
                UserId = "user123",
                Status = "Booked",
                PassengerPhone = "9999999999"
            });
            await db.SaveChangesAsync();

            var service = new UserBookingHistoryService(db);

            // Act & Assert 1: Match by UserId
            var resByUserId = await service.HasPriorBookingAsync("user123", "8888888888");
            resByUserId.Should().BeTrue();

            // Act & Assert 2: Match by PassengerPhone
            var resByPhone = await service.HasPriorBookingAsync("otherUser", "9999999999");
            resByPhone.Should().BeTrue();
        }

        [Fact]
        public async Task HasPriorBookingAsync_PriorBusReservationExists_ReturnsTrue()
        {
            // Arrange
            using var db = CreateDbContext();
            db.BusReservations.Add(new BusReservation
            {
                Id = 1,
                UserId = "user123",
                Status = "Booked",
                PassengerPhone = "9999999999"
            });
            await db.SaveChangesAsync();

            var service = new UserBookingHistoryService(db);

            // Act & Assert
            var resByUserId = await service.HasPriorBookingAsync("user123", "8888888888");
            resByUserId.Should().BeTrue();

            var resByPhone = await service.HasPriorBookingAsync("otherUser", "9999999999");
            resByPhone.Should().BeTrue();
        }

        [Fact]
        public async Task HasPriorBookingAsync_CancelledReservationsOnly_ReturnsFalse()
        {
            // Arrange
            using var db = CreateDbContext();
            db.FlightReservations.Add(new FlightReservation
            {
                Id = 1,
                UserId = "user123",
                Status = "Cancelled",
                PassengerPhone = "9999999999"
            });
            db.BusReservations.Add(new BusReservation
            {
                Id = 2,
                UserId = "user123",
                Status = "Cancelled",
                PassengerPhone = "9999999999"
            });
            await db.SaveChangesAsync();

            var service = new UserBookingHistoryService(db);

            // Act
            var result = await service.HasPriorBookingAsync("user123", "9999999999");

            // Assert
            result.Should().BeFalse(); // Cancelled bookings are ignored
        }
    }
}

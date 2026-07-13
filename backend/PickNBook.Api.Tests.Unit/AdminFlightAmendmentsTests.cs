#nullable disable

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using FluentAssertions;
using Xunit;
using PickNBook.Api.Controllers;
using PickNBook.Api.Data;
using PickNBook.Api.Models;
using PickNBook.Api.Models.DTOs;

namespace PickNBook.Api.Tests.Unit
{
    public class AdminFlightAmendmentsTests
    {
        private AppDbContext CreateDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        #region GetAmendments Tests

        [Fact]
        public async Task GetAmendments_HappyPath_ReturnsOkWithProjectedAmendmentsSorted()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;

            var booking1 = new FlightBooking
            {
                Id = 1,
                FromCity = "DEL",
                ToCity = "BOM",
                Airline = "Indigo",
                FlightNumber = "6E-101",
                DepartureTime = now.AddDays(1),
                ArrivalTime = now.AddDays(1).AddHours(2)
            };
            var booking2 = new FlightBooking
            {
                Id = 2,
                FromCity = "BLR",
                ToCity = "MAA",
                Airline = "AirIndia",
                FlightNumber = "AI-202",
                DepartureTime = now.AddDays(2),
                ArrivalTime = now.AddDays(2).AddHours(1)
            };
            db.FlightBookings.AddRange(booking1, booking2);

            var res1 = new FlightReservation
            {
                Id = 10,
                FlightBookingId = 1,
                PassengerName = "Alice Doe",
                BookingReference = "REF01",
                UserId = "user1"
            };
            var res2 = new FlightReservation
            {
                Id = 20,
                FlightBookingId = 2,
                PassengerName = "Bob Smith",
                BookingReference = "REF02",
                UserId = "user2"
            };
            db.FlightReservations.AddRange(res1, res2);

            var amend1 = new FlightAmendmentRequest
            {
                Id = 100,
                FlightReservationId = 10,
                RequestDateUtc = now.AddMinutes(-10),
                AmendmentStatus = "Pending",
                SupplierRemark = "SupRemark1",
                CustomerRemark = "CustRemark1",
                AdminRemark = "AdminRemark1"
            };
            var amend2 = new FlightAmendmentRequest
            {
                Id = 200,
                FlightReservationId = 20,
                RequestDateUtc = now, // newer request
                AmendmentStatus = "Approved",
                SupplierRemark = "SupRemark2",
                CustomerRemark = "CustRemark2",
                AdminRemark = "AdminRemark2"
            };
            db.FlightAmendmentRequests.AddRange(amend1, amend2);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetAmendments();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as System.Collections.IEnumerable;
            list.Should().NotBeNull();

            var enumerator = list.GetEnumerator();
            var items = new List<object>();
            while (enumerator.MoveNext())
            {
                items.Add(enumerator.Current);
            }

            items.Should().HaveCount(2);

            // Since it orders by RequestDateUtc descending, amend2 (newer) should be first
            items[0].Should().BeEquivalentTo(new
            {
                Id = 200,
                RequestDateUtc = amend2.RequestDateUtc,
                Segment = "BLR - MAA",
                Customer = "Bob Smith",
                Status = "Approved",
                Remark = "AdminRemark2",
                Details = new
                {
                    AmendmentStatus = "Approved",
                    SupplierRemark = "SupRemark2",
                    CustomerRemark = "CustRemark2",
                    AdminRemark = "AdminRemark2"
                }
            });

            items[1].Should().BeEquivalentTo(new
            {
                Id = 100,
                RequestDateUtc = amend1.RequestDateUtc,
                Segment = "DEL - BOM",
                Customer = "Alice Doe",
                Status = "Pending",
                Remark = "AdminRemark1",
                Details = new
                {
                    AmendmentStatus = "Pending",
                    SupplierRemark = "SupRemark1",
                    CustomerRemark = "CustRemark1",
                    AdminRemark = "AdminRemark1"
                }
            });
        }

        [Fact]
        public async Task GetAmendments_InvalidLimit_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result1 = await controller.GetAmendments(limit: 0);
            var result2 = await controller.GetAmendments(limit: -10);

            // Assert
            var bad1 = result1.Should().BeOfType<BadRequestObjectResult>().Subject;
            bad1.Value.Should().Be("limit must be greater than 0.");

            var bad2 = result2.Should().BeOfType<BadRequestObjectResult>().Subject;
            bad2.Value.Should().Be("limit must be greater than 0.");
        }

        [Fact]
        public async Task GetAmendments_EmptyDatabase_ReturnsOkWithEmptyList()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetAmendments();

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as System.Collections.IEnumerable;
            list.Cast<object>().Should().BeEmpty();
        }

        [Fact]
        public async Task GetAmendments_CappedLimit_RespectsMaxLimit()
        {
            // Arrange
            using var db = CreateDbContext();
            var now = DateTime.UtcNow;

            var booking = new FlightBooking { Id = 1, FromCity = "DEL", ToCity = "BOM" };
            db.FlightBookings.Add(booking);

            var reservation = new FlightReservation { Id = 1, FlightBookingId = 1, PassengerName = "Test" };
            db.FlightReservations.Add(reservation);

            // Seed 600 amendment requests
            var requests = new List<FlightAmendmentRequest>();
            for (int i = 1; i <= 600; i++)
            {
                requests.Add(new FlightAmendmentRequest
                {
                    Id = i,
                    FlightReservationId = 1,
                    RequestDateUtc = now.AddSeconds(-i),
                    AmendmentStatus = "Pending"
                });
            }
            db.FlightAmendmentRequests.AddRange(requests);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetAmendments(limit: 600);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var list = okResult.Value as System.Collections.IEnumerable;
            list.Cast<object>().Count().Should().Be(500); // capped at 500
        }

        #endregion

        #region GetAmendmentById Tests

        [Fact]
        public async Task GetAmendmentById_ExistingId_ReturnsOkWithAmendment()
        {
            // Arrange
            using var db = CreateDbContext();
            var request = new FlightAmendmentRequest
            {
                Id = 5,
                FlightReservationId = 12,
                RequestDateUtc = DateTime.UtcNow,
                AmendmentStatus = "Pending"
            };
            db.FlightAmendmentRequests.Add(request);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetAmendmentById(5);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var row = okResult.Value as FlightAmendmentRequest;
            row.Should().NotBeNull();
            row.Id.Should().Be(5);
            row.FlightReservationId.Should().Be(12);
        }

        [Fact]
        public async Task GetAmendmentById_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.GetAmendmentById(999);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Amendment not found.");
        }

        #endregion

        #region CreateAmendment Tests

        [Fact]
        public async Task CreateAmendment_HappyPath_ReturnsCreatedAndPersists()
        {
            // Arrange
            using var db = CreateDbContext();
            var res = new FlightReservation { Id = 10, PassengerName = "Test" };
            db.FlightReservations.Add(res);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);
            var dto = new FlightAmendmentRequestDto
            {
                FlightReservationId = 10,
                AmendmentStatus = "  Approved  ",
                SupplierRemark = "SupRemark",
                CustomerRemark = "CustRemark",
                AdminRemark = "AdminRemark"
            };

            // Act
            var result = await controller.CreateAmendment(dto);

            // Assert
            var createdResult = result.Should().BeOfType<CreatedAtActionResult>().Subject;
            var row = createdResult.Value as FlightAmendmentRequest;
            row.Should().NotBeNull();
            row.FlightReservationId.Should().Be(10);
            row.AmendmentStatus.Should().Be("Approved"); // Trimmed & normalized
            row.SupplierRemark.Should().Be("SupRemark");
            row.CustomerRemark.Should().Be("CustRemark");
            row.AdminRemark.Should().Be("AdminRemark");
            row.RequestDateUtc.Should().BeCloseTo(DateTime.UtcNow, TimeSpan.FromSeconds(5));

            // Verify in db
            var dbRow = await db.FlightAmendmentRequests.FindAsync(row.Id);
            dbRow.Should().NotBeNull();
            dbRow.SupplierRemark.Should().Be("SupRemark");
            dbRow.AmendmentStatus.Should().Be("Approved");
        }

        [Fact]
        public async Task CreateAmendment_InvalidFlightReservationId_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new FlightAmendmentRequestDto
            {
                FlightReservationId = 999
            };

            // Act
            var result = await controller.CreateAmendment(dto);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("FlightReservationId is invalid.");
        }

        [Fact]
        public async Task CreateAmendment_NullRequest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.CreateAmendment(null);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Request body is required.");
        }

        #endregion

        #region UpdateAmendment Tests

        [Fact]
        public async Task UpdateAmendment_HappyPath_ReturnsOkAndUpdates()
        {
            // Arrange
            using var db = CreateDbContext();
            var origTime = DateTime.UtcNow.AddHours(-1);
            var row = new FlightAmendmentRequest
            {
                Id = 5,
                FlightReservationId = 10,
                RequestDateUtc = origTime,
                AmendmentStatus = "Pending",
                SupplierRemark = "OldSup",
                CustomerRemark = "OldCust",
                AdminRemark = "OldAdmin"
            };
            db.FlightAmendmentRequests.Add(row);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);
            var dto = new FlightAmendmentRequestDto
            {
                FlightReservationId = 10, // will not change
                AmendmentStatus = "  Rejected  ",
                SupplierRemark = "NewSup",
                CustomerRemark = "NewCust",
                AdminRemark = "NewAdmin"
            };

            // Act
            var result = await controller.UpdateAmendment(5, dto);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var updated = okResult.Value as FlightAmendmentRequest;
            updated.Should().NotBeNull();
            updated.Id.Should().Be(5);
            updated.AmendmentStatus.Should().Be("Rejected");
            updated.SupplierRemark.Should().Be("NewSup");
            updated.CustomerRemark.Should().Be("NewCust");
            updated.AdminRemark.Should().Be("NewAdmin");
            updated.RequestDateUtc.Should().Be(origTime); // unchanged

            // Verify in db
            var dbRow = await db.FlightAmendmentRequests.FindAsync(5);
            dbRow.AmendmentStatus.Should().Be("Rejected");
        }

        [Fact]
        public async Task UpdateAmendment_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);
            var dto = new FlightAmendmentRequestDto { AmendmentStatus = "Approved" };

            // Act
            var result = await controller.UpdateAmendment(999, dto);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Amendment not found.");
        }

        [Fact]
        public async Task UpdateAmendment_NullRequest_ReturnsBadRequest()
        {
            // Arrange
            using var db = CreateDbContext();
            var row = new FlightAmendmentRequest { Id = 5, FlightReservationId = 10, AmendmentStatus = "Pending" };
            db.FlightAmendmentRequests.Add(row);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.UpdateAmendment(5, null);

            // Assert
            var badResult = result.Should().BeOfType<BadRequestObjectResult>().Subject;
            badResult.Value.Should().Be("Request body is required.");
        }

        #endregion

        #region DeleteAmendment Tests

        [Fact]
        public async Task DeleteAmendment_ExistingId_ReturnsOkAndRemoves()
        {
            // Arrange
            using var db = CreateDbContext();
            var row = new FlightAmendmentRequest { Id = 5, FlightReservationId = 10, AmendmentStatus = "Pending" };
            db.FlightAmendmentRequests.Add(row);
            await db.SaveChangesAsync();

            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.DeleteAmendment(5);

            // Assert
            var okResult = result.Should().BeOfType<OkObjectResult>().Subject;
            var val = okResult.Value;
            var prop = val.GetType().GetProperty("message");
            prop.GetValue(val).Should().Be("Amendment deleted.");

            // Verify db
            var dbRow = await db.FlightAmendmentRequests.FindAsync(5);
            dbRow.Should().BeNull();
        }

        [Fact]
        public async Task DeleteAmendment_NonExistingId_ReturnsNotFound()
        {
            // Arrange
            using var db = CreateDbContext();
            var controller = new AdminFlightController(db);

            // Act
            var result = await controller.DeleteAmendment(999);

            // Assert
            var notFoundResult = result.Should().BeOfType<NotFoundObjectResult>().Subject;
            notFoundResult.Value.Should().Be("Amendment not found.");
        }

        #endregion
    }
}

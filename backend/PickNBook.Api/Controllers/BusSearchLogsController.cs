using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PickNBook.Api.Data;

namespace PickNBook.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class BusSearchLogsController : ControllerBase
    {
        private readonly AppDbContext dbContext;

        public BusSearchLogsController(AppDbContext dbContext)
        {
            this.dbContext = dbContext;
        }

        private static DateTime ToIst(DateTime utcDateTime)
        {
            return DateTime.SpecifyKind(utcDateTime, DateTimeKind.Utc)
                .AddHours(5.5);
        }

        [HttpGet]
        public async Task<IActionResult> GetBusSearchLogs()
        {
            var logs = await dbContext.BusSearchLogs
                .OrderByDescending(x => x.SearchedAtUtc)
                .Select(x => new
                {
                    x.Id,
                    x.UserId,
                    x.UserOrGuestId,
                    x.IsGuest,
                    x.FromCity,
                    x.ToCity,
                    x.JourneyDate,
                    SearchedAtUtc = ToIst(x.SearchedAtUtc)
                })
                .ToListAsync();

            return Ok(logs);
        }
    }
}
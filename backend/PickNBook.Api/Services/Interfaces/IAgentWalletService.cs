using System.Threading.Tasks;

namespace PickNBook.Api.Services
{
    public interface IAgentWalletService
    {
        Task DebitWalletForBookingAsync(int agentId, decimal amount, string bookingReference, string serviceType, string description);
    }
}

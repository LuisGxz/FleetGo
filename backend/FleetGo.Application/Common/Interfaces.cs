using FleetGo.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FleetGo.Application.Common;

public interface IAppDbContext
{
    DbSet<User> Users { get; }
    DbSet<RefreshToken> RefreshTokens { get; }
    DbSet<CourierProfile> CourierProfiles { get; }
    DbSet<Route> Routes { get; }
    DbSet<Delivery> Deliveries { get; }
    DbSet<DeliveryEvent> DeliveryEvents { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

public interface IClock
{
    DateTime UtcNow { get; }
}

public interface IJwtTokenService
{
    TimeSpan RefreshTokenLifetime { get; }
    (string AccessToken, int ExpiresInSeconds) CreateAccessToken(User user);
    (string RawToken, string TokenHash) CreateRefreshToken();
    string HashRefreshToken(string rawToken);
}

public interface IPasswordHasherService
{
    string Hash(string password);
    bool Verify(string hash, string password);
}

public record PagedResult<T>(IReadOnlyList<T> Items, int Page, int PageSize, int Total);

public record UnitPosition(string UnitCode, decimal Lat, decimal Lng, double Heading, DateTime AtUtc);

/// <summary>
/// Live unit positions. In-memory for the demo (single instance); the interface is the seam
/// where a RedisPositionStore would plug in for multi-instance deployments.
/// </summary>
public interface IPositionStore
{
    void Set(UnitPosition position);
    UnitPosition? Get(string unitCode);
    IReadOnlyList<UnitPosition> GetAll();
}

/// <summary>Outbound real-time notifications (implemented over SignalR in Infrastructure).</summary>
public interface ITrackingNotifier
{
    Task UnitMovedAsync(UnitPosition position, CancellationToken ct = default);
    Task DeliveryUpdatedAsync(Guid deliveryId, Guid routeId, string unitCode, string status, CancellationToken ct = default);
}

public class UnauthorizedException(string message) : Exception(message);
public class ForbiddenException(string message) : Exception(message);
public class NotFoundException(string message) : Exception(message);
public class ConflictException(string message) : Exception(message);

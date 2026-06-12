using FleetGo.Domain.Enums;

namespace FleetGo.Domain.Entities;

/// <summary>Append-only trail of delivery status transitions, with the position where they happened.</summary>
public class DeliveryEvent
{
    public long Id { get; init; }
    public required Guid DeliveryId { get; init; }
    public required Guid UserId { get; init; }
    public required DeliveryStatus FromStatus { get; init; }
    public required DeliveryStatus ToStatus { get; init; }
    public decimal? Lat { get; init; }
    public decimal? Lng { get; init; }
    public string? Note { get; init; }
    public DateTime OccurredAtUtc { get; init; } = DateTime.UtcNow;
}

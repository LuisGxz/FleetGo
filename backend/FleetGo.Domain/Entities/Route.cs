using FleetGo.Domain.Enums;

namespace FleetGo.Domain.Entities;

public class Route
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid CourierProfileId { get; init; }
    public required string RouteCode { get; init; }
    public required DateOnly Date { get; init; }
    public RouteStatus Status { get; private set; } = RouteStatus.Planned;
    public required decimal StartLat { get; init; }
    public required decimal StartLng { get; init; }
    public DateTime CreatedAtUtc { get; init; } = DateTime.UtcNow;

    public CourierProfile? Courier { get; init; }
    public ICollection<Delivery> Deliveries { get; init; } = [];

    public int CompletedCount => Deliveries.Count(d => d.Status != DeliveryStatus.Pending);

    public void Activate() => Status = RouteStatus.Active;

    /// <summary>Routes auto-complete once every stop is resolved (delivered or failed).</summary>
    public void RefreshStatus()
    {
        if (Deliveries.Count > 0 && Deliveries.All(d => d.Status != DeliveryStatus.Pending))
            Status = RouteStatus.Completed;
        else if (Status == RouteStatus.Planned && Deliveries.Any(d => d.Status != DeliveryStatus.Pending))
            Status = RouteStatus.Active;
    }
}

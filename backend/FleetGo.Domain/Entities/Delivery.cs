using FleetGo.Domain.Enums;
using FleetGo.Domain.Exceptions;

namespace FleetGo.Domain.Entities;

/// <summary>
/// A stop on a route. Once resolved (Delivered/Failed) it is immutable — there is no "undo"
/// in the field; corrections happen as new deliveries on a later route.
/// </summary>
public class Delivery
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid RouteId { get; init; }
    public required int Sequence { get; init; }
    public required string PackageCode { get; init; }
    public required string CustomerName { get; init; }
    public required string Address { get; init; }
    public required decimal Lat { get; init; }
    public required decimal Lng { get; init; }
    public DateTime? WindowEndUtc { get; init; }
    public int Parcels { get; init; } = 1;
    public bool SignatureRequired { get; init; }
    public DeliveryStatus Status { get; private set; } = DeliveryStatus.Pending;
    public DateTime? DeliveredAtUtc { get; private set; }
    public FailReason? FailReason { get; private set; }
    public string? FailNote { get; private set; }
    public string? SignaturePng { get; private set; }
    public decimal? ResolvedLat { get; private set; }
    public decimal? ResolvedLng { get; private set; }

    public Route? Route { get; init; }

    public void MarkDelivered(DateTime nowUtc, string? signaturePng, decimal lat, decimal lng)
    {
        EnsurePending("deliver");
        if (SignatureRequired && string.IsNullOrWhiteSpace(signaturePng))
            throw new DomainException("This delivery requires the customer's signature.");

        Status = DeliveryStatus.Delivered;
        DeliveredAtUtc = nowUtc;
        SignaturePng = signaturePng;
        ResolvedLat = lat;
        ResolvedLng = lng;
    }

    public void MarkFailed(DateTime nowUtc, FailReason reason, string? note, decimal lat, decimal lng)
    {
        EnsurePending("fail");
        Status = DeliveryStatus.Failed;
        DeliveredAtUtc = nowUtc;
        FailReason = reason;
        FailNote = note?.Trim();
        ResolvedLat = lat;
        ResolvedLng = lng;
    }

    public bool IsLate(DateTime nowUtc) =>
        WindowEndUtc.HasValue && Status == DeliveryStatus.Pending && nowUtc > WindowEndUtc.Value;

    private void EnsurePending(string action)
    {
        if (Status != DeliveryStatus.Pending)
            throw new DomainException($"Cannot {action} a delivery already resolved as {Status}. Deliveries are immutable once resolved.");
    }
}

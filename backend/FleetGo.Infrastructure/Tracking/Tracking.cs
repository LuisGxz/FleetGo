using System.Collections.Concurrent;
using FleetGo.Application.Common;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace FleetGo.Infrastructure.Tracking;

/// <summary>
/// Single-instance live position store. The IPositionStore seam is where Redis would plug in
/// for a multi-instance deployment (documented trade-off — Azure free tier has no Redis).
/// </summary>
public class InMemoryPositionStore : IPositionStore
{
    private readonly ConcurrentDictionary<string, UnitPosition> _positions = new(StringComparer.OrdinalIgnoreCase);

    public void Set(UnitPosition position) => _positions[position.UnitCode] = position;

    public UnitPosition? Get(string unitCode) =>
        _positions.TryGetValue(unitCode, out var position) ? position : null;

    public IReadOnlyList<UnitPosition> GetAll() => _positions.Values.ToList();
}

[Authorize]
public class TrackingHub : Hub;

public class SignalRTrackingNotifier(IHubContext<TrackingHub> hub) : ITrackingNotifier
{
    public Task UnitMovedAsync(UnitPosition position, CancellationToken ct = default) =>
        hub.Clients.All.SendAsync("UnitMoved", new
        {
            unitCode = position.UnitCode,
            lat = position.Lat,
            lng = position.Lng,
            heading = position.Heading,
            atUtc = position.AtUtc
        }, ct);

    public Task DeliveryUpdatedAsync(Guid deliveryId, Guid routeId, string unitCode, string status, CancellationToken ct = default) =>
        hub.Clients.All.SendAsync("DeliveryUpdated", new { deliveryId, routeId, unitCode, status }, ct);
}

using FleetGo.Application.Common;
using FleetGo.Application.Routes;
using FleetGo.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace FleetGo.Application.Dispatch;

public record DispatchSummaryDto(int UnitsActive, int DeliveredToday, double OnTimePct, int Delays, int QueuedRoutes);

public record UnitStatusDto(
    string UnitCode, string CourierName, Guid RouteId, string RouteCode,
    decimal? Lat, decimal? Lng, double Heading,
    int StopsRemaining, int Total, int Completed, DateTime? EtaUtc, string Status);

public class DispatchService(IAppDbContext db, IPositionStore positions, IClock clock)
{
    public async Task<DispatchSummaryDto> SummaryAsync(Actor actor, CancellationToken ct = default)
    {
        EnsureCoordinator(actor);
        var today = DateOnly.FromDateTime(clock.UtcNow);

        var todayDeliveries = await db.Deliveries
            .Where(d => d.Route!.Date == today)
            .Select(d => new { d.Status, d.WindowEndUtc, d.DeliveredAtUtc })
            .AsNoTracking()
            .ToListAsync(ct);

        var delivered = todayDeliveries.Count(d => d.Status == DeliveryStatus.Delivered);
        var withWindow = todayDeliveries.Where(d => d.Status == DeliveryStatus.Delivered && d.WindowEndUtc.HasValue).ToList();
        var onTime = withWindow.Count(d => d.DeliveredAtUtc <= d.WindowEndUtc);
        var delays = todayDeliveries.Count(d =>
            d.Status == DeliveryStatus.Pending && d.WindowEndUtc.HasValue && clock.UtcNow > d.WindowEndUtc);

        var unitsActive = await db.Routes.CountAsync(r => r.Date == today && r.Status == RouteStatus.Active, ct);
        var queued = await db.Routes.CountAsync(r => r.Date == today && r.Status == RouteStatus.Planned, ct);

        return new DispatchSummaryDto(
            unitsActive, delivered,
            withWindow.Count == 0 ? 100 : Math.Round(onTime * 100.0 / withWindow.Count, 1),
            delays, queued);
    }

    /// <summary>Live board: every unit with a route today, its position from the store, progress and rough ETA.</summary>
    public async Task<List<UnitStatusDto>> UnitsAsync(Actor actor, CancellationToken ct = default)
    {
        EnsureCoordinator(actor);
        var today = DateOnly.FromDateTime(clock.UtcNow);

        var routes = await db.Routes
            .Include(r => r.Courier!).ThenInclude(c => c.User)
            .Include(r => r.Deliveries)
            .Where(r => r.Date == today)
            .AsNoTracking()
            .ToListAsync(ct);

        var result = new List<UnitStatusDto>();
        foreach (var route in routes.OrderBy(r => r.RouteCode))
        {
            var unitCode = route.Courier?.UnitCode ?? "";
            var position = positions.Get(unitCode);
            var pending = route.Deliveries.Where(d => d.Status == DeliveryStatus.Pending).OrderBy(d => d.Sequence).ToList();

            DateTime? eta = null;
            if (position is not null && pending.Count > 0)
            {
                // Rough ETA: chained haversine current → each remaining stop at average speed.
                var km = GeoMath.HaversineKm((double)position.Lat, (double)position.Lng, (double)pending[0].Lat, (double)pending[0].Lng);
                for (var i = 1; i < pending.Count; i++)
                    km += GeoMath.HaversineKm((double)pending[i - 1].Lat, (double)pending[i - 1].Lng, (double)pending[i].Lat, (double)pending[i].Lng);
                eta = clock.UtcNow.AddMinutes(GeoMath.EtaMinutes(km) + pending.Count * 3); // +3 min handling per stop
            }

            result.Add(new UnitStatusDto(
                unitCode, route.Courier?.User?.FullName ?? "", route.Id, route.RouteCode,
                position?.Lat, position?.Lng, position?.Heading ?? 0,
                pending.Count, route.Deliveries.Count, route.CompletedCount, eta, route.Status.ToString()));
        }

        return result;
    }

    private static void EnsureCoordinator(Actor actor)
    {
        if (actor.Role != UserRole.Coordinator)
            throw new ForbiddenException("Dispatch data is coordinator-only.");
    }
}

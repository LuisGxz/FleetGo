using FleetGo.Application.Common;
using FleetGo.Domain.Entities;
using FleetGo.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace FleetGo.Application.Routes;

public record Actor(Guid UserId, UserRole Role, Guid? CourierProfileId, string? UnitCode);

public record DeliveryDto(
    Guid Id, int Sequence, string PackageCode, string CustomerName, string Address,
    decimal Lat, decimal Lng, DateTime? WindowEndUtc, int Parcels, bool SignatureRequired,
    string Status, DateTime? DeliveredAtUtc, string? FailReason, string? FailNote, string? SignaturePng)
{
    public static DeliveryDto From(Delivery d, bool includeSignature = false) => new(
        d.Id, d.Sequence, d.PackageCode, d.CustomerName, d.Address, d.Lat, d.Lng,
        d.WindowEndUtc, d.Parcels, d.SignatureRequired, d.Status.ToString(),
        d.DeliveredAtUtc, d.FailReason?.ToString(), d.FailNote,
        includeSignature ? d.SignaturePng : null);
}

public record RouteDto(
    Guid Id, string RouteCode, string UnitCode, string CourierName, DateOnly Date, string Status,
    decimal StartLat, decimal StartLng, int Total, int Completed, List<DeliveryDto> Deliveries)
{
    public static RouteDto From(Route r, bool includeSignatures = false) => new(
        r.Id, r.RouteCode, r.Courier?.UnitCode ?? "", r.Courier?.User?.FullName ?? "",
        r.Date, r.Status.ToString(), r.StartLat, r.StartLng,
        r.Deliveries.Count, r.CompletedCount,
        r.Deliveries.OrderBy(d => d.Sequence).Select(d => DeliveryDto.From(d, includeSignatures)).ToList());
}

public record RouteSummaryDto(Guid Id, string RouteCode, string UnitCode, string CourierName, DateOnly Date, string Status, int Total, int Completed);

public class RouteService(IAppDbContext db, IClock clock)
{
    /// <summary>The courier's route for today, with stops in sequence.</summary>
    public async Task<RouteDto?> TodayForCourierAsync(Actor actor, CancellationToken ct = default)
    {
        if (actor.Role != UserRole.Courier || actor.CourierProfileId is null)
            throw new ForbiddenException("Only couriers have a daily route.");

        var today = DateOnly.FromDateTime(clock.UtcNow);
        var route = await db.Routes
            .Include(r => r.Courier!).ThenInclude(c => c.User)
            .Include(r => r.Deliveries)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.CourierProfileId == actor.CourierProfileId && r.Date == today, ct);

        return route is null ? null : RouteDto.From(route);
    }

    public async Task<PagedResult<RouteSummaryDto>> ListAsync(Actor actor, DateOnly? date, int page, int pageSize, CancellationToken ct = default)
    {
        if (actor.Role != UserRole.Coordinator)
            throw new ForbiddenException("Only coordinators can browse routes.");

        var q = db.Routes
            .Include(r => r.Courier!).ThenInclude(c => c.User)
            .Include(r => r.Deliveries)
            .AsNoTracking()
            .AsQueryable();

        if (date is { } d)
            q = q.Where(r => r.Date == d);

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(r => r.Date).ThenBy(r => r.RouteCode)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<RouteSummaryDto>(
            items.Select(r => new RouteSummaryDto(r.Id, r.RouteCode, r.Courier?.UnitCode ?? "",
                r.Courier?.User?.FullName ?? "", r.Date, r.Status.ToString(), r.Deliveries.Count, r.CompletedCount)).ToList(),
            page, pageSize, total);
    }

    /// <summary>Route detail. Coordinators see signatures; couriers only their own route.</summary>
    public async Task<RouteDto> GetAsync(Actor actor, Guid routeId, CancellationToken ct = default)
    {
        var route = await db.Routes
            .Include(r => r.Courier!).ThenInclude(c => c.User)
            .Include(r => r.Deliveries)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == routeId, ct)
            ?? throw new NotFoundException("Route not found.");

        if (actor.Role == UserRole.Courier && route.CourierProfileId != actor.CourierProfileId)
            throw new ForbiddenException("Couriers can only access their own routes.");

        return RouteDto.From(route, includeSignatures: actor.Role == UserRole.Coordinator);
    }
}

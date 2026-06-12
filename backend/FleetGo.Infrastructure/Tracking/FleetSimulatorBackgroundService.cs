using FleetGo.Application.Common;
using FleetGo.Domain.Enums;
using FleetGo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace FleetGo.Infrastructure.Tracking;

/// <summary>
/// Demo-life engine: moves every unit with an active/planned route toward its next pending stop
/// (small interpolation steps every tick) and occasionally resolves the stop on arrival, so the
/// dispatch map is alive without real couriers. Skips UNIT-07 stops resolution — that unit is the
/// interactive demo courier; the human resolves its deliveries.
/// </summary>
public class FleetSimulatorBackgroundService(
    IServiceScopeFactory scopeFactory,
    IPositionStore positions,
    ITrackingNotifier notifier,
    IConfiguration configuration,
    ILogger<FleetSimulatorBackgroundService> logger) : BackgroundService
{
    private static readonly TimeSpan Tick = TimeSpan.FromSeconds(3);
    private const double StepKmPerTick = 0.18; // ~216 km/h would be unrealistic; 0.18 km / 3 s ≈ urban van pace sped up for demo
    private const string InteractiveUnit = "UNIT-07";
    private readonly Random _rng = new();

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!configuration.GetValue<bool>("Simulator:Enabled"))
        {
            logger.LogInformation("Fleet simulator disabled.");
            return;
        }

        logger.LogInformation("Fleet simulator started.");
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await TickAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Simulator tick failed; continuing.");
            }
            await Task.Delay(Tick, stoppingToken);
        }
    }

    internal async Task TickAsync(CancellationToken ct)
    {
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<FleetGoDbContext>();
        var clock = scope.ServiceProvider.GetRequiredService<IClock>();

        var today = DateOnly.FromDateTime(clock.UtcNow);
        var routes = await db.Routes
            .Include(r => r.Courier)
            .Include(r => r.Deliveries)
            .Where(r => r.Date == today && r.Status != RouteStatus.Completed)
            .ToListAsync(ct);

        foreach (var route in routes)
        {
            var unitCode = route.Courier?.UnitCode;
            if (unitCode is null) continue;

            var next = route.Deliveries
                .Where(d => d.Status == DeliveryStatus.Pending)
                .OrderBy(d => d.Sequence)
                .FirstOrDefault();
            if (next is null) continue;

            var current = positions.Get(unitCode)
                ?? new UnitPosition(unitCode, route.StartLat, route.StartLng, 0, clock.UtcNow);

            var distKm = GeoMath.HaversineKm((double)current.Lat, (double)current.Lng, (double)next.Lat, (double)next.Lng);

            if (distKm < 0.08)
            {
                // Arrived. The interactive unit waits for the human; others auto-resolve most of the time.
                if (unitCode != InteractiveUnit && _rng.NextDouble() < 0.6)
                {
                    if (_rng.NextDouble() < 0.93)
                        next.MarkDelivered(clock.UtcNow, next.SignatureRequired ? TinySignature : null, next.Lat, next.Lng);
                    else
                        next.MarkFailed(clock.UtcNow, FailReason.CustomerAbsent, "Simulated: no answer at door", next.Lat, next.Lng);

                    db.DeliveryEvents.Add(new Domain.Entities.DeliveryEvent
                    {
                        DeliveryId = next.Id,
                        UserId = route.Courier!.UserId,
                        FromStatus = DeliveryStatus.Pending,
                        ToStatus = next.Status,
                        Lat = next.Lat,
                        Lng = next.Lng,
                        Note = "simulator",
                        OccurredAtUtc = clock.UtcNow
                    });
                    route.RefreshStatus();
                    await db.SaveChangesAsync(ct);
                    await notifier.DeliveryUpdatedAsync(next.Id, route.Id, unitCode, next.Status.ToString(), ct);
                }
                continue;
            }

            // Move one step toward the stop.
            var fraction = Math.Min(1.0, StepKmPerTick / distKm);
            var newLat = (decimal)((double)current.Lat + ((double)next.Lat - (double)current.Lat) * fraction);
            var newLng = (decimal)((double)current.Lng + ((double)next.Lng - (double)current.Lng) * fraction);
            var heading = GeoMath.HeadingDegrees((double)current.Lat, (double)current.Lng, (double)next.Lat, (double)next.Lng);

            if (route.Status == RouteStatus.Planned)
            {
                route.Activate();
                await db.SaveChangesAsync(ct);
            }

            var updated = new UnitPosition(unitCode, newLat, newLng, heading, clock.UtcNow);
            positions.Set(updated);
            await notifier.UnitMovedAsync(updated, ct);
        }
    }

    // 1x1 transparent PNG data URL — placeholder signature for simulated deliveries.
    private const string TinySignature = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
}

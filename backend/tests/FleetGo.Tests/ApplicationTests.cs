using FleetGo.Application.Common;
using FleetGo.Application.Deliveries;
using FleetGo.Application.Dispatch;
using FleetGo.Application.Routes;
using FleetGo.Domain.Entities;
using FleetGo.Domain.Enums;
using FleetGo.Infrastructure.Persistence;
using FleetGo.Infrastructure.Tracking;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace FleetGo.Tests;

internal class FixedClock(DateTime utcNow) : IClock
{
    public DateTime UtcNow { get; set; } = utcNow;
}

internal class NullNotifier : ITrackingNotifier
{
    public List<string> DeliveryEvents { get; } = [];

    public Task UnitMovedAsync(UnitPosition position, CancellationToken ct = default) => Task.CompletedTask;

    public Task DeliveryUpdatedAsync(Guid deliveryId, Guid routeId, string unitCode, string status, CancellationToken ct = default)
    {
        DeliveryEvents.Add($"{unitCode}:{status}");
        return Task.CompletedTask;
    }
}

public class FleetServiceTests : IDisposable
{
    private static readonly DateTime Now = new(2026, 6, 12, 18, 0, 0, DateTimeKind.Utc);
    private const string Png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==";

    private readonly SqliteConnection _connection;
    private readonly FleetGoDbContext _db;
    private readonly FixedClock _clock = new(Now);
    private readonly NullNotifier _notifier = new();
    private readonly InMemoryPositionStore _positions = new();

    private readonly RouteService _routes;
    private readonly DeliveryService _deliveries;
    private readonly DispatchService _dispatch;

    private readonly Actor _courier;      // owns the route
    private readonly Actor _otherCourier; // does not
    private readonly Actor _coordinator;
    private readonly Guid _routeId;
    private readonly Guid _signedDeliveryId;   // requires signature
    private readonly Guid _plainDeliveryId;    // does not

    public FleetServiceTests()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        _db = new FleetGoDbContext(new DbContextOptionsBuilder<FleetGoDbContext>().UseSqlite(_connection).Options);
        _db.Database.EnsureCreated();

        _routes = new RouteService(_db, _clock);
        _deliveries = new DeliveryService(_db, _clock, _notifier, new DeliverValidator(), new FailValidator());
        _dispatch = new DispatchService(_db, _positions, _clock);

        var courierUser = new User { Email = "c1@t.dev", FullName = "Luis C.", PasswordHash = "x", Role = UserRole.Courier };
        var courierProfile = new CourierProfile { UserId = courierUser.Id, UnitCode = "UNIT-07" };
        var otherUser = new User { Email = "c2@t.dev", FullName = "Amara D.", PasswordHash = "x", Role = UserRole.Courier };
        var otherProfile = new CourierProfile { UserId = otherUser.Id, UnitCode = "UNIT-03" };
        var coordUser = new User { Email = "d@t.dev", FullName = "Dana", PasswordHash = "x", Role = UserRole.Coordinator };

        var route = new Route
        {
            CourierProfileId = courierProfile.Id, RouteCode = "R-07",
            Date = DateOnly.FromDateTime(Now), StartLat = 47.609m, StartLng = -122.338m
        };
        var signed = new Delivery
        {
            RouteId = route.Id, Sequence = 1, PackageCode = "PKG-88412", CustomerName = "Rachel Donovan",
            Address = "1847 Linden Ave", Lat = 47.62m, Lng = -122.35m, SignatureRequired = true,
            WindowEndUtc = Now.AddHours(2)
        };
        var plain = new Delivery
        {
            RouteId = route.Id, Sequence = 2, PackageCode = "PKG-88419", CustomerName = "Marcus Webb",
            Address = "622 Foster St", Lat = 47.60m, Lng = -122.32m
        };

        _db.Users.AddRange(courierUser, otherUser, coordUser);
        _db.CourierProfiles.AddRange(courierProfile, otherProfile);
        _db.Routes.Add(route);
        _db.Deliveries.AddRange(signed, plain);
        _db.SaveChanges();

        _courier = new Actor(courierUser.Id, UserRole.Courier, courierProfile.Id, "UNIT-07");
        _otherCourier = new Actor(otherUser.Id, UserRole.Courier, otherProfile.Id, "UNIT-03");
        _coordinator = new Actor(coordUser.Id, UserRole.Coordinator, null, null);
        _routeId = route.Id;
        _signedDeliveryId = signed.Id;
        _plainDeliveryId = plain.Id;
    }

    public void Dispose()
    {
        _db.Dispose();
        _connection.Dispose();
    }

    [Fact]
    public async Task TodayRoute_ReturnsOrderedStops_CoordinatorForbidden()
    {
        var route = await _routes.TodayForCourierAsync(_courier);
        Assert.NotNull(route);
        Assert.Equal(2, route!.Total);
        Assert.Equal("PKG-88412", route.Deliveries[0].PackageCode);

        await Assert.ThrowsAsync<ForbiddenException>(() => _routes.TodayForCourierAsync(_coordinator));
    }

    [Fact]
    public async Task Deliver_RequiresSignature_ThenSucceedsAndNotifies()
    {
        var ex = await Assert.ThrowsAsync<FleetGo.Domain.Exceptions.DomainException>(() =>
            _deliveries.DeliverAsync(_courier, _signedDeliveryId, new DeliverRequest(null, 47.62m, -122.35m)));
        Assert.Contains("signature", ex.Message, StringComparison.OrdinalIgnoreCase);

        var dto = await _deliveries.DeliverAsync(_courier, _signedDeliveryId, new DeliverRequest(Png, 47.62m, -122.35m));
        Assert.Equal("Delivered", dto.Status);
        Assert.Contains("UNIT-07:Delivered", _notifier.DeliveryEvents);

        var evt = await _db.DeliveryEvents.SingleAsync();
        Assert.Equal(DeliveryStatus.Delivered, evt.ToStatus);
        Assert.Equal(47.62m, evt.Lat);
    }

    [Fact]
    public async Task Deliver_OthersRoute_Forbidden_CoordinatorForbidden()
    {
        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _deliveries.DeliverAsync(_otherCourier, _plainDeliveryId, new DeliverRequest(null, 0, 0)));
        await Assert.ThrowsAsync<ForbiddenException>(() =>
            _deliveries.DeliverAsync(_coordinator, _plainDeliveryId, new DeliverRequest(null, 0, 0)));
    }

    [Fact]
    public async Task Fail_WithCatalogReason_RouteCompletesWhenAllResolved()
    {
        await _deliveries.DeliverAsync(_courier, _signedDeliveryId, new DeliverRequest(Png, 47.62m, -122.35m));
        await _deliveries.FailAsync(_courier, _plainDeliveryId, new FailRequest("CustomerAbsent", "no answer", 47.6m, -122.32m));

        var route = await _db.Routes.Include(r => r.Deliveries).SingleAsync(r => r.Id == _routeId);
        Assert.Equal(RouteStatus.Completed, route.Status);
    }

    [Fact]
    public async Task Fail_UnknownReason_FailsValidation()
    {
        await Assert.ThrowsAsync<FluentValidation.ValidationException>(() =>
            _deliveries.FailAsync(_courier, _plainDeliveryId, new FailRequest("DogAteIt", null, 0, 0)));
    }

    [Fact]
    public async Task RouteDetail_CoordinatorSeesSignature_CourierDoesNot_StrangerForbidden()
    {
        await _deliveries.DeliverAsync(_courier, _signedDeliveryId, new DeliverRequest(Png, 47.62m, -122.35m));

        var forCoordinator = await _routes.GetAsync(_coordinator, _routeId);
        Assert.NotNull(forCoordinator.Deliveries[0].SignaturePng);

        var forCourier = await _routes.GetAsync(_courier, _routeId);
        Assert.Null(forCourier.Deliveries[0].SignaturePng);

        await Assert.ThrowsAsync<ForbiddenException>(() => _routes.GetAsync(_otherCourier, _routeId));
    }

    [Fact]
    public async Task Dispatch_SummaryAndUnits_ReflectStoreAndProgress()
    {
        _positions.Set(new UnitPosition("UNIT-07", 47.615m, -122.34m, 90, Now));
        await _deliveries.DeliverAsync(_courier, _signedDeliveryId, new DeliverRequest(Png, 47.62m, -122.35m));

        var summary = await _dispatch.SummaryAsync(_coordinator);
        Assert.Equal(1, summary.DeliveredToday);

        var units = await _dispatch.UnitsAsync(_coordinator);
        var unit = Assert.Single(units, u => u.UnitCode == "UNIT-07");
        Assert.Equal(1, unit.StopsRemaining);
        Assert.Equal(47.615m, unit.Lat);
        Assert.NotNull(unit.EtaUtc);

        await Assert.ThrowsAsync<ForbiddenException>(() => _dispatch.SummaryAsync(_courier));
    }

    [Fact]
    public async Task DeliveryEvents_AreAppendOnly()
    {
        await _deliveries.DeliverAsync(_courier, _signedDeliveryId, new DeliverRequest(Png, 47.62m, -122.35m));
        var evt = await _db.DeliveryEvents.SingleAsync();

        _db.DeliveryEvents.Remove(evt);
        await Assert.ThrowsAsync<InvalidOperationException>(() => _db.SaveChangesAsync());
    }

    [Fact]
    public void PositionStore_UpsertsByUnit()
    {
        _positions.Set(new UnitPosition("UNIT-07", 1, 1, 0, Now));
        _positions.Set(new UnitPosition("UNIT-07", 2, 2, 90, Now.AddSeconds(5)));

        var current = _positions.Get("UNIT-07");
        Assert.Equal(2, current!.Lat);
        Assert.Single(_positions.GetAll());
    }
}

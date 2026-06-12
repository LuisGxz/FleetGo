using FleetGo.Application.Common;
using FleetGo.Domain.Entities;
using FleetGo.Domain.Enums;
using FleetGo.Domain.Exceptions;

namespace FleetGo.Tests;

public class DeliveryTests
{
    private static readonly DateTime Now = new(2026, 6, 12, 18, 0, 0, DateTimeKind.Utc);
    private const string Png = "data:image/png;base64,abc";

    private static Delivery Create(bool signatureRequired = false) => new()
    {
        RouteId = Guid.NewGuid(),
        Sequence = 1,
        PackageCode = "PKG-88412",
        CustomerName = "Rachel Donovan",
        Address = "1847 Linden Ave",
        Lat = 47.61m,
        Lng = -122.33m,
        SignatureRequired = signatureRequired
    };

    [Fact]
    public void Deliver_WithoutRequiredSignature_Throws()
    {
        var delivery = Create(signatureRequired: true);
        Assert.Throws<DomainException>(() => delivery.MarkDelivered(Now, null, 47.61m, -122.33m));
    }

    [Fact]
    public void Deliver_WithSignature_StoresEverything()
    {
        var delivery = Create(signatureRequired: true);
        delivery.MarkDelivered(Now, Png, 47.62m, -122.34m);

        Assert.Equal(DeliveryStatus.Delivered, delivery.Status);
        Assert.Equal(Now, delivery.DeliveredAtUtc);
        Assert.Equal(Png, delivery.SignaturePng);
        Assert.Equal(47.62m, delivery.ResolvedLat);
    }

    [Fact]
    public void Deliver_NoSignatureNeeded_WorksWithoutOne()
    {
        var delivery = Create();
        delivery.MarkDelivered(Now, null, 47.61m, -122.33m);
        Assert.Equal(DeliveryStatus.Delivered, delivery.Status);
    }

    [Fact]
    public void ResolvedDelivery_IsImmutable()
    {
        var delivery = Create();
        delivery.MarkDelivered(Now, null, 47.61m, -122.33m);

        Assert.Throws<DomainException>(() => delivery.MarkDelivered(Now, null, 0, 0));
        Assert.Throws<DomainException>(() => delivery.MarkFailed(Now, FailReason.Other, null, 0, 0));
    }

    [Fact]
    public void Fail_RecordsReasonAndPosition()
    {
        var delivery = Create();
        delivery.MarkFailed(Now, FailReason.CustomerAbsent, "no answer", 47.6m, -122.3m);

        Assert.Equal(DeliveryStatus.Failed, delivery.Status);
        Assert.Equal(FailReason.CustomerAbsent, delivery.FailReason);
        Assert.Equal("no answer", delivery.FailNote);
    }

    [Fact]
    public void IsLate_OnlyForPendingPastWindow()
    {
        var late = new Delivery
        {
            RouteId = Guid.NewGuid(), Sequence = 1, PackageCode = "P1", CustomerName = "x", Address = "x",
            Lat = 0, Lng = 0, WindowEndUtc = Now.AddMinutes(-10)
        };
        Assert.True(late.IsLate(Now));

        late.MarkDelivered(Now, null, 0, 0);
        Assert.False(late.IsLate(Now));
    }
}

public class RouteTests
{
    private static Route CreateWithDeliveries(int count)
    {
        var route = new Route
        {
            CourierProfileId = Guid.NewGuid(), RouteCode = "R-07",
            Date = new DateOnly(2026, 6, 12), StartLat = 47.6m, StartLng = -122.3m
        };
        for (var i = 1; i <= count; i++)
            route.Deliveries.Add(new Delivery
            {
                RouteId = route.Id, Sequence = i, PackageCode = $"P{i}",
                CustomerName = "x", Address = "x", Lat = 0, Lng = 0
            });
        return route;
    }

    [Fact]
    public void RefreshStatus_ActivatesOnFirstResolution_CompletesWhenAllResolved()
    {
        var route = CreateWithDeliveries(2);
        Assert.Equal(RouteStatus.Planned, route.Status);

        var deliveries = route.Deliveries.ToList();
        deliveries[0].MarkDelivered(DateTime.UtcNow, null, 0, 0);
        route.RefreshStatus();
        Assert.Equal(RouteStatus.Active, route.Status);
        Assert.Equal(1, route.CompletedCount);

        deliveries[1].MarkFailed(DateTime.UtcNow, FailReason.Rejected, null, 0, 0);
        route.RefreshStatus();
        Assert.Equal(RouteStatus.Completed, route.Status);
    }
}

public class GeoMathTests
{
    [Fact]
    public void Haversine_SeattleToBellevue_About10Km()
    {
        // Downtown Seattle → Bellevue is ~10 km as the crow flies.
        var km = GeoMath.HaversineKm(47.6062, -122.3321, 47.6101, -122.2015);
        Assert.InRange(km, 9, 11);
    }

    [Fact]
    public void Haversine_SamePoint_Zero()
    {
        Assert.Equal(0, GeoMath.HaversineKm(47.6, -122.3, 47.6, -122.3), 5);
    }

    [Fact]
    public void Eta_ScalesWithDistance()
    {
        Assert.True(GeoMath.EtaMinutes(14) > GeoMath.EtaMinutes(7));
        Assert.Equal(0, GeoMath.EtaMinutes(0));
    }

    [Fact]
    public void Heading_EastIs90()
    {
        var heading = GeoMath.HeadingDegrees(47.6, -122.3, 47.6, -122.2);
        Assert.InRange(heading, 85, 95);
    }
}

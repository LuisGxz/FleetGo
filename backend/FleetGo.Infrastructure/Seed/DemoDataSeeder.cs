using FleetGo.Application.Common;
using FleetGo.Domain.Entities;
using FleetGo.Domain.Enums;
using FleetGo.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FleetGo.Infrastructure.Seed;

/// <summary>
/// Demo fleet in Seattle: 6 units with today's routes (~10 stops each, real coordinates around
/// downtown/Capitol Hill/Ballard), mockup names included (UNIT-07 Luis C., Rachel Donovan…).
/// Today's routes regenerate each day on startup so the demo never shows a stale empty day.
/// Demo logins: courier@fleetgo.dev (UNIT-07) · dispatch@fleetgo.dev / Demo1234!
/// </summary>
public class DemoDataSeeder(FleetGoDbContext db, IPasswordHasherService hasher, IClock clock, ILogger<DemoDataSeeder> logger)
{
    private const string DemoPassword = "Demo1234!";
    private readonly Random _rng = new(20260612);

    // Downtown Seattle depot
    private const decimal DepotLat = 47.6090m;
    private const decimal DepotLng = -122.3380m;

    public async Task SeedAsync(CancellationToken ct = default)
    {
        var passwordHash = hasher.Hash(DemoPassword);
        var today = DateOnly.FromDateTime(clock.UtcNow);

        if (!await db.Users.AnyAsync(ct))
        {
            var couriers = new (string Unit, string Name, string Email, string Vehicle)[]
            {
                ("UNIT-07", "Luis C.", "courier@fleetgo.dev", "Van"),
                ("UNIT-03", "Amara D.", "amara@fleetgo.dev", "Van"),
                ("UNIT-11", "Pete S.", "pete@fleetgo.dev", "Truck"),
                ("UNIT-05", "Keiko T.", "keiko@fleetgo.dev", "Van"),
                ("UNIT-09", "Omar F.", "omar@fleetgo.dev", "Bike"),
                ("UNIT-02", "Sofia R.", "sofia@fleetgo.dev", "Van")
            };
            foreach (var (unit, name, email, vehicle) in couriers)
            {
                var user = new User { Email = email, FullName = name, PasswordHash = passwordHash, Role = UserRole.Courier };
                db.Users.Add(user);
                db.CourierProfiles.Add(new CourierProfile { UserId = user.Id, UnitCode = unit, VehicleType = vehicle });
            }
            db.Users.Add(new User { Email = "dispatch@fleetgo.dev", FullName = "Dana Park", PasswordHash = passwordHash, Role = UserRole.Coordinator });
            await db.SaveChangesAsync(ct);
            logger.LogInformation("Seeded fleet users.");
        }

        if (await db.Routes.AnyAsync(r => r.Date == today, ct))
        {
            logger.LogInformation("Today's routes already exist; seed skipped.");
            return;
        }

        var customers = new (string Name, string Addr)[]
        {
            ("Rachel Donovan", "1847 Linden Ave, Apt 3B"), ("Marcus Webb", "622 Foster St"),
            ("Hannah Liu", "90 Crescent Blvd"), ("Front Porch Café", "415 7th Ave"),
            ("Diego Martín", "77 Wallace Rd"), ("Nina Petrova", "208 Pine St"),
            ("Cedar & Co.", "1120 Broadway E"), ("Tom Okafor", "55 Mercer St"),
            ("Lily Tran", "933 Queen Anne Ave N"), ("Bookworks", "4214 Fremont Ave N"),
            ("Sam Castillo", "612 Bell St"), ("Aiko Mori", "1501 Western Ave"),
            ("Harbor Supplies", "2203 Alaskan Way"), ("Eva Lindqvist", "318 15th Ave E"),
            ("Greenleaf Market", "5012 Ballard Ave NW"), ("Noor Haddad", "801 Union St")
        };

        var profiles = await db.CourierProfiles.ToListAsync(ct);
        var routeNumber = 1;
        var baseTime = clock.UtcNow.Date.AddHours(15); // delivery windows this afternoon/evening UTC

        // PackageCode is globally unique, but the deterministic RNG would regenerate identical
        // codes every day — colliding with prior days' deliveries. Start above the highest
        // existing code so the daily route regeneration never hits the unique index.
        var existingCodes = await db.Deliveries.Select(d => d.PackageCode).ToListAsync(ct);
        var pkg = existingCodes
            .Select(code => int.TryParse(code.AsSpan(4), out var n) ? n : 0) // "PKG-88630" → 88630
            .Append(88350)
            .Max();

        foreach (var profile in profiles)
        {
            var route = new Route
            {
                CourierProfileId = profile.Id,
                RouteCode = $"R-{routeNumber++:00}",
                Date = today,
                StartLat = DepotLat,
                StartLng = DepotLng
            };
            db.Routes.Add(route);

            var stops = 8 + _rng.Next(4);
            for (var seq = 1; seq <= stops; seq++)
            {
                var customer = customers[_rng.Next(customers.Length)];
                // Scatter stops ~±4.5 km around the depot (real Seattle streets ballpark).
                var delivery = new Delivery
                {
                    RouteId = route.Id,
                    Sequence = seq,
                    PackageCode = $"PKG-{pkg += 1 + _rng.Next(9)}",
                    CustomerName = customer.Name,
                    Address = customer.Addr,
                    Lat = DepotLat + (decimal)((_rng.NextDouble() - 0.5) * 0.08),
                    Lng = DepotLng + (decimal)((_rng.NextDouble() - 0.5) * 0.11),
                    WindowEndUtc = baseTime.AddMinutes(30 * seq + _rng.Next(40)),
                    Parcels = 1 + _rng.Next(3),
                    SignatureRequired = _rng.Next(10) < 4
                };
                db.Deliveries.Add(delivery);
            }
        }

        await db.SaveChangesAsync(ct);
        logger.LogInformation("Seeded today's routes for {Count} units.", profiles.Count);
    }
}

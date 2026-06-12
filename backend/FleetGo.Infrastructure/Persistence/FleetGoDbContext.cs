using FleetGo.Application.Common;
using FleetGo.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FleetGo.Infrastructure.Persistence;

public class FleetGoDbContext(DbContextOptions<FleetGoDbContext> options) : DbContext(options), IAppDbContext
{
    public DbSet<User> Users => Set<User>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    public DbSet<CourierProfile> CourierProfiles => Set<CourierProfile>();
    public DbSet<Route> Routes => Set<Route>();
    public DbSet<Delivery> Deliveries => Set<Delivery>();
    public DbSet<DeliveryEvent> DeliveryEvents => Set<DeliveryEvent>();

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        // DeliveryEvent is append-only: reject any tracked modification or deletion.
        var tampered = ChangeTracker.Entries<DeliveryEvent>()
            .Any(e => e.State is EntityState.Modified or EntityState.Deleted);
        if (tampered)
            throw new InvalidOperationException("DeliveryEvent entries are append-only.");

        return base.SaveChangesAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<User>(b =>
        {
            b.Property(u => u.Email).HasMaxLength(256).IsRequired();
            b.HasIndex(u => u.Email).IsUnique();
            b.Property(u => u.FullName).HasMaxLength(150).IsRequired();
            b.Property(u => u.PasswordHash).HasMaxLength(500).IsRequired();
            b.Property(u => u.Role).HasConversion<string>().HasMaxLength(20);
            b.HasOne(u => u.CourierProfile)
                .WithOne(c => c!.User!)
                .HasForeignKey<CourierProfile>(c => c.UserId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RefreshToken>(b =>
        {
            b.Property(t => t.TokenHash).HasMaxLength(128).IsRequired();
            b.HasIndex(t => t.TokenHash).IsUnique();
            b.Property(t => t.ReplacedByTokenHash).HasMaxLength(128);
            b.HasOne(t => t.User).WithMany(u => u.RefreshTokens).HasForeignKey(t => t.UserId);
        });

        modelBuilder.Entity<CourierProfile>(b =>
        {
            b.Property(c => c.UnitCode).HasMaxLength(20).IsRequired();
            b.HasIndex(c => c.UnitCode).IsUnique();
            b.Property(c => c.VehicleType).HasMaxLength(30);
        });

        modelBuilder.Entity<Route>(b =>
        {
            b.Property(r => r.RouteCode).HasMaxLength(20).IsRequired();
            b.Property(r => r.Status).HasConversion<string>().HasMaxLength(20);
            b.Property(r => r.StartLat).HasPrecision(9, 6);
            b.Property(r => r.StartLng).HasPrecision(9, 6);
            b.HasIndex(r => new { r.CourierProfileId, r.Date }).IsUnique();
            b.HasOne(r => r.Courier).WithMany(c => c.Routes).HasForeignKey(r => r.CourierProfileId);
        });

        modelBuilder.Entity<Delivery>(b =>
        {
            b.Property(d => d.PackageCode).HasMaxLength(20).IsRequired();
            b.HasIndex(d => d.PackageCode).IsUnique();
            b.Property(d => d.CustomerName).HasMaxLength(150).IsRequired();
            b.Property(d => d.Address).HasMaxLength(300).IsRequired();
            b.Property(d => d.Status).HasConversion<string>().HasMaxLength(20);
            b.Property(d => d.FailReason).HasConversion<string>().HasMaxLength(30);
            b.Property(d => d.FailNote).HasMaxLength(300);
            b.Property(d => d.Lat).HasPrecision(9, 6);
            b.Property(d => d.Lng).HasPrecision(9, 6);
            b.Property(d => d.ResolvedLat).HasPrecision(9, 6);
            b.Property(d => d.ResolvedLng).HasPrecision(9, 6);
            b.HasIndex(d => new { d.RouteId, d.Sequence });
            b.HasOne(d => d.Route).WithMany(r => r.Deliveries).HasForeignKey(d => d.RouteId);
        });

        modelBuilder.Entity<DeliveryEvent>(b =>
        {
            b.Property(e => e.Id).ValueGeneratedOnAdd();
            b.Property(e => e.FromStatus).HasConversion<string>().HasMaxLength(20);
            b.Property(e => e.ToStatus).HasConversion<string>().HasMaxLength(20);
            b.Property(e => e.Note).HasMaxLength(400);
            b.Property(e => e.Lat).HasPrecision(9, 6);
            b.Property(e => e.Lng).HasPrecision(9, 6);
            b.HasIndex(e => new { e.DeliveryId, e.OccurredAtUtc });
        });
    }
}

/// <summary>Used only by `dotnet ef` at design time; never at runtime.</summary>
public class DesignTimeDbContextFactory : Microsoft.EntityFrameworkCore.Design.IDesignTimeDbContextFactory<FleetGoDbContext>
{
    public FleetGoDbContext CreateDbContext(string[] args) =>
        new(new DbContextOptionsBuilder<FleetGoDbContext>()
            .UseSqlServer("Server=localhost;Database=FleetGo;Trusted_Connection=True;TrustServerCertificate=True;")
            .Options);
}

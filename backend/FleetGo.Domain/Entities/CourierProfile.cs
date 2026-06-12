namespace FleetGo.Domain.Entities;

public class CourierProfile
{
    public Guid Id { get; init; } = Guid.NewGuid();
    public required Guid UserId { get; init; }
    public required string UnitCode { get; init; }
    public string VehicleType { get; set; } = "Van";
    public bool IsActive { get; set; } = true;

    public User? User { get; init; }
    public ICollection<Route> Routes { get; init; } = [];
}

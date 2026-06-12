namespace FleetGo.Domain.Enums;

public enum UserRole
{
    Courier,
    Coordinator
}

public enum RouteStatus
{
    Planned,
    Active,
    Completed
}

public enum DeliveryStatus
{
    Pending,
    Delivered,
    Failed
}

public enum FailReason
{
    CustomerAbsent,
    WrongAddress,
    Rejected,
    Other
}

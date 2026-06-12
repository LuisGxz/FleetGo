using FleetGo.Application.Common;
using FleetGo.Application.Routes;
using FleetGo.Domain.Entities;
using FleetGo.Domain.Enums;
using FluentValidation;
using Microsoft.EntityFrameworkCore;

namespace FleetGo.Application.Deliveries;

public record DeliverRequest(string? SignaturePng, decimal Lat, decimal Lng);
public record FailRequest(string Reason, string? Note, decimal Lat, decimal Lng);

public class DeliverValidator : AbstractValidator<DeliverRequest>
{
    public DeliverValidator()
    {
        RuleFor(x => x.Lat).InclusiveBetween(-90, 90);
        RuleFor(x => x.Lng).InclusiveBetween(-180, 180);
        // Data-URL PNG from the signature canvas; cap size to keep rows sane (~200 KB).
        RuleFor(x => x.SignaturePng)
            .Must(s => s is null || (s.StartsWith("data:image/png;base64,") && s.Length < 280_000))
            .WithMessage("Signature must be a PNG data URL under 200 KB.");
    }
}

public class FailValidator : AbstractValidator<FailRequest>
{
    public FailValidator()
    {
        RuleFor(x => x.Reason)
            .Must(r => Enum.TryParse<FailReason>(r, true, out _))
            .WithMessage($"Reason must be one of: {string.Join(", ", Enum.GetNames<FailReason>())}.");
        RuleFor(x => x.Note).MaximumLength(300);
        RuleFor(x => x.Lat).InclusiveBetween(-90, 90);
        RuleFor(x => x.Lng).InclusiveBetween(-180, 180);
    }
}

public class DeliveryService(
    IAppDbContext db,
    IClock clock,
    ITrackingNotifier notifier,
    IValidator<DeliverRequest> deliverValidator,
    IValidator<FailRequest> failValidator)
{
    public async Task<DeliveryDto> DeliverAsync(Actor actor, Guid deliveryId, DeliverRequest request, CancellationToken ct = default)
    {
        await deliverValidator.ValidateAndThrowAsync(request, ct);
        var (delivery, route) = await LoadOwnedAsync(actor, deliveryId, ct);

        delivery.MarkDelivered(clock.UtcNow, request.SignaturePng, request.Lat, request.Lng);
        AppendEvent(delivery, actor, DeliveryStatus.Delivered, null, request.Lat, request.Lng);
        route.RefreshStatus();
        await db.SaveChangesAsync(ct);

        await notifier.DeliveryUpdatedAsync(delivery.Id, route.Id, route.Courier?.UnitCode ?? "", delivery.Status.ToString(), ct);
        return DeliveryDto.From(delivery);
    }

    public async Task<DeliveryDto> FailAsync(Actor actor, Guid deliveryId, FailRequest request, CancellationToken ct = default)
    {
        await failValidator.ValidateAndThrowAsync(request, ct);
        var (delivery, route) = await LoadOwnedAsync(actor, deliveryId, ct);

        var reason = Enum.Parse<FailReason>(request.Reason, true);
        delivery.MarkFailed(clock.UtcNow, reason, request.Note, request.Lat, request.Lng);
        AppendEvent(delivery, actor, DeliveryStatus.Failed, $"{reason}: {request.Note}", request.Lat, request.Lng);
        route.RefreshStatus();
        await db.SaveChangesAsync(ct);

        await notifier.DeliveryUpdatedAsync(delivery.Id, route.Id, route.Courier?.UnitCode ?? "", delivery.Status.ToString(), ct);
        return DeliveryDto.From(delivery);
    }

    /// <summary>Couriers can only resolve stops on their own route; coordinators never resolve in the field.</summary>
    private async Task<(Delivery Delivery, Route Route)> LoadOwnedAsync(Actor actor, Guid deliveryId, CancellationToken ct)
    {
        if (actor.Role != UserRole.Courier || actor.CourierProfileId is null)
            throw new ForbiddenException("Only couriers resolve deliveries.");

        var delivery = await db.Deliveries
            .Include(d => d.Route!).ThenInclude(r => r.Deliveries)
            .Include(d => d.Route!).ThenInclude(r => r.Courier)
            .FirstOrDefaultAsync(d => d.Id == deliveryId, ct)
            ?? throw new NotFoundException("Delivery not found.");

        if (delivery.Route!.CourierProfileId != actor.CourierProfileId)
            throw new ForbiddenException("This delivery belongs to another courier's route.");

        return (delivery, delivery.Route!);
    }

    private void AppendEvent(Delivery delivery, Actor actor, DeliveryStatus to, string? note, decimal lat, decimal lng) =>
        db.DeliveryEvents.Add(new DeliveryEvent
        {
            DeliveryId = delivery.Id,
            UserId = actor.UserId,
            FromStatus = DeliveryStatus.Pending,
            ToStatus = to,
            Lat = lat,
            Lng = lng,
            Note = note,
            OccurredAtUtc = clock.UtcNow
        });
}

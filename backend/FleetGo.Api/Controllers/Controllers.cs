using FleetGo.Api.Infrastructure;
using FleetGo.Application.Auth;
using FleetGo.Application.Common;
using FleetGo.Application.Deliveries;
using FleetGo.Application.Dispatch;
using FleetGo.Application.Routes;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace FleetGo.Api.Controllers;

[ApiController]
[Route("api/v1/auth")]
[EnableRateLimiting("auth")]
public class AuthController(AuthService auth) : ControllerBase
{
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct) =>
        Ok(await auth.LoginAsync(request, ct));

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request, CancellationToken ct) =>
        Ok(await auth.RefreshAsync(request, ct));

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshRequest request, CancellationToken ct)
    {
        await auth.LogoutAsync(request, ct);
        return NoContent();
    }
}

[ApiController]
[Route("api/v1/me")]
[Authorize]
public class MeController(ActorResolver actorResolver) : ControllerBase
{
    [HttpGet]
    public async Task<ActionResult<object>> Get(CancellationToken ct)
    {
        var actor = await actorResolver.ResolveAsync(User, ct);
        return Ok(new { actor.UserId, Role = actor.Role.ToString(), actor.UnitCode });
    }
}

[ApiController]
[Route("api/v1/routes")]
[Authorize]
public class RoutesController(RouteService routes, ActorResolver actorResolver) : ControllerBase
{
    [HttpGet("today")]
    public async Task<ActionResult<RouteDto?>> Today(CancellationToken ct)
    {
        var actor = await actorResolver.ResolveAsync(User, ct);
        return Ok(await routes.TodayForCourierAsync(actor, ct));
    }

    [HttpGet]
    public async Task<ActionResult<PagedResult<RouteSummaryDto>>> List(
        [FromQuery] DateOnly? date, [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var actor = await actorResolver.ResolveAsync(User, ct);
        return Ok(await routes.ListAsync(actor, date, page, pageSize, ct));
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RouteDto>> Get(Guid id, CancellationToken ct)
    {
        var actor = await actorResolver.ResolveAsync(User, ct);
        return Ok(await routes.GetAsync(actor, id, ct));
    }
}

[ApiController]
[Route("api/v1/deliveries")]
[Authorize(Roles = "Courier")]
public class DeliveriesController(DeliveryService deliveries, ActorResolver actorResolver) : ControllerBase
{
    [HttpPatch("{id:guid}/deliver")]
    public async Task<ActionResult<DeliveryDto>> Deliver(Guid id, DeliverRequest request, CancellationToken ct)
    {
        var actor = await actorResolver.ResolveAsync(User, ct);
        return Ok(await deliveries.DeliverAsync(actor, id, request, ct));
    }

    [HttpPatch("{id:guid}/fail")]
    public async Task<ActionResult<DeliveryDto>> Fail(Guid id, FailRequest request, CancellationToken ct)
    {
        var actor = await actorResolver.ResolveAsync(User, ct);
        return Ok(await deliveries.FailAsync(actor, id, request, ct));
    }
}

public record PositionPing(decimal Lat, decimal Lng, double Heading);

[ApiController]
[Route("api/v1/positions")]
[Authorize(Roles = "Courier")]
public class PositionsController(IPositionStore positions, ITrackingNotifier notifier, IClock clock, ActorResolver actorResolver) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Ping(PositionPing ping, CancellationToken ct)
    {
        var actor = await actorResolver.ResolveAsync(User, ct);
        if (actor.UnitCode is null)
            return NoContent();

        var position = new UnitPosition(actor.UnitCode, ping.Lat, ping.Lng, ping.Heading, clock.UtcNow);
        positions.Set(position);
        await notifier.UnitMovedAsync(position, ct);
        return NoContent();
    }
}

[ApiController]
[Route("api/v1/dispatch")]
[Authorize(Roles = "Coordinator")]
public class DispatchController(DispatchService dispatch, ActorResolver actorResolver) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<ActionResult<DispatchSummaryDto>> Summary(CancellationToken ct)
    {
        var actor = await actorResolver.ResolveAsync(User, ct);
        return Ok(await dispatch.SummaryAsync(actor, ct));
    }

    [HttpGet("units")]
    public async Task<ActionResult<List<UnitStatusDto>>> Units(CancellationToken ct)
    {
        var actor = await actorResolver.ResolveAsync(User, ct);
        return Ok(await dispatch.UnitsAsync(actor, ct));
    }
}

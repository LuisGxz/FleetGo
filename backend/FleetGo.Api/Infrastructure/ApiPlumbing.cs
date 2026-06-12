using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FleetGo.Application.Common;
using FleetGo.Application.Routes;
using FleetGo.Domain.Exceptions;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace FleetGo.Api.Infrastructure;

/// <summary>Resolves the authenticated principal into an Actor (scoped per request, cached).</summary>
public class ActorResolver(IAppDbContext db)
{
    private Actor? _cached;

    public async Task<Actor> ResolveAsync(ClaimsPrincipal principal, CancellationToken ct = default)
    {
        if (_cached is not null)
            return _cached;

        var sub = principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
                  ?? principal.FindFirstValue(ClaimTypes.NameIdentifier)
                  ?? throw new UnauthorizedException("Missing subject claim.");
        var userId = Guid.Parse(sub);

        var user = await db.Users
            .Include(u => u.CourierProfile)
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new UnauthorizedException("User no longer exists.");

        _cached = new Actor(user.Id, user.Role, user.CourierProfile?.Id, user.CourierProfile?.UnitCode);
        return _cached;
    }
}

/// <summary>Maps application/domain exceptions to RFC 7807 ProblemDetails responses.</summary>
public class GlobalExceptionHandler(IProblemDetailsService problemDetailsService, ILogger<GlobalExceptionHandler> logger)
    : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        var problem = exception switch
        {
            ValidationException ex => new ProblemDetails
            {
                Status = StatusCodes.Status400BadRequest,
                Title = "Validation failed",
                Extensions =
                {
                    ["errors"] = ex.Errors
                        .GroupBy(e => e.PropertyName)
                        .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray())
                }
            },
            UnauthorizedException ex => new ProblemDetails { Status = StatusCodes.Status401Unauthorized, Title = "Unauthorized", Detail = ex.Message },
            ForbiddenException ex => new ProblemDetails { Status = StatusCodes.Status403Forbidden, Title = "Forbidden", Detail = ex.Message },
            NotFoundException ex => new ProblemDetails { Status = StatusCodes.Status404NotFound, Title = "Not found", Detail = ex.Message },
            ConflictException ex => new ProblemDetails { Status = StatusCodes.Status409Conflict, Title = "Conflict", Detail = ex.Message },
            DomainException ex => new ProblemDetails { Status = StatusCodes.Status422UnprocessableEntity, Title = "Business rule violated", Detail = ex.Message },
            _ => null
        };

        if (problem is null)
        {
            logger.LogError(exception, "Unhandled exception");
            problem = new ProblemDetails { Status = StatusCodes.Status500InternalServerError, Title = "An unexpected error occurred" };
        }

        httpContext.Response.StatusCode = problem.Status!.Value;
        return await problemDetailsService.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = problem,
            Exception = exception
        });
    }
}

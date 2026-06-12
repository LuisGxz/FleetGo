using FleetGo.Application.Common;
using FleetGo.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FleetGo.Application.Auth;

public record LoginRequest(string Email, string Password);
public record RefreshRequest(string RefreshToken);

public record UserDto(Guid Id, string Email, string FullName, string Role, string? UnitCode)
{
    public static UserDto From(User user) =>
        new(user.Id, user.Email, user.FullName, user.Role.ToString(), user.CourierProfile?.UnitCode);
}

public record AuthResponse(string AccessToken, string RefreshToken, int ExpiresInSeconds, UserDto User);

/// <summary>No self-service registration: fleet users are provisioned by operations (seed/admin).</summary>
public class AuthService(IAppDbContext db, IPasswordHasherService hasher, IJwtTokenService jwt, IClock clock)
{
    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var normalized = request.Email.Trim().ToLowerInvariant();
        var user = await db.Users
            .Include(u => u.CourierProfile)
            .FirstOrDefaultAsync(u => u.Email == normalized, ct);

        // Same error for unknown email and wrong password: do not leak which accounts exist.
        if (user is null)
            throw new UnauthorizedException("Invalid email or password.");

        if (user.IsLockedOut(clock.UtcNow))
            throw new UnauthorizedException("Account temporarily locked. Try again later.");

        if (!hasher.Verify(user.PasswordHash, request.Password))
        {
            user.RegisterFailedLogin(clock.UtcNow);
            await db.SaveChangesAsync(ct);
            throw new UnauthorizedException("Invalid email or password.");
        }

        user.RegisterSuccessfulLogin();
        var response = Issue(user);
        await db.SaveChangesAsync(ct);
        return response;
    }

    public async Task<AuthResponse> RefreshAsync(RefreshRequest request, CancellationToken ct = default)
    {
        var hash = jwt.HashRefreshToken(request.RefreshToken);
        var stored = await db.RefreshTokens
            .Include(t => t.User!).ThenInclude(u => u.CourierProfile)
            .FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (stored?.User is null || !stored.IsActive(clock.UtcNow))
            throw new UnauthorizedException("Invalid or expired refresh token.");

        var response = Issue(stored.User);
        stored.Revoke(clock.UtcNow, replacedByTokenHash: jwt.HashRefreshToken(response.RefreshToken));
        await db.SaveChangesAsync(ct);
        return response;
    }

    public async Task LogoutAsync(RefreshRequest request, CancellationToken ct = default)
    {
        var hash = jwt.HashRefreshToken(request.RefreshToken);
        var stored = await db.RefreshTokens.FirstOrDefaultAsync(t => t.TokenHash == hash, ct);

        if (stored is not null && stored.IsActive(clock.UtcNow))
        {
            stored.Revoke(clock.UtcNow);
            await db.SaveChangesAsync(ct);
        }
        // Unknown/already-revoked tokens are a no-op: logout must be idempotent.
    }

    private AuthResponse Issue(User user)
    {
        var (accessToken, expiresIn) = jwt.CreateAccessToken(user);
        var (rawRefresh, refreshHash) = jwt.CreateRefreshToken();

        db.RefreshTokens.Add(new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshHash,
            ExpiresAtUtc = clock.UtcNow.Add(jwt.RefreshTokenLifetime)
        });

        return new AuthResponse(accessToken, rawRefresh, expiresIn, UserDto.From(user));
    }
}

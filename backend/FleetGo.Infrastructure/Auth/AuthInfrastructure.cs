using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using FleetGo.Application.Common;
using FleetGo.Domain.Entities;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace FleetGo.Infrastructure.Auth;

public class JwtOptions
{
    public const string SectionName = "Jwt";

    public required string Secret { get; init; }
    public string Issuer { get; init; } = "FleetGo";
    public string Audience { get; init; } = "FleetGo";
    public int AccessTokenMinutes { get; init; } = 15;
    public int RefreshTokenDays { get; init; } = 7;
}

public class JwtTokenService(IOptions<JwtOptions> options) : IJwtTokenService
{
    private readonly JwtOptions _options = options.Value;

    public TimeSpan RefreshTokenLifetime => TimeSpan.FromDays(_options.RefreshTokenDays);

    public (string AccessToken, int ExpiresInSeconds) CreateAccessToken(User user)
    {
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Name, user.FullName),
            new(ClaimTypes.Role, user.Role.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.Secret));
        var lifetime = TimeSpan.FromMinutes(_options.AccessTokenMinutes);

        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            expires: DateTime.UtcNow.Add(lifetime),
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return (new JwtSecurityTokenHandler().WriteToken(token), (int)lifetime.TotalSeconds);
    }

    public (string RawToken, string TokenHash) CreateRefreshToken()
    {
        var raw = Convert.ToBase64String(RandomNumberGenerator.GetBytes(64));
        return (raw, HashRefreshToken(raw));
    }

    public string HashRefreshToken(string rawToken) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(rawToken)));
}

/// <summary>Wraps ASP.NET Identity's PasswordHasher (PBKDF2, versioned format).</summary>
public class PasswordHasherService : IPasswordHasherService
{
    private static readonly PasswordHasher<User> Hasher = new();
    private static readonly User Dummy = new() { Email = "_", FullName = "_", PasswordHash = "_" };

    public string Hash(string password) => Hasher.HashPassword(Dummy, password);

    public bool Verify(string hash, string password) =>
        Hasher.VerifyHashedPassword(Dummy, hash, password) is not PasswordVerificationResult.Failed;
}

public class Clock : IClock
{
    public DateTime UtcNow => DateTime.UtcNow;
}

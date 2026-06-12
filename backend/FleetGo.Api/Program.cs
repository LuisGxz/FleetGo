using System.Text;
using System.Threading.RateLimiting;
using FleetGo.Api.Infrastructure;
using FleetGo.Application.Auth;
using FleetGo.Application.Deliveries;
using FleetGo.Application.Dispatch;
using FleetGo.Application.Routes;
using FleetGo.Infrastructure;
using FleetGo.Infrastructure.Auth;
using FleetGo.Infrastructure.Tracking;
using FluentValidation;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Serilog;

Log.Logger = new LoggerConfiguration().WriteTo.Console().CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((context, config) => config
        .ReadFrom.Configuration(context.Configuration)
        .Enrich.FromLogContext()
        .WriteTo.Console());

    builder.Services.AddInfrastructure(builder.Configuration);
    builder.Services.AddValidatorsFromAssemblyContaining<AuthService>(includeInternalTypes: true);
    builder.Services.AddScoped<AuthService>();
    builder.Services.AddScoped<RouteService>();
    builder.Services.AddScoped<DeliveryService>();
    builder.Services.AddScoped<DispatchService>();
    builder.Services.AddScoped<ActorResolver>();
    builder.Services.AddControllers();
    builder.Services.AddSignalR();

    var jwt = builder.Configuration.GetSection(JwtOptions.SectionName).Get<JwtOptions>()
        ?? throw new InvalidOperationException("Jwt section is not configured.");

    builder.Services
        .AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
        .AddJwtBearer(options =>
        {
            options.TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidIssuer = jwt.Issuer,
                ValidateAudience = true,
                ValidAudience = jwt.Audience,
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
                ValidateLifetime = true,
                ClockSkew = TimeSpan.FromSeconds(30)
            };

            // SignalR (browser WebSocket) cannot send headers: accept the token via query string on the hub path.
            options.Events = new JwtBearerEvents
            {
                OnMessageReceived = context =>
                {
                    var accessToken = context.Request.Query["access_token"];
                    if (!string.IsNullOrEmpty(accessToken) && context.HttpContext.Request.Path.StartsWithSegments("/hubs"))
                        context.Token = accessToken;
                    return Task.CompletedTask;
                }
            };
        });
    builder.Services.AddAuthorization();

    builder.Services.AddRateLimiter(options =>
    {
        options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
        options.AddPolicy("auth", context => RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = 30, Window = TimeSpan.FromMinutes(1) }));
    });

    builder.Services.AddCors(options => options.AddPolicy("frontend", policy => policy
        .WithOrigins(builder.Configuration.GetSection("Cors:AllowedOrigins").Get<string[]>() ?? ["http://localhost:4200"])
        .AllowAnyHeader()
        .AllowAnyMethod()
        .AllowCredentials()));

    builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
    builder.Services.AddProblemDetails();
    builder.Services.AddHealthChecks();

    // Behind App Service the socket peer is the front-end gateway: honor X-Forwarded-For
    // so per-IP rate limiting partitions by the real client, not one shared bucket.
    builder.Services.Configure<Microsoft.AspNetCore.Builder.ForwardedHeadersOptions>(options =>
    {
        options.ForwardedHeaders = Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedFor
            | Microsoft.AspNetCore.HttpOverrides.ForwardedHeaders.XForwardedProto;
        options.KnownNetworks.Clear();
        options.KnownProxies.Clear();
    });

    var app = builder.Build();

    app.UseForwardedHeaders();
    app.UseExceptionHandler();
    app.UseSerilogRequestLogging();
    app.UseCors("frontend");
    app.UseRateLimiter();
    app.UseAuthentication();
    app.UseAuthorization();

    // Apply pending migrations on startup; seed demo fleet when enabled.
    using (var scope = app.Services.CreateScope())
    {
        var dbContext = scope.ServiceProvider.GetRequiredService<FleetGo.Infrastructure.Persistence.FleetGoDbContext>();
        await dbContext.Database.MigrateAsync();

        if (app.Environment.IsDevelopment() || app.Configuration.GetValue<bool>("SeedDemoData"))
            await scope.ServiceProvider.GetRequiredService<FleetGo.Infrastructure.Seed.DemoDataSeeder>().SeedAsync();
    }

    app.MapHealthChecks("/health");
    app.MapControllers();
    app.MapHub<TrackingHub>("/hubs/tracking");

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "FleetGo API terminated unexpectedly");
}
finally
{
    Log.CloseAndFlush();
}

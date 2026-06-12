using FleetGo.Application.Common;
using FleetGo.Infrastructure.Auth;
using FleetGo.Infrastructure.Persistence;
using FleetGo.Infrastructure.Tracking;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace FleetGo.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<FleetGoDbContext>(options =>
            options.UseSqlServer(
                configuration.GetConnectionString("Default"),
                sql => sql.EnableRetryOnFailure()));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<FleetGoDbContext>());

        services.Configure<JwtOptions>(configuration.GetSection(JwtOptions.SectionName));
        services.AddSingleton<IJwtTokenService, JwtTokenService>();
        services.AddSingleton<IPasswordHasherService, PasswordHasherService>();
        services.AddSingleton<IClock, Clock>();

        services.AddSingleton<IPositionStore, InMemoryPositionStore>();
        services.AddSingleton<ITrackingNotifier, SignalRTrackingNotifier>();
        services.AddHostedService<FleetSimulatorBackgroundService>();
        services.AddScoped<Seed.DemoDataSeeder>();

        return services;
    }
}

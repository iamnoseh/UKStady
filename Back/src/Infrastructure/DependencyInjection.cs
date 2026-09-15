using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using UKStady.Application.Common.Interfaces;
using UKStady.Infrastructure.Persistence;
using UKStady.Infrastructure.Services;

namespace UKStady.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection")
            ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString));

        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());
        services.AddSingleton<IDateTimeProvider, DateTimeProvider>();
        services.AddSingleton<ITimeZoneProvider, TimeZoneProvider>();

        return services;
    }
}

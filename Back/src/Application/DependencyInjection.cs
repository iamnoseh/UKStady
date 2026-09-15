using Microsoft.Extensions.DependencyInjection;
using UKStady.Application.Features.Administration;
using UKStady.Application.Features.Auth;

namespace UKStady.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddScoped<IAuthService, AuthService>();
        services.AddScoped<IAdministrationService, AdministrationService>();

        return services;
    }
}

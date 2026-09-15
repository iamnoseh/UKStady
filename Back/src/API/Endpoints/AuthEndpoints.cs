using Microsoft.AspNetCore.Mvc;
using UKStady.Application.Common.Interfaces;
using UKStady.Application.Features.Auth;

namespace UKStady.API.Endpoints;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/auth")
            .WithTags("Auth");

        group.MapPost("/login", async (
            [FromBody] LoginRequest request,
            IAuthService authService,
            CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(request.PhoneNumber) ||
                string.IsNullOrWhiteSpace(request.Password))
            {
                return Results.BadRequest(new { message = "PhoneNumber and Password are required." });
            }

            var result = await authService.LoginAsync(request, cancellationToken);

            return result is null
                ? Results.Unauthorized()
                : Results.Ok(result);
        })
        .AllowAnonymous()
        .WithName("Login");

        group.MapGet("/me", (ICurrentUserService currentUser) => Results.Ok(new
        {
            currentUser.UserId,
            currentUser.UserName,
            currentUser.Role
        }))
        .RequireAuthorization()
        .WithName("CurrentUser");

        return endpoints;
    }
}

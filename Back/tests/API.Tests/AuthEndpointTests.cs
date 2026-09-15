using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using UKStady.Application.Features.Auth;

namespace UKStady.API.Tests;

public sealed class AuthEndpointTests : IClassFixture<TestApiFactory>
{
    private readonly TestApiFactory _factory;

    public AuthEndpointTests(TestApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsAccessToken()
    {
        using var client = _factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("teacher", TestApiFactory.TestPassword));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<AuthResult>();
        Assert.NotNull(result);
        Assert.Equal("teacher", result.UserName);
        Assert.False(string.IsNullOrWhiteSpace(result.AccessToken));
    }

    [Fact]
    public async Task Login_WithSeededSuperAdmin_ReturnsAccessToken()
    {
        using var client = _factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("superadmin", "Admin123!"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<AuthResult>();
        Assert.NotNull(result);
        Assert.Equal("SuperAdmin", result.Role.ToString());
    }

    [Fact]
    public async Task Login_WithInvalidCredentials_ReturnsUnauthorized()
    {
        using var client = _factory.CreateClient();

        using var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("teacher", "wrong-password"));

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithoutToken_ReturnsUnauthorized()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Me_WithToken_ReturnsCurrentUser()
    {
        using var client = _factory.CreateClient();
        var login = await client.PostAsJsonAsync(
            "/api/auth/login",
            new LoginRequest("teacher@ukstady.local", TestApiFactory.TestPassword));
        var result = await login.Content.ReadFromJsonAsync<AuthResult>();

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", result?.AccessToken);

        using var response = await client.GetAsync("/api/auth/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}

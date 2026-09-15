using System.Net;
using Microsoft.AspNetCore.Mvc.Testing;

namespace UKStady.API.Tests;

public sealed class HealthEndpointTests : IClassFixture<TestApiFactory>
{
    private readonly TestApiFactory _factory;

    public HealthEndpointTests(TestApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Health_ReturnsOk()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task SwaggerJson_ReturnsOk()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/swagger/v1/swagger.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}

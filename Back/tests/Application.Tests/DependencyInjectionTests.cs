using Microsoft.Extensions.DependencyInjection;
using UKStady.Application;

namespace UKStady.Application.Tests;

public sealed class DependencyInjectionTests
{
    [Fact]
    public void AddApplication_ReturnsSameServiceCollection()
    {
        var services = new ServiceCollection();

        var result = services.AddApplication();

        Assert.Same(services, result);
    }
}


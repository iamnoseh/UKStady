using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using UKStady.Application.Common.Interfaces;
using UKStady.Domain.Entities;
using UKStady.Domain.Enums;
using UKStady.Infrastructure.Persistence;

namespace UKStady.API.Tests;

public sealed class TestApiFactory : WebApplicationFactory<Program>
{
    public const string TestPassword = "Teacher123!";
    private readonly string _databaseName = $"UKStadyTests-{Guid.NewGuid()}";
    private readonly InMemoryDatabaseRoot _databaseRoot = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<DbContextOptions>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.RemoveAll<IAppDbContext>();

            services.AddDbContext<AppDbContext>(options =>
                options.UseInMemoryDatabase(_databaseName, _databaseRoot));
            services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

            using var serviceProvider = services.BuildServiceProvider();
            using var scope = serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var passwordHasher = scope.ServiceProvider.GetRequiredService<IPasswordHasher>();

            dbContext.Database.EnsureDeleted();
            dbContext.Database.EnsureCreated();
            dbContext.Users.Add(new User
            {
                Id = Guid.Parse("22222222-2222-2222-2222-222222222222"),
                FirstName = "Test",
                LastName = "Teacher",
                PhoneNumber = "+992111111111",
                UserName = "teacher",
                Email = "teacher@ukstady.local",
                PasswordHash = passwordHasher.Hash(TestPassword),
                Role = UserRole.Teacher,
                IsActive = true
            });
            dbContext.SaveChanges();
        });
    }
}

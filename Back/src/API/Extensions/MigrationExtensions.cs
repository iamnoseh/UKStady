using Microsoft.EntityFrameworkCore;
using UKStady.Infrastructure.Persistence;

namespace UKStady.API.Extensions;

public static class MigrationExtensions
{
    public static async Task ApplyDatabaseMigrationsAsync(this WebApplication app)
    {
        var autoMigrate = app.Configuration.GetValue("Database:AutoMigrate", true);
        if (!autoMigrate)
        {
            return;
        }

        await using var scope = app.Services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        if (dbContext.Database.IsRelational())
        {
            await dbContext.Database.MigrateAsync();
        }
    }
}


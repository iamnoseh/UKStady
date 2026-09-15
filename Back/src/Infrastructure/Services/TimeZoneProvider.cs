using Microsoft.Extensions.Configuration;
using UKStady.Application.Common.Interfaces;

namespace UKStady.Infrastructure.Services;

public sealed class TimeZoneProvider : ITimeZoneProvider
{
    private const string DefaultTimeZoneId = "Asia/Dushanbe";

    public TimeZoneProvider(IConfiguration configuration)
    {
        var configuredTimeZone = configuration["BusinessTimeZone"] ?? DefaultTimeZoneId;
        BusinessTimeZone = ResolveTimeZone(configuredTimeZone);
    }

    public TimeZoneInfo BusinessTimeZone { get; }

    private static TimeZoneInfo ResolveTimeZone(string timeZoneId)
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
        }
        catch (TimeZoneNotFoundException) when (
            TimeZoneInfo.TryConvertIanaIdToWindowsId(timeZoneId, out var windowsTimeZoneId))
        {
            return TimeZoneInfo.FindSystemTimeZoneById(windowsTimeZoneId);
        }
    }
}

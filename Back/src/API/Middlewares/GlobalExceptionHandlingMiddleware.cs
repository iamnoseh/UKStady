using System.Net;
using UKStady.API.Common;

namespace UKStady.API.Middlewares;

public sealed class GlobalExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<GlobalExceptionHandlingMiddleware> _logger;

    public GlobalExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<GlobalExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception exception)
        {
            _logger.LogError(exception, "Unhandled API exception");
            await WriteErrorResponseAsync(context);
        }
    }

    private static async Task WriteErrorResponseAsync(HttpContext context)
    {
        var statusCode = (int)HttpStatusCode.InternalServerError;

        context.Response.StatusCode = statusCode;
        context.Response.ContentType = "application/json";

        var response = new ApiErrorResponse(
            Title: "Unexpected server error",
            Status: statusCode,
            TraceId: context.TraceIdentifier);

        await context.Response.WriteAsJsonAsync(response);
    }
}


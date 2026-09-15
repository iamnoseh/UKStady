namespace UKStady.API.Common;

public sealed record ApiErrorResponse(
    string Title,
    int Status,
    string TraceId,
    string? Detail = null);


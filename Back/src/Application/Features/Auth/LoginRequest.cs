namespace UKStady.Application.Features.Auth;

public sealed record LoginRequest(string UserNameOrEmail, string Password);


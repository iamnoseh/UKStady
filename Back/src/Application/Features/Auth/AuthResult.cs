using UKStady.Domain.Enums;

namespace UKStady.Application.Features.Auth;

public sealed record AuthResult(
    Guid UserId,
    string UserName,
    string Email,
    string FullName,
    UserRole Role,
    string AccessToken);


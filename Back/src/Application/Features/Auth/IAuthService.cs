namespace UKStady.Application.Features.Auth;

public interface IAuthService
{
    Task<AuthResult?> LoginAsync(LoginRequest request, CancellationToken cancellationToken);
}


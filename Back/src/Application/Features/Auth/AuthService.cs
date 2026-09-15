using Microsoft.EntityFrameworkCore;
using UKStady.Application.Common.Interfaces;

namespace UKStady.Application.Features.Auth;

public sealed class AuthService : IAuthService
{
    private readonly IAppDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenGenerator _jwtTokenGenerator;

    public AuthService(
        IAppDbContext dbContext,
        IPasswordHasher passwordHasher,
        IJwtTokenGenerator jwtTokenGenerator)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _jwtTokenGenerator = jwtTokenGenerator;
    }

    public async Task<AuthResult?> LoginAsync(LoginRequest request, CancellationToken cancellationToken)
    {
        var login = request.UserNameOrEmail.Trim();

        var user = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate =>
                candidate.IsActive &&
                (candidate.UserName == login || candidate.Email == login),
                cancellationToken);

        if (user is null || !_passwordHasher.Verify(request.Password, user.PasswordHash))
        {
            return null;
        }

        var fullName = string.Join(
            ' ',
            new[] { user.FirstName, user.MiddleName, user.LastName }
                .Where(part => !string.IsNullOrWhiteSpace(part)));

        return new AuthResult(
            user.Id,
            user.UserName,
            user.Email,
            fullName,
            user.Role,
            _jwtTokenGenerator.GenerateToken(user));
    }
}


using UKStady.Domain.Entities;

namespace UKStady.Application.Common.Interfaces;

public interface IJwtTokenGenerator
{
    string GenerateToken(User user);
}


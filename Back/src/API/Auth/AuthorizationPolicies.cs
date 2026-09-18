using Microsoft.AspNetCore.Authorization;
using UKStady.Domain.Enums;

namespace UKStady.API.Auth;

public static class AuthorizationPolicies
{
    public const string SuperAdmins = nameof(SuperAdmins);
    public const string Administrators = nameof(Administrators);
    public const string Managers = nameof(Managers);
    public const string Teachers = nameof(Teachers);
    public const string EducationStaff = nameof(EducationStaff);
    public const string Students = nameof(Students);

    public static void AddRolePolicies(this AuthorizationOptions options)
    {
        options.AddPolicy(SuperAdmins, policy =>
            policy.RequireRole(UserRole.SuperAdmin.ToString()));

        options.AddPolicy(Administrators, policy =>
            policy.RequireRole(UserRole.SuperAdmin.ToString(), UserRole.Admin.ToString()));

        options.AddPolicy(Managers, policy =>
            policy.RequireRole(
                UserRole.SuperAdmin.ToString(),
                UserRole.Admin.ToString(),
                UserRole.Manager.ToString()));

        options.AddPolicy(Teachers, policy =>
            policy.RequireRole(UserRole.Teacher.ToString()));

        options.AddPolicy(EducationStaff, policy =>
            policy.RequireRole(
                UserRole.SuperAdmin.ToString(),
                UserRole.Admin.ToString(),
                UserRole.Manager.ToString(),
                UserRole.Teacher.ToString()));

        options.AddPolicy(Students, policy =>
            policy.RequireRole(UserRole.Student.ToString()));
    }
}

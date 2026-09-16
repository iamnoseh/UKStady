using Microsoft.AspNetCore.Mvc;
using UKStady.API.Auth;
using UKStady.Application.Features.Administration;

namespace UKStady.API.Endpoints;

public static class AdministrationEndpoints
{
    public static IEndpointRouteBuilder MapAdministrationEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapUserEndpoints();
        endpoints.MapGroupEndpoints();
        endpoints.MapSubjectEndpoints();
        endpoints.MapTeacherSubjectEndpoints();
        endpoints.MapTeacherAssignmentEndpoints();
        endpoints.MapDashboardEndpoints();

        return endpoints;
    }

    private static void MapUserEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/users")
            .WithTags("Users")
            .RequireAuthorization(AuthorizationPolicies.Managers);

        group.MapGet("/", async (IAdministrationService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.GetUsersAsync(cancellationToken)))
            .WithName("GetUsers");

        group.MapGet("/{id:guid}", async (
            Guid id,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            var user = await service.GetUserAsync(id, cancellationToken);
            return user is null ? Results.NotFound() : Results.Ok(user);
        })
        .WithName("GetUser");

        group.MapPost("/", async (
            [FromBody] CreateUserRequest request,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            var validationError = ValidateCreateUser(request);
            if (validationError is not null)
            {
                return Results.BadRequest(new { message = validationError });
            }

            var user = await service.CreateUserAsync(request, cancellationToken);
            return Results.Created($"/api/users/{user.Id}", user);
        })
        .WithName("CreateUser");

        group.MapGet("/generated-password", (IAdministrationService service) =>
            Results.Ok(service.GenerateUserPassword()))
            .WithName("GenerateUserPassword");

        group.MapPut("/{id:guid}", async (
            Guid id,
            [FromBody] UpdateUserRequest request,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            var validationError = ValidateUpdateUser(request);
            if (validationError is not null)
            {
                return Results.BadRequest(new { message = validationError });
            }

            var user = await service.UpdateUserAsync(id, request, cancellationToken);
            return user is null ? Results.NotFound() : Results.Ok(user);
        })
        .WithName("UpdateUser");

        group.MapDelete("/{id:guid}", async (
            Guid id,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            var deactivated = await service.DeactivateUserAsync(id, cancellationToken);
            return deactivated ? Results.NoContent() : Results.NotFound();
        })
        .WithName("DeactivateUser");
    }

    private static void MapGroupEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/groups")
            .WithTags("Groups");

        group.MapGet("/", async (IAdministrationService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.GetGroupsAsync(cancellationToken)))
            .RequireAuthorization(AuthorizationPolicies.EducationStaff)
            .WithName("GetGroups");

        group.MapGet("/{id:guid}", async (
            Guid id,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            var result = await service.GetGroupAsync(id, cancellationToken);
            return result is null ? Results.NotFound() : Results.Ok(result);
        })
        .RequireAuthorization(AuthorizationPolicies.EducationStaff)
        .WithName("GetGroup");

        group.MapPost("/", async (
            [FromBody] CreateGroupRequest request,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Branch))
            {
                return Results.BadRequest(new { message = "Name and Branch are required." });
            }

            var result = await service.CreateGroupAsync(request, cancellationToken);
            return Results.Created($"/api/groups/{result.Id}", result);
        })
        .RequireAuthorization(AuthorizationPolicies.Managers)
        .WithName("CreateGroup");

        group.MapPut("/{id:guid}", async (
            Guid id,
            [FromBody] UpdateGroupRequest request,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name) || string.IsNullOrWhiteSpace(request.Branch))
            {
                return Results.BadRequest(new { message = "Name and Branch are required." });
            }

            var result = await service.UpdateGroupAsync(id, request, cancellationToken);
            return result is null ? Results.NotFound() : Results.Ok(result);
        })
        .RequireAuthorization(AuthorizationPolicies.Managers)
        .WithName("UpdateGroup");

        group.MapDelete("/{id:guid}", async (
            Guid id,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            var deactivated = await service.DeactivateGroupAsync(id, cancellationToken);
            return deactivated ? Results.NoContent() : Results.NotFound();
        })
        .RequireAuthorization(AuthorizationPolicies.Managers)
        .WithName("DeactivateGroup");

        group.MapPost("/{groupId:guid}/students/{studentId:guid}", async (
            Guid groupId,
            Guid studentId,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            var added = await service.AddStudentToGroupAsync(groupId, studentId, cancellationToken);
            return added ? Results.NoContent() : Results.NotFound();
        })
        .RequireAuthorization(AuthorizationPolicies.Managers)
        .WithName("AddStudentToGroup");

        group.MapDelete("/{groupId:guid}/students/{studentId:guid}", async (
            Guid groupId,
            Guid studentId,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            var removed = await service.RemoveStudentFromGroupAsync(groupId, studentId, cancellationToken);
            return removed ? Results.NoContent() : Results.NotFound();
        })
        .RequireAuthorization(AuthorizationPolicies.Managers)
        .WithName("RemoveStudentFromGroup");
    }

    private static void MapSubjectEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/subjects")
            .WithTags("Subjects")
            .RequireAuthorization(AuthorizationPolicies.Managers);

        group.MapGet("/", async (IAdministrationService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.GetSubjectsAsync(cancellationToken)))
            .WithName("GetSubjects");

        group.MapGet("/{id:guid}", async (
            Guid id,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            var result = await service.GetSubjectAsync(id, cancellationToken);
            return result is null ? Results.NotFound() : Results.Ok(result);
        })
        .WithName("GetSubject");

        group.MapPost("/", async (
            [FromBody] CreateSubjectRequest request,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Results.BadRequest(new { message = "Name is required." });
            }

            var result = await service.CreateSubjectAsync(request, cancellationToken);
            return Results.Created($"/api/subjects/{result.Id}", result);
        })
        .WithName("CreateSubject");

        group.MapPut("/{id:guid}", async (
            Guid id,
            [FromBody] UpdateSubjectRequest request,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(request.Name))
            {
                return Results.BadRequest(new { message = "Name is required." });
            }

            var result = await service.UpdateSubjectAsync(id, request, cancellationToken);
            return result is null ? Results.NotFound() : Results.Ok(result);
        })
        .WithName("UpdateSubject");

        group.MapDelete("/{id:guid}", async (
            Guid id,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            var deactivated = await service.DeactivateSubjectAsync(id, cancellationToken);
            return deactivated ? Results.NoContent() : Results.NotFound();
        })
        .WithName("DeactivateSubject");
    }

    private static void MapTeacherSubjectEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/teacher-subjects")
            .WithTags("Teacher Subjects")
            .RequireAuthorization(AuthorizationPolicies.Managers);

        group.MapGet("/", async (IAdministrationService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.GetTeacherSubjectsAsync(cancellationToken)))
            .WithName("GetTeacherSubjects");

        group.MapPost("/", async (
            [FromBody] AssignTeacherSubjectRequest request,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            var result = await service.AssignTeacherSubjectAsync(request, cancellationToken);
            return result is null ? Results.NotFound() : Results.Created("/api/teacher-subjects", result);
        })
        .WithName("AssignTeacherSubject");

        group.MapDelete("/{teacherId:guid}/{subjectId:guid}", async (
            Guid teacherId,
            Guid subjectId,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            var removed = await service.RemoveTeacherSubjectAsync(teacherId, subjectId, cancellationToken);
            return removed ? Results.NoContent() : Results.NotFound();
        })
        .WithName("RemoveTeacherSubject");
    }

    private static void MapTeacherAssignmentEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/teacher-assignments")
            .WithTags("Teacher Assignments")
            .RequireAuthorization(AuthorizationPolicies.Managers);

        group.MapGet("/", async (IAdministrationService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.GetTeacherAssignmentsAsync(cancellationToken)))
            .WithName("GetTeacherAssignments");

        group.MapPost("/", async (
            [FromBody] AssignTeacherRequest request,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            var result = await service.AssignTeacherAsync(request, cancellationToken);
            return result is null ? Results.NotFound() : Results.Created("/api/teacher-assignments", result);
        })
        .WithName("AssignTeacher");

        group.MapPut("/groups/{groupId:guid}/subjects/{subjectId:guid}", async (
            Guid groupId,
            Guid subjectId,
            [FromBody] SetTeacherAssignmentRequest request,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            if (request.TeacherId == Guid.Empty)
            {
                return Results.BadRequest(new { message = "TeacherId is required." });
            }

            var result = await service.SetTeacherAssignmentAsync(
                groupId,
                subjectId,
                request,
                cancellationToken);

            return result is null
                ? Results.BadRequest(new { message = "Teacher must be active, assigned to the subject, and the subject must belong to the active group." })
                : Results.Ok(result);
        })
        .WithName("SetTeacherAssignment");

        group.MapDelete("/{teacherId:guid}/{subjectId:guid}/{groupId:guid}", async (
            Guid teacherId,
            Guid subjectId,
            Guid groupId,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
        {
            var removed = await service.RemoveTeacherAssignmentAsync(
                teacherId,
                subjectId,
                groupId,
                cancellationToken);

            return removed ? Results.NoContent() : Results.NotFound();
        })
        .WithName("RemoveTeacherAssignment");
    }

    private static void MapDashboardEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/admin/dashboard", async (
            IAdministrationService service,
            CancellationToken cancellationToken) =>
            Results.Ok(await service.GetDashboardSummaryAsync(cancellationToken)))
            .WithTags("Dashboard")
            .RequireAuthorization(AuthorizationPolicies.Managers)
            .WithName("GetAdminDashboard");

        endpoints.MapGet("/api/admin/dashboard/daily-results", async (
            [FromQuery] DateOnly? date,
            [FromQuery] Guid? groupId,
            [FromQuery] string? sort,
            IAdministrationService service,
            CancellationToken cancellationToken) =>
            Results.Ok(await service.GetDashboardDailyResultsAsync(date, groupId, sort, cancellationToken)))
            .WithTags("Dashboard")
            .RequireAuthorization(AuthorizationPolicies.Managers)
            .WithName("GetAdminDashboardDailyResults");
    }

    private static string? ValidateCreateUser(CreateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName) ||
            string.IsNullOrWhiteSpace(request.PhoneNumber) ||
            string.IsNullOrWhiteSpace(request.Password))
        {
            return "FirstName, LastName, PhoneNumber and Password are required.";
        }

        if (!IsGeneratedPasswordShape(request.Password))
        {
            return "Password must contain exactly 5 digits and 1 English letter.";
        }

        return null;
    }

    private static string? ValidateUpdateUser(UpdateUserRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.FirstName) ||
            string.IsNullOrWhiteSpace(request.LastName) ||
            string.IsNullOrWhiteSpace(request.PhoneNumber))
        {
            return "FirstName, LastName and PhoneNumber are required.";
        }

        return null;
    }

    private static bool IsGeneratedPasswordShape(string password)
    {
        return password.Length == 6 &&
            password.Count(IsAsciiDigit) == 5 &&
            password.Count(IsEnglishLetter) == 1;
    }

    private static bool IsAsciiDigit(char value)
    {
        return value is >= '0' and <= '9';
    }

    private static bool IsEnglishLetter(char value)
    {
        return value is >= 'A' and <= 'Z' or >= 'a' and <= 'z';
    }
}

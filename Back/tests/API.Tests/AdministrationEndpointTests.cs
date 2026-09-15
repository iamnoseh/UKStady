using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using UKStady.Application.Features.Administration;
using UKStady.Application.Features.Auth;
using UKStady.Domain.Enums;

namespace UKStady.API.Tests;

public sealed class AdministrationEndpointTests : IClassFixture<TestApiFactory>
{
    private readonly TestApiFactory _factory;

    public AdministrationEndpointTests(TestApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task Users_WithoutToken_ReturnsUnauthorized()
    {
        using var client = _factory.CreateClient();

        using var response = await client.GetAsync("/api/users");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task Users_WithTeacherToken_ReturnsForbidden()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "teacher", TestApiFactory.TestPassword);

        using var response = await client.GetAsync("/api/users");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ManagerWorkflow_CreatesCoreAdministrationRecords()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "superadmin", "Admin123!");

        var teacher = await CreateUserAsync(client, UserRole.Teacher, "teacher-admin-flow");
        var student = await CreateUserAsync(client, UserRole.Student, "student-admin-flow");
        var group = await CreateGroupAsync(client);
        var subject = await CreateSubjectAsync(client);

        using var addStudentResponse = await client.PostAsync(
            $"/api/groups/{group.Id}/students/{student.Id}",
            null);
        Assert.Equal(HttpStatusCode.NoContent, addStudentResponse.StatusCode);

        using var assignmentResponse = await client.PostAsJsonAsync(
            "/api/teacher-assignments",
            new AssignTeacherRequest(teacher.Id, subject.Id, group.Id));
        Assert.Equal(HttpStatusCode.Created, assignmentResponse.StatusCode);

        var assignment = await assignmentResponse.Content.ReadFromJsonAsync<TeacherAssignmentDto>();
        Assert.NotNull(assignment);
        Assert.Equal(teacher.Id, assignment.TeacherId);

        var dashboard = await client.GetFromJsonAsync<DashboardSummaryDto>("/api/admin/dashboard");
        Assert.NotNull(dashboard);
        Assert.True(dashboard.ActiveStudents >= 1);
        Assert.True(dashboard.ActiveTeachers >= 1);
        Assert.True(dashboard.ActiveGroups >= 1);
        Assert.True(dashboard.ActiveSubjects >= 1);
        Assert.True(dashboard.TeacherAssignments >= 1);
    }

    private static async Task AuthorizeAsync(HttpClient client, string login, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(login, password));
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<AuthResult>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", result?.AccessToken);
    }

    private static async Task<UserDto> CreateUserAsync(HttpClient client, UserRole role, string userName)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/users",
            new CreateUserRequest(
                "Test",
                role.ToString(),
                null,
                userName,
                $"{userName}@ukstady.local",
                "Password123!",
                role));

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<UserDto>()
            ?? throw new InvalidOperationException("User response was empty.");
    }

    private static async Task<GroupDto> CreateGroupAsync(HttpClient client)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/groups",
            new CreateGroupRequest("Group A", "Demo group"));

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<GroupDto>()
            ?? throw new InvalidOperationException("Group response was empty.");
    }

    private static async Task<SubjectDto> CreateSubjectAsync(HttpClient client)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/subjects",
            new CreateSubjectRequest("Mathematics", "Daily assessment subject"));

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<SubjectDto>()
            ?? throw new InvalidOperationException("Subject response was empty.");
    }
}


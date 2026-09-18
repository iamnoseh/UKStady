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
        await AuthorizeAsync(client, "+992111111111", TestApiFactory.TestPassword);

        using var response = await client.GetAsync("/api/users");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task ManagerWorkflow_CreatesCoreAdministrationRecords()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");

        var generatedPassword = await client.GetFromJsonAsync<GeneratedPasswordDto>("/api/users/generated-password");
        Assert.NotNull(generatedPassword);
        Assert.True(IsGeneratedPasswordShape(generatedPassword.Password));

        var teacher = await CreateUserAsync(client, UserRole.Teacher, "teacher-admin-flow", "+992200000001", generatedPassword.Password);
        var student = await CreateUserAsync(client, UserRole.Student, "student-admin-flow", "+992200000002", "12345A");
        var subject = await CreateSubjectAsync(client);
        var group = await CreateGroupAsync(client, [subject.Id]);

        using var teacherSubjectResponse = await client.PostAsJsonAsync(
            "/api/teacher-subjects",
            new AssignTeacherSubjectRequest(teacher.Id, subject.Id));
        Assert.Equal(HttpStatusCode.Created, teacherSubjectResponse.StatusCode);

        using var addStudentResponse = await client.PostAsync(
            $"/api/groups/{group.Id}/students/{student.Id}",
            null);
        Assert.Equal(HttpStatusCode.NoContent, addStudentResponse.StatusCode);

        var updatedGroup = await client.GetFromJsonAsync<GroupDto>($"/api/groups/{group.Id}");
        Assert.NotNull(updatedGroup);
        Assert.Contains(updatedGroup.Students, item => item.Id == student.Id);

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

    [Fact]
    public async Task TeacherManagement_SupportsArbitraryPassword_ChangePassword_AndHardDelete()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");

        // 1. Create teacher with 6-digit password "654321" (no letters)
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacher = await CreateUserAsync(client, UserRole.Teacher, $"teacher-{suffix}", $"+992{Random.Shared.Next(10000000, 99999999)}", "654321");
        Assert.NotNull(teacher);

        // 2. Change teacher password to "newpass123"
        using var changePassResponse = await client.PostAsJsonAsync(
            $"/api/users/{teacher.Id}/password",
            new ChangeUserPasswordRequest("newpass123"));
        Assert.Equal(HttpStatusCode.NoContent, changePassResponse.StatusCode);

        // 3. Verify teacher can log in with new password
        using var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(teacher.PhoneNumber, "newpass123"));
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);

        // 4. Hard delete teacher
        using var hardDeleteResponse = await client.DeleteAsync($"/api/users/{teacher.Id}/hard");
        Assert.Equal(HttpStatusCode.NoContent, hardDeleteResponse.StatusCode);

        // 5. Verify teacher is completely gone from DB
        using var getUserResponse = await client.GetAsync($"/api/users/{teacher.Id}");
        Assert.Equal(HttpStatusCode.NotFound, getUserResponse.StatusCode);
    }

    [Fact]
    public async Task StudentPasswordChange_ByAdmin_AllowsAnyPasswordAndLogin()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");

        // 1. Create student with 6-character password
        var suffix = Guid.NewGuid().ToString("N")[..8];
        var student = await CreateUserAsync(client, UserRole.Student, $"student-{suffix}", $"+992{Random.Shared.Next(10000000, 99999999)}", "112233");
        Assert.NotNull(student);

        // 2. Change student password to "stud99"
        using var changePassResponse = await client.PostAsJsonAsync(
            $"/api/users/{student.Id}/password",
            new ChangeUserPasswordRequest("stud99"));
        Assert.Equal(HttpStatusCode.NoContent, changePassResponse.StatusCode);

        // 3. Verify student can log in with new password
        using var loginResponse = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(student.PhoneNumber, "stud99"));
        Assert.Equal(HttpStatusCode.OK, loginResponse.StatusCode);
    }

    [Fact]
    public async Task AdminDashboardDailyResults_ReturnsStudentsFromActiveGroupsWithoutGrades()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var subject = await CreateSubjectAsync(client, $"Dashboard admin subject {suffix}");
        var group = await CreateGroupAsync(client, [subject.Id], $"Dashboard admin group {suffix}");
        var firstStudent = await CreateUserAsync(
            client,
            UserRole.Student,
            $"dashboard-admin-student-a-{suffix}",
            $"+99241{suffix[..7]}",
            "12345A");
        var secondStudent = await CreateUserAsync(
            client,
            UserRole.Student,
            $"dashboard-admin-student-b-{suffix}",
            $"+99242{suffix[..7]}",
            "12345A");

        (await client.PostAsync($"/api/groups/{group.Id}/students/{firstStudent.Id}", null)).EnsureSuccessStatusCode();
        (await client.PostAsync($"/api/groups/{group.Id}/students/{secondStudent.Id}", null)).EnsureSuccessStatusCode();

        var results = await client.GetFromJsonAsync<DashboardDailyResultsDto>(
            $"/api/admin/dashboard/daily-results?date=2026-09-15&groupId={group.Id}&sort=scoreAsc");

        Assert.NotNull(results);
        Assert.Equal(2, results.TotalResults);
        Assert.Null(results.AverageScore);
        Assert.All(results.Results, result =>
        {
            Assert.Equal(group.Id, result.GroupId);
            Assert.Equal(subject.Id, result.SubjectId);
            Assert.Null(result.Score);
            Assert.Equal("NoGrade", result.AttendanceStatus);
        });
        Assert.Contains(results.Results, result => result.StudentId == firstStudent.Id);
        Assert.Contains(results.Results, result => result.StudentId == secondStudent.Id);
    }

    [Fact]
    public async Task TeacherAssignments_Set_ReplacesTeacherForGroupSubject()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var firstTeacher = await CreateUserAsync(
            client,
            UserRole.Teacher,
            $"first-group-teacher-{suffix}",
            $"+99231{suffix[..7]}",
            "12345A");
        var secondTeacher = await CreateUserAsync(
            client,
            UserRole.Teacher,
            $"second-group-teacher-{suffix}",
            $"+99232{suffix[..7]}",
            "12345A");
        var subject = await CreateSubjectAsync(client, $"Group Teacher Subject {suffix}");
        var group = await CreateGroupAsync(client, [subject.Id], $"Teacher Group {suffix}");

        foreach (var teacher in new[] { firstTeacher, secondTeacher })
        {
            using var qualificationResponse = await client.PostAsJsonAsync(
                "/api/teacher-subjects",
                new AssignTeacherSubjectRequest(teacher.Id, subject.Id));
            Assert.Equal(HttpStatusCode.Created, qualificationResponse.StatusCode);
        }

        using var firstAssignmentResponse = await client.PutAsJsonAsync(
            $"/api/teacher-assignments/groups/{group.Id}/subjects/{subject.Id}",
            new SetTeacherAssignmentRequest(firstTeacher.Id));
        firstAssignmentResponse.EnsureSuccessStatusCode();

        using var replacementResponse = await client.PutAsJsonAsync(
            $"/api/teacher-assignments/groups/{group.Id}/subjects/{subject.Id}",
            new SetTeacherAssignmentRequest(secondTeacher.Id));
        replacementResponse.EnsureSuccessStatusCode();

        var assignments = await client.GetFromJsonAsync<List<TeacherAssignmentDto>>("/api/teacher-assignments");
        Assert.NotNull(assignments);
        var groupSubjectAssignments = assignments
            .Where(assignment => assignment.GroupId == group.Id && assignment.SubjectId == subject.Id)
            .ToList();
        var assignment = Assert.Single(groupSubjectAssignments);
        Assert.Equal(secondTeacher.Id, assignment.TeacherId);
    }

    [Fact]
    public async Task Groups_CreateWithBranchAndSubjects_ReturnsCardData()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var firstSubject = await CreateSubjectAsync(client, $"Math {suffix}");
        var secondSubject = await CreateSubjectAsync(client, $"Physics {suffix}");

        using var response = await client.PostAsJsonAsync(
            "/api/groups",
            new CreateGroupRequest(
                $"Group {suffix}",
                "Morning students",
                "Central branch",
                [firstSubject.Id, secondSubject.Id]));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var group = await response.Content.ReadFromJsonAsync<GroupDto>();
        Assert.NotNull(group);
        Assert.Equal("Central branch", group.Branch);
        Assert.Equal(2, group.Subjects.Count);

        using var updateResponse = await client.PutAsJsonAsync(
            $"/api/groups/{group.Id}",
            new UpdateGroupRequest(
                group.Name,
                group.Description,
                "North branch",
                false,
                [firstSubject.Id]));

        updateResponse.EnsureSuccessStatusCode();
        var updatedGroup = await updateResponse.Content.ReadFromJsonAsync<GroupDto>();
        Assert.NotNull(updatedGroup);
        Assert.Equal("North branch", updatedGroup.Branch);
        Assert.False(updatedGroup.IsActive);
        Assert.Single(updatedGroup.Subjects);
    }

    [Fact]
    public async Task TeacherSubjects_AssignsTeacherToSubject()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacher = await CreateUserAsync(
            client,
            UserRole.Teacher,
            $"teacher-subject-{suffix}",
            $"+99221{suffix[..7]}",
            "12345A");
        var subject = await CreateSubjectAsync(client, $"Teacher Subject {suffix}");

        using var response = await client.PostAsJsonAsync(
            "/api/teacher-subjects",
            new AssignTeacherSubjectRequest(teacher.Id, subject.Id));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var assignment = await response.Content.ReadFromJsonAsync<TeacherSubjectAssignmentDto>();
        Assert.NotNull(assignment);
        Assert.Equal(teacher.Id, assignment.TeacherId);
        Assert.Equal(subject.Id, assignment.SubjectId);
    }

    private static async Task AuthorizeAsync(HttpClient client, string login, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(login, password));
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<AuthResult>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", result?.AccessToken);
    }

    private static async Task<UserDto> CreateUserAsync(
        HttpClient client,
        UserRole role,
        string userName,
        string phoneNumber,
        string password)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/users",
            new CreateUserRequest(
                "Test",
                role.ToString(),
                null,
                phoneNumber,
                password,
                role,
                userName));

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<UserDto>()
            ?? throw new InvalidOperationException("User response was empty.");
    }

    private static async Task<GroupDto> CreateGroupAsync(
        HttpClient client,
        IReadOnlyList<Guid>? subjectIds = null,
        string name = "Group A")
    {
        using var response = await client.PostAsJsonAsync(
            "/api/groups",
            new CreateGroupRequest(name, "Demo group", "Main branch", subjectIds ?? []));

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

    private static async Task<SubjectDto> CreateSubjectAsync(HttpClient client, string name)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/subjects",
            new CreateSubjectRequest(name, "Teacher assignment subject"));

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<SubjectDto>()
            ?? throw new InvalidOperationException("Subject response was empty.");
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

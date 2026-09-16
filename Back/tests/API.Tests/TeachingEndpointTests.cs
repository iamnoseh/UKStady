using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using UKStady.Application.Features.Administration;
using UKStady.Application.Features.Auth;
using UKStady.Application.Features.Teaching;
using UKStady.Domain.Enums;

namespace UKStady.API.Tests;

public sealed class TeachingEndpointTests : IClassFixture<TestApiFactory>
{
    private readonly TestApiFactory _factory;

    public TeachingEndpointTests(TestApiFactory factory)
    {
        _factory = factory;
    }

    [Fact]
    public async Task TeacherWorkflow_CreatesTopicQuestionAndDailyLesson()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");

        var teacherPhone = "+992300000001";
        var teacher = await CreateUserAsync(client, UserRole.Teacher, "teacher-flow", teacherPhone);
        var subject = await CreateSubjectAsync(client, "Physics");
        var group = await CreateGroupAsync(client, "Teacher Flow Group", [subject.Id]);

        using var teacherSubjectResponse = await client.PostAsJsonAsync(
            "/api/teacher-subjects",
            new AssignTeacherSubjectRequest(teacher.Id, subject.Id));
        teacherSubjectResponse.EnsureSuccessStatusCode();

        using var assignmentResponse = await client.PostAsJsonAsync(
            "/api/teacher-assignments",
            new AssignTeacherRequest(teacher.Id, subject.Id, group.Id));
        assignmentResponse.EnsureSuccessStatusCode();

        await AuthorizeAsync(client, teacherPhone, "12345A");

        var topic = await CreateTopicAsync(client, subject.Id);
        var question = await CreateQuestionAsync(client, topic.Id);

        using var lessonResponse = await client.PostAsJsonAsync(
            "/api/daily-lessons",
            new CreateDailyLessonRequest(
                subject.Id,
                topic.Id,
                new DateOnly(2026, 9, 15),
                "Lesson 1",
                1,
                [group.Id]));

        Assert.Equal(HttpStatusCode.Created, lessonResponse.StatusCode);
        var lesson = await lessonResponse.Content.ReadFromJsonAsync<DailyLessonDto>();
        Assert.NotNull(lesson);
        Assert.Equal(question.TopicId, lesson.TopicId);
        Assert.Single(lesson.AssignedGroupIds);
    }

    [Fact]
    public async Task CreateSingleChoiceQuestion_WithTwoCorrectOptions_ReturnsBadRequest()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");
        var subject = await CreateSubjectAsync(client, "Chemistry");
        var topic = await CreateTopicAsync(client, subject.Id);

        using var response = await client.PostAsJsonAsync(
            "/api/questions",
            new CreateQuestionRequest(
                topic.Id,
                "Invalid question?",
                QuestionType.SingleChoice,
                1,
                [
                    new CreateQuestionOptionRequest("A", true, 1),
                    new CreateQuestionOptionRequest("B", true, 2),
                    new CreateQuestionOptionRequest("C", false, 3),
                    new CreateQuestionOptionRequest("D", false, 4)
                ]));

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task TeacherWithSubjectAssignment_CanCreateTopic()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherPhone = $"+99231{suffix[..7]}";
        var teacher = await CreateUserAsync(client, UserRole.Teacher, $"direct-subject-teacher-{suffix}", teacherPhone);
        var subject = await CreateSubjectAsync(client, $"Biology {suffix}");

        using var assignmentResponse = await client.PostAsJsonAsync(
            "/api/teacher-subjects",
            new AssignTeacherSubjectRequest(teacher.Id, subject.Id));
        assignmentResponse.EnsureSuccessStatusCode();

        await AuthorizeAsync(client, teacherPhone, "12345A");

        var topic = await CreateTopicAsync(client, subject.Id);
        await CreateQuestionAsync(client, topic.Id);

        var teacherSubjects = await client.GetFromJsonAsync<List<TeacherSubjectDto>>("/api/teacher/subjects");
        Assert.NotNull(teacherSubjects);
        var teacherSubject = Assert.Single(teacherSubjects);
        Assert.Equal(subject.Id, teacherSubject.Id);
        Assert.Equal(1, teacherSubject.TopicCount);
        Assert.Equal(1, teacherSubject.QuestionCount);

        Assert.Equal(subject.Id, topic.SubjectId);
    }

    [Fact]
    public async Task Teacher_CanManageTopicsAndImportedQuestions_OnlyForAssignedSubjects()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherPhone = $"+99233{suffix[..7]}";
        var teacher = await CreateUserAsync(client, UserRole.Teacher, $"content-teacher-{suffix}", teacherPhone);
        var assignedSubject = await CreateSubjectAsync(client, $"Assigned subject {suffix}");
        var unassignedSubject = await CreateSubjectAsync(client, $"Unassigned subject {suffix}");

        using var assignmentResponse = await client.PostAsJsonAsync(
            "/api/teacher-subjects",
            new AssignTeacherSubjectRequest(teacher.Id, assignedSubject.Id));
        assignmentResponse.EnsureSuccessStatusCode();

        await AuthorizeAsync(client, teacherPhone, "12345A");

        var topic = await CreateTopicAsync(client, assignedSubject.Id);
        using var updateTopicResponse = await client.PutAsJsonAsync(
            $"/api/topics/{topic.Id}",
            new UpdateTopicRequest("Updated mechanics", "Teacher managed topic", "Book", "Grade 9", true));
        updateTopicResponse.EnsureSuccessStatusCode();
        var updatedTopic = await updateTopicResponse.Content.ReadFromJsonAsync<TopicDto>();
        Assert.NotNull(updatedTopic);
        Assert.Equal("Updated mechanics", updatedTopic.Title);

        await CreateQuestionAsync(client, topic.Id);
        await CreateQuestionAsync(client, topic.Id);

        var importedQuestions = await client.GetFromJsonAsync<List<QuestionDto>>($"/api/questions/by-topic/{topic.Id}");
        Assert.NotNull(importedQuestions);
        Assert.Equal(2, importedQuestions.Count);

        using var deactivateQuestionResponse = await client.DeleteAsync($"/api/questions/{importedQuestions[0].Id}");
        Assert.Equal(HttpStatusCode.NoContent, deactivateQuestionResponse.StatusCode);

        using var deactivateTopicResponse = await client.DeleteAsync($"/api/topics/{topic.Id}");
        Assert.Equal(HttpStatusCode.NoContent, deactivateTopicResponse.StatusCode);

        using var unassignedTopicResponse = await client.PostAsJsonAsync(
            "/api/topics",
            new CreateTopicRequest(unassignedSubject.Id, "Forbidden topic", null, null, null));
        Assert.Equal(HttpStatusCode.NotFound, unassignedTopicResponse.StatusCode);
    }

    [Fact]
    public async Task GroupJournal_CreateTodayLesson_DoesNotCreateDuplicate()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var subject = await CreateSubjectAsync(client, $"Journal subject {suffix}");
        var group = await CreateGroupAsync(client, $"Journal group {suffix}", [subject.Id]);
        var student = await CreateUserAsync(client, UserRole.Student, $"journal-student-{suffix}", $"+99232{suffix[..7]}");

        using var addStudentResponse = await client.PostAsync($"/api/groups/{group.Id}/students/{student.Id}", null);
        addStudentResponse.EnsureSuccessStatusCode();

        var journal = await client.GetFromJsonAsync<GroupJournalDto>($"/api/group-journals/{group.Id}");
        Assert.NotNull(journal);
        var subjectJournal = Assert.Single(journal.Subjects);
        Assert.Equal(subject.Id, subjectJournal.SubjectId);
        Assert.Null(subjectJournal.TodayLessonId);
        Assert.Single(subjectJournal.Students);

        using var firstCreateResponse = await client.PostAsJsonAsync(
            $"/api/group-journals/{group.Id}/today-lessons",
            new CreateTodayGroupLessonRequest(subject.Id));

        Assert.Equal(HttpStatusCode.Created, firstCreateResponse.StatusCode);
        var firstResult = await firstCreateResponse.Content.ReadFromJsonAsync<CreateTodayGroupLessonResult>();
        Assert.NotNull(firstResult);
        Assert.True(firstResult.Created);

        using var secondCreateResponse = await client.PostAsJsonAsync(
            $"/api/group-journals/{group.Id}/today-lessons",
            new CreateTodayGroupLessonRequest(subject.Id));

        Assert.Equal(HttpStatusCode.OK, secondCreateResponse.StatusCode);
        var secondResult = await secondCreateResponse.Content.ReadFromJsonAsync<CreateTodayGroupLessonResult>();
        Assert.NotNull(secondResult);
        Assert.False(secondResult.Created);
        Assert.Equal(firstResult.Lesson.Id, secondResult.Lesson.Id);
    }

    private static async Task AuthorizeAsync(HttpClient client, string phoneNumber, string password)
    {
        var response = await client.PostAsJsonAsync("/api/auth/login", new LoginRequest(phoneNumber, password));
        response.EnsureSuccessStatusCode();
        var result = await response.Content.ReadFromJsonAsync<AuthResult>();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", result?.AccessToken);
    }

    private static async Task<UserDto> CreateUserAsync(HttpClient client, UserRole role, string userName, string phoneNumber)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/users",
            new CreateUserRequest(
                "Test",
                role.ToString(),
                null,
                phoneNumber,
                "12345A",
                role,
                userName));

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<UserDto>()
            ?? throw new InvalidOperationException("User response was empty.");
    }

    private static async Task<GroupDto> CreateGroupAsync(HttpClient client, string name, IReadOnlyList<Guid>? subjectIds = null)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/groups",
            new CreateGroupRequest(name, null, "Main branch", subjectIds ?? []));

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<GroupDto>()
            ?? throw new InvalidOperationException("Group response was empty.");
    }

    private static async Task<SubjectDto> CreateSubjectAsync(HttpClient client, string name)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/subjects",
            new CreateSubjectRequest(name, null));

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<SubjectDto>()
            ?? throw new InvalidOperationException("Subject response was empty.");
    }

    private static async Task<TopicDto> CreateTopicAsync(HttpClient client, Guid subjectId)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/topics",
            new CreateTopicRequest(subjectId, "Mechanics", null, null, null));

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<TopicDto>()
            ?? throw new InvalidOperationException("Topic response was empty.");
    }

    private static async Task<QuestionDto> CreateQuestionAsync(HttpClient client, Guid topicId)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/questions",
            new CreateQuestionRequest(
                topicId,
                "What is force?",
                QuestionType.SingleChoice,
                1,
                [
                    new CreateQuestionOptionRequest("Mass times acceleration", true, 1),
                    new CreateQuestionOptionRequest("Distance over time", false, 2),
                    new CreateQuestionOptionRequest("Energy over time", false, 3),
                    new CreateQuestionOptionRequest("Force over area", false, 4)
                ]));

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<QuestionDto>()
            ?? throw new InvalidOperationException("Question response was empty.");
    }
}

using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using UKStady.Application.Features.Administration;
using UKStady.Application.Features.Auth;
using UKStady.Application.Features.Teaching;
using UKStady.Domain.Entities;
using UKStady.Domain.Enums;
using UKStady.Infrastructure.Persistence;

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
    public async Task TeacherDashboard_ReturnsOnlyAssignedGroupsAndTheirStudents()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var firstTeacherPhone = $"+99234{suffix[..7]}";
        var secondTeacherPhone = $"+99235{suffix[..7]}";
        var firstTeacher = await CreateUserAsync(client, UserRole.Teacher, $"dashboard-teacher-a-{suffix}", firstTeacherPhone);
        var secondTeacher = await CreateUserAsync(client, UserRole.Teacher, $"dashboard-teacher-b-{suffix}", secondTeacherPhone);
        var firstStudent = await CreateUserAsync(client, UserRole.Student, $"dashboard-student-a-{suffix}", $"+99236{suffix[..7]}");
        var ungradedStudent = await CreateUserAsync(client, UserRole.Student, $"dashboard-student-ungraded-{suffix}", $"+99238{suffix[..7]}");
        var secondStudent = await CreateUserAsync(client, UserRole.Student, $"dashboard-student-b-{suffix}", $"+99237{suffix[..7]}");
        var firstSubject = await CreateSubjectAsync(client, $"Dashboard subject A {suffix}");
        var secondSubject = await CreateSubjectAsync(client, $"Dashboard subject B {suffix}");
        var firstGroup = await CreateGroupAsync(client, $"Dashboard group A {suffix}", [firstSubject.Id]);
        var secondGroup = await CreateGroupAsync(client, $"Dashboard group B {suffix}", [secondSubject.Id]);

        await AssignTeacherAsync(client, firstTeacher.Id, firstSubject.Id, firstGroup.Id);
        await AssignTeacherAsync(client, secondTeacher.Id, secondSubject.Id, secondGroup.Id);
        (await client.PostAsync($"/api/groups/{firstGroup.Id}/students/{firstStudent.Id}", null)).EnsureSuccessStatusCode();
        (await client.PostAsync($"/api/groups/{firstGroup.Id}/students/{ungradedStudent.Id}", null)).EnsureSuccessStatusCode();
        (await client.PostAsync($"/api/groups/{secondGroup.Id}/students/{secondStudent.Id}", null)).EnsureSuccessStatusCode();

        var lessonDate = new DateOnly(2026, 9, 15);
        await AuthorizeAsync(client, firstTeacherPhone, "12345A");
        var firstTopic = await CreateTopicAsync(client, firstSubject.Id);
        await CreateQuestionAsync(client, firstTopic.Id);
        var firstLesson = await CreateDailyLessonAsync(client, firstSubject.Id, firstTopic.Id, firstGroup.Id, lessonDate);

        await AuthorizeAsync(client, secondTeacherPhone, "12345A");
        var secondTopic = await CreateTopicAsync(client, secondSubject.Id);
        await CreateQuestionAsync(client, secondTopic.Id);
        var secondLesson = await CreateDailyLessonAsync(client, secondSubject.Id, secondTopic.Id, secondGroup.Id, lessonDate);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            dbContext.GradeEntries.AddRange(
                new GradeEntry
                {
                    DailyLessonId = firstLesson.Id,
                    StudentId = firstStudent.Id,
                    AttendanceStatus = AttendanceStatus.Present,
                    AutoScore = 84
                },
                new GradeEntry
                {
                    DailyLessonId = secondLesson.Id,
                    StudentId = secondStudent.Id,
                    AttendanceStatus = AttendanceStatus.Present,
                    AutoScore = 91
                });
            await dbContext.SaveChangesAsync();
        }

        await AuthorizeAsync(client, firstTeacherPhone, "12345A");

        var groups = await client.GetFromJsonAsync<List<TeacherDashboardGroupDto>>("/api/teacher/dashboard/groups");
        Assert.NotNull(groups);
        var dashboardGroup = Assert.Single(groups.Where(group => group.Id == firstGroup.Id));
        Assert.Equal(2, dashboardGroup.StudentCount);
        Assert.DoesNotContain(groups, group => group.Id == secondGroup.Id);

        var results = await client.GetFromJsonAsync<TeacherDashboardDailyResultsDto>(
            $"/api/teacher/dashboard/daily-results?date={lessonDate:yyyy-MM-dd}&sort=scoreAsc");
        Assert.NotNull(results);
        Assert.Equal(2, results.Results.Count);
        var ungradedResult = results.Results[0];
        Assert.Equal(ungradedStudent.Id, ungradedResult.StudentId);
        Assert.Null(ungradedResult.Score);
        Assert.Equal("NoGrade", ungradedResult.AttendanceStatus);

        var studentResult = results.Results[1];
        Assert.Equal(firstStudent.Id, studentResult.StudentId);
        Assert.Equal(firstGroup.Id, studentResult.GroupId);
        Assert.Equal(firstSubject.Id, studentResult.SubjectId);
        Assert.True(studentResult.Score.HasValue);
        Assert.Equal(84m, studentResult.Score.Value);
        Assert.DoesNotContain(results.Results, result => result.StudentId == secondStudent.Id);
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

    [Fact]
    public async Task GroupJournalScore_TeacherCanUpdateOnlyAssignedYesterdayScore()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherPhone = $"+99239{suffix[..7]}";
        var teacher = await CreateUserAsync(client, UserRole.Teacher, $"score-teacher-{suffix}", teacherPhone);
        var student = await CreateUserAsync(client, UserRole.Student, $"score-student-{suffix}", $"+99240{suffix[..7]}");
        var subject = await CreateSubjectAsync(client, $"Score subject {suffix}");
        var group = await CreateGroupAsync(client, $"Score group {suffix}", [subject.Id]);
        await AssignTeacherAsync(client, teacher.Id, subject.Id, group.Id);
        (await client.PostAsync($"/api/groups/{group.Id}/students/{student.Id}", null)).EnsureSuccessStatusCode();

        await AuthorizeAsync(client, teacherPhone, "12345A");
        var topic = await CreateTopicAsync(client, subject.Id);
        await CreateQuestionAsync(client, topic.Id);
        var lessonDate = GetBusinessToday().AddDays(-1);
        var lesson = await CreateDailyLessonAsync(client, subject.Id, topic.Id, group.Id, lessonDate);

        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            dbContext.GradeEntries.Add(new GradeEntry
            {
                DailyLessonId = lesson.Id,
                StudentId = student.Id,
                AttendanceStatus = AttendanceStatus.Present,
                AutoScore = 80
            });
            await dbContext.SaveChangesAsync();
        }

        using var updateResponse = await client.PutAsJsonAsync(
            $"/api/group-journals/{group.Id}/lessons/{lesson.Id}/students/{student.Id}/score",
            new UpdateGroupJournalScoreRequest(90, "Bonus"));
        updateResponse.EnsureSuccessStatusCode();
        var updatedScore = await updateResponse.Content.ReadFromJsonAsync<GroupJournalLessonScoreDto>();
        Assert.NotNull(updatedScore);
        Assert.True(updatedScore.Score.HasValue);
        Assert.Equal(90m, updatedScore.Score.Value);
        Assert.True(updatedScore.IsAdjusted);
        Assert.True(updatedScore.CanEdit);

        var journal = await client.GetFromJsonAsync<GroupJournalDto>($"/api/group-journals/{group.Id}");
        Assert.NotNull(journal);
        var score = Assert.Single(Assert.Single(journal.Subjects).Students).LessonScores.Single(item => item.LessonId == lesson.Id);
        Assert.True(score.Score.HasValue);
        Assert.Equal(90m, score.Score.Value);
        Assert.True(score.IsAdjusted);
        Assert.True(score.CanEdit);

        await AuthorizeAsync(client, "+992000000000", "Admin123!");
        using var adminUpdateResponse = await client.PutAsJsonAsync(
            $"/api/group-journals/{group.Id}/lessons/{lesson.Id}/students/{student.Id}/score",
            new UpdateGroupJournalScoreRequest(95, null));
        Assert.Equal(HttpStatusCode.Forbidden, adminUpdateResponse.StatusCode);
    }

    [Fact]
    public async Task Teacher_CanGradeAnyDay_AndCombinesTestScoreWithTeacherScore()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherPhone = $"+99251{suffix[..7]}";
        var studentPhone = $"+99252{suffix[..7]}";
        var teacher = await CreateUserAsync(client, UserRole.Teacher, $"t-{suffix}", teacherPhone);
        var student = await CreateUserAsync(client, UserRole.Student, $"s-{suffix}", studentPhone);
        var subject = await CreateSubjectAsync(client, $"Math-{suffix}");
        var group = await CreateGroupAsync(client, $"Grp-{suffix}", [subject.Id]);
        (await client.PostAsync($"/api/groups/{group.Id}/students/{student.Id}", null)).EnsureSuccessStatusCode();
        await AssignTeacherAsync(client, teacher.Id, subject.Id, group.Id);

        await AuthorizeAsync(client, teacherPhone, "12345A");
        var topic = await CreateTopicAsync(client, subject.Id);
        await CreateQuestionAsync(client, topic.Id);
        var today = GetBusinessToday();
        var todayLesson = await CreateDailyLessonAsync(client, subject.Id, topic.Id, group.Id, today);

        // Student took test and got 100
        var attemptId = Guid.NewGuid();
        using (var scope = _factory.Services.CreateScope())
        {
            var dbContext = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var assignment = dbContext.TestAssignments.First(a => a.DailyLessonId == todayLesson.Id && a.GroupId == group.Id);
            var attempt = new StudentTestAttempt
            {
                Id = attemptId,
                TestAssignmentId = assignment.Id,
                StudentId = student.Id,
                Status = TestStatus.Submitted,
                AutoScore = 100m,
                StartedAtUtc = DateTimeOffset.UtcNow,
                SubmittedAtUtc = DateTimeOffset.UtcNow
            };
            dbContext.StudentTestAttempts.Add(attempt);
            dbContext.GradeEntries.Add(new GradeEntry
            {
                DailyLessonId = todayLesson.Id,
                StudentId = student.Id,
                StudentTestAttemptId = attemptId,
                AttendanceStatus = AttendanceStatus.Present,
                AutoScore = 100m
            });
            await dbContext.SaveChangesAsync();
        }

        // Teacher accesses today's lesson in journal and gives 30 in class
        await AuthorizeAsync(client, teacherPhone, "12345A");
        using var updateResponse = await client.PutAsJsonAsync(
            $"/api/group-journals/{group.Id}/lessons/{todayLesson.Id}/students/{student.Id}/score",
            new UpdateGroupJournalScoreRequest(30, "In-class answers"));
        updateResponse.EnsureSuccessStatusCode();

        var updatedScore = await updateResponse.Content.ReadFromJsonAsync<GroupJournalLessonScoreDto>();
        Assert.NotNull(updatedScore);
        Assert.True(updatedScore.Score.HasValue);
        Assert.Equal(130m, updatedScore.Score.Value); // 100 test + 30 class = 130!
        Assert.Equal(100m, updatedScore.TestScore);
        Assert.Equal(30m, updatedScore.TeacherScore);
        Assert.True(updatedScore.CanEdit);

        // Check journal view
        var journal = await client.GetFromJsonAsync<GroupJournalDto>($"/api/group-journals/{group.Id}");
        Assert.NotNull(journal);
        var studentRow = Assert.Single(Assert.Single(journal.Subjects).Students);
        var scoreItem = studentRow.LessonScores.Single(item => item.LessonId == todayLesson.Id);
        Assert.Equal(130m, scoreItem.Score);
        Assert.Equal(130m, studentRow.TodayScore);
        Assert.Equal(130m, studentRow.AverageScore);
    }

    [Fact]
    public async Task StudentTest_Requires20Questions_AndAllowsCheckingUnansweredQuestion()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherPhone = $"+99251{suffix[..7]}";
        var studentPhone = $"+99252{suffix[..7]}";
        var teacher = await CreateUserAsync(client, UserRole.Teacher, $"t-{suffix}", teacherPhone);
        var student = await CreateUserAsync(client, UserRole.Student, $"s-{suffix}", studentPhone);
        var subject = await CreateSubjectAsync(client, $"Bio-{suffix}");
        var group = await CreateGroupAsync(client, $"Grp-{suffix}", [subject.Id]);

        await AssignTeacherAsync(client, teacher.Id, subject.Id, group.Id);
        (await client.PostAsync($"/api/groups/{group.Id}/students/{student.Id}", null)).EnsureSuccessStatusCode();

        var topic = await CreateTopicAsync(client, subject.Id);

        // Create 20 questions
        for (var i = 0; i < 20; i++)
        {
            await CreateQuestionAsync(client, topic.Id);
        }

        var today = GetBusinessToday();
        var dailyLesson = await CreateDailyLessonAsync(client, subject.Id, topic.Id, group.Id, today);

        // Login as student
        await AuthorizeAsync(client, studentPhone, "12345A");

        // Start test
        using var startResponse = await client.PostAsJsonAsync($"/api/student/tests/{dailyLesson.Id}/start", new StartStudentTestRequest(group.Id));
        startResponse.EnsureSuccessStatusCode();
        var session = await startResponse.Content.ReadFromJsonAsync<StudentTestSessionDto>();
        Assert.NotNull(session);
        Assert.Equal(20, session.Questions.Count);

        // Check an unanswered question (e.g. timed out after 30s)
        var firstQuestion = session.Questions[0];
        using var checkResponse = await client.PostAsync($"/api/student/tests/{session.AttemptId}/questions/{firstQuestion.QuestionId}/check", null);
        checkResponse.EnsureSuccessStatusCode();
        var checkedAnswer = await checkResponse.Content.ReadFromJsonAsync<StudentTestAnswerDto>();
        Assert.NotNull(checkedAnswer);
        Assert.True(checkedAnswer.IsChecked);
        Assert.False(checkedAnswer.IsCorrect);

        // Submit test directly (auto-checking remaining 19 questions)
        using var submitResponse = await client.PostAsync($"/api/student/tests/{session.AttemptId}/submit", null);
        submitResponse.EnsureSuccessStatusCode();
        var submitResult = await submitResponse.Content.ReadFromJsonAsync<StudentTestSubmitResultDto>();
        Assert.NotNull(submitResult);
        Assert.Equal(20, submitResult.TotalQuestions);
        Assert.Equal(0, submitResult.CorrectAnswers);
        Assert.Equal(0m, submitResult.Score);
    }

    [Fact]
    public async Task GroupJournal_UnsubmittedTest_CountsAsZeroAndCanBeGradedByTeacherForYesterday()
    {
        using var client = _factory.CreateClient();
        await AuthorizeAsync(client, "+992000000000", "Admin123!");

        var suffix = Guid.NewGuid().ToString("N")[..8];
        var teacherPhone = $"+99253{suffix[..7]}";
        var studentPhone = $"+99254{suffix[..7]}";
        var teacher = await CreateUserAsync(client, UserRole.Teacher, $"jt-{suffix}", teacherPhone);
        var student = await CreateUserAsync(client, UserRole.Student, $"js-{suffix}", studentPhone);
        var subject = await CreateSubjectAsync(client, $"Sub-{suffix}");
        var group = await CreateGroupAsync(client, $"Grp-{suffix}", [subject.Id]);

        await AssignTeacherAsync(client, teacher.Id, subject.Id, group.Id);
        (await client.PostAsync($"/api/groups/{group.Id}/students/{student.Id}", null)).EnsureSuccessStatusCode();

        var topic = await CreateTopicAsync(client, subject.Id);
        await CreateQuestionAsync(client, topic.Id);
        var yesterday = GetBusinessToday().AddDays(-1);
        var yesterdayLesson = await CreateDailyLessonAsync(client, subject.Id, topic.Id, group.Id, yesterday);

        // Teacher views group journal
        await AuthorizeAsync(client, teacherPhone, "12345A");
        var journal = await client.GetFromJsonAsync<GroupJournalDto>($"/api/group-journals/{group.Id}");
        Assert.NotNull(journal);

        var studentEntry = Assert.Single(Assert.Single(journal.Subjects).Students);
        var lessonScore = Assert.Single(studentEntry.LessonScores);

        // Unsubmitted test ("н"): Score is null, but average is 0, and canEdit is true for yesterday
        Assert.Null(lessonScore.Score);
        Assert.True(lessonScore.CanEdit);
        Assert.Equal(0m, studentEntry.AverageScore);

        // Teacher grades the unsubmitted test ("н") for yesterday's lesson
        using var updateResponse = await client.PutAsJsonAsync(
            $"/api/group-journals/{group.Id}/lessons/{yesterdayLesson.Id}/students/{student.Id}/score",
            new UpdateGroupJournalScoreRequest(85, "Graded unsubmitted test"));
        updateResponse.EnsureSuccessStatusCode();

        // Check journal again: score is 85 and average is 85
        var updatedJournal = await client.GetFromJsonAsync<GroupJournalDto>($"/api/group-journals/{group.Id}");
        Assert.NotNull(updatedJournal);
        var updatedStudent = Assert.Single(Assert.Single(updatedJournal.Subjects).Students);
        var updatedLessonScore = Assert.Single(updatedStudent.LessonScores);

        Assert.Equal(85m, updatedLessonScore.Score);
        Assert.Equal(85m, updatedStudent.AverageScore);
    }

    private static async Task AssignTeacherAsync(
        HttpClient client,
        Guid teacherId,
        Guid subjectId,
        Guid groupId)
    {
        using var subjectResponse = await client.PostAsJsonAsync(
            "/api/teacher-subjects",
            new AssignTeacherSubjectRequest(teacherId, subjectId));
        subjectResponse.EnsureSuccessStatusCode();

        using var groupResponse = await client.PostAsJsonAsync(
            "/api/teacher-assignments",
            new AssignTeacherRequest(teacherId, subjectId, groupId));
        groupResponse.EnsureSuccessStatusCode();
    }

    private static async Task<DailyLessonDto> CreateDailyLessonAsync(
        HttpClient client,
        Guid subjectId,
        Guid topicId,
        Guid groupId,
        DateOnly lessonDate)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/daily-lessons",
            new CreateDailyLessonRequest(subjectId, topicId, lessonDate, "Dashboard lesson", 1, [groupId]));
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<DailyLessonDto>()
            ?? throw new InvalidOperationException("Daily lesson response was empty.");
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

    private static DateOnly GetBusinessToday()
    {
        var businessNow = DateTimeOffset.UtcNow.ToOffset(TimeSpan.FromHours(5));
        return DateOnly.FromDateTime(businessNow.DateTime);
    }
}

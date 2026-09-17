using Microsoft.AspNetCore.Mvc;
using UKStady.API.Auth;
using UKStady.Application.Features.Teaching;
using UKStady.Domain.Enums;

namespace UKStady.API.Endpoints;

public static class TeachingEndpoints
{
    public static IEndpointRouteBuilder MapTeachingEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapTeacherSubjectEndpoints();
        endpoints.MapTopicEndpoints();
        endpoints.MapQuestionEndpoints();
        endpoints.MapDailyLessonEndpoints();
        endpoints.MapGroupJournalEndpoints();
        endpoints.MapTeacherDashboardEndpoint();
        endpoints.MapStudentDashboardEndpoint();

        return endpoints;
    }

    private static void MapTeacherSubjectEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/teacher/subjects", async (
            ITeachingService service,
            CancellationToken cancellationToken) =>
            Results.Ok(await service.GetTeacherSubjectsAsync(cancellationToken)))
            .WithTags("Teacher Subjects")
            .RequireAuthorization(AuthorizationPolicies.Teachers)
            .WithName("GetCurrentTeacherSubjects");
    }

    private static void MapTopicEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/topics")
            .WithTags("Topics")
            .RequireAuthorization(AuthorizationPolicies.EducationStaff);

        group.MapGet("/", async (ITeachingService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.GetTopicsAsync(cancellationToken)))
            .WithName("GetTopics");

        group.MapPost("/", async (
            [FromBody] CreateTopicRequest request,
            ITeachingService service,
            CancellationToken cancellationToken) =>
        {
            if (request.SubjectId == Guid.Empty || string.IsNullOrWhiteSpace(request.Title))
            {
                return Results.BadRequest(new { message = "SubjectId and Title are required." });
            }

            var result = await service.CreateTopicAsync(request, cancellationToken);
            return result is null ? Results.NotFound() : Results.Created($"/api/topics/{result.Id}", result);
        })
        .WithName("CreateTopic");

        group.MapPut("/{id:guid}", async (
            Guid id,
            [FromBody] UpdateTopicRequest request,
            ITeachingService service,
            CancellationToken cancellationToken) =>
        {
            if (string.IsNullOrWhiteSpace(request.Title))
            {
                return Results.BadRequest(new { message = "Title is required." });
            }

            var result = await service.UpdateTopicAsync(id, request, cancellationToken);
            return result is null ? Results.NotFound() : Results.Ok(result);
        })
        .WithName("UpdateTopic");

        group.MapDelete("/{id:guid}", async (
            Guid id,
            ITeachingService service,
            CancellationToken cancellationToken) =>
        {
            var deactivated = await service.DeactivateTopicAsync(id, cancellationToken);
            return deactivated ? Results.NoContent() : Results.NotFound();
        })
        .WithName("DeactivateTopic");
    }

    private static void MapQuestionEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/questions")
            .WithTags("Questions")
            .RequireAuthorization(AuthorizationPolicies.EducationStaff);

        group.MapGet("/by-topic/{topicId:guid}", async (
            Guid topicId,
            ITeachingService service,
            CancellationToken cancellationToken) =>
            Results.Ok(await service.GetQuestionsAsync(topicId, cancellationToken)))
            .WithName("GetQuestionsByTopic");

        group.MapPost("/", async (
            [FromBody] CreateQuestionRequest request,
            ITeachingService service,
            CancellationToken cancellationToken) =>
        {
            var validationError = ValidateQuestion(request.Text, request.Type, request.Points, request.Options);
            if (validationError is not null)
            {
                return Results.BadRequest(new { message = validationError });
            }

            var result = await service.CreateQuestionAsync(request, cancellationToken);
            return result is null ? Results.NotFound() : Results.Created($"/api/questions/{result.Id}", result);
        })
        .WithName("CreateQuestion");

        group.MapPut("/{id:guid}", async (
            Guid id,
            [FromBody] UpdateQuestionRequest request,
            ITeachingService service,
            CancellationToken cancellationToken) =>
        {
            var validationError = ValidateQuestion(request.Text, request.Type, request.Points, request.Options);
            if (validationError is not null)
            {
                return Results.BadRequest(new { message = validationError });
            }

            var result = await service.UpdateQuestionAsync(id, request, cancellationToken);
            return result is null ? Results.NotFound() : Results.Ok(result);
        })
        .WithName("UpdateQuestion");

        group.MapDelete("/{id:guid}", async (
            Guid id,
            ITeachingService service,
            CancellationToken cancellationToken) =>
        {
            var deactivated = await service.DeactivateQuestionAsync(id, cancellationToken);
            return deactivated ? Results.NoContent() : Results.NotFound();
        })
        .WithName("DeactivateQuestion");
    }

    private static void MapDailyLessonEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/daily-lessons")
            .WithTags("Daily Lessons")
            .RequireAuthorization(AuthorizationPolicies.EducationStaff);

        group.MapGet("/", async (ITeachingService service, CancellationToken cancellationToken) =>
            Results.Ok(await service.GetDailyLessonsAsync(cancellationToken)))
            .WithName("GetDailyLessons");

        group.MapPost("/", async (
            [FromBody] CreateDailyLessonRequest request,
            ITeachingService service,
            CancellationToken cancellationToken) =>
        {
            if (request.SubjectId == Guid.Empty ||
                request.TopicId == Guid.Empty ||
                string.IsNullOrWhiteSpace(request.Title) ||
                request.QuestionCount <= 0 ||
                request.GroupIds.Count == 0)
            {
                return Results.BadRequest(new
                {
                    message = "SubjectId, TopicId, Title, positive QuestionCount and GroupIds are required."
                });
            }

            var result = await service.CreateDailyLessonAsync(request, cancellationToken);
            return result is null ? Results.BadRequest(new { message = "Daily lesson cannot be created." }) : Results.Created($"/api/daily-lessons/{result.Id}", result);
        })
        .WithName("CreateDailyLesson");
    }

    private static void MapGroupJournalEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/group-journals")
            .WithTags("Group Journals")
            .RequireAuthorization(AuthorizationPolicies.EducationStaff);

        group.MapGet("/{groupId:guid}", async (
            Guid groupId,
            ITeachingService service,
            CancellationToken cancellationToken) =>
        {
            var result = await service.GetGroupJournalAsync(groupId, cancellationToken);
            return result is null ? Results.NotFound() : Results.Ok(result);
        })
        .WithName("GetGroupJournal");

        group.MapPost("/{groupId:guid}/today-lessons", async (
            Guid groupId,
            [FromBody] CreateTodayGroupLessonRequest request,
            ITeachingService service,
            CancellationToken cancellationToken) =>
        {
            if (request.SubjectId == Guid.Empty)
            {
                return Results.BadRequest(new { message = "SubjectId is required." });
            }

            var result = await service.CreateTodayGroupLessonAsync(groupId, request, cancellationToken);
            if (result is null)
            {
                return Results.BadRequest(new { message = "Today lesson cannot be created." });
            }

            return result.Created
                ? Results.Created($"/api/daily-lessons/{result.Lesson.Id}", result)
                : Results.Ok(result);
        })
        .WithName("CreateTodayGroupLesson");

        group.MapPut("/{groupId:guid}/lessons/{lessonId:guid}/topic", async (
            Guid groupId,
            Guid lessonId,
            [FromBody] UpdateDailyLessonTopicRequest request,
            ITeachingService service,
            CancellationToken cancellationToken) =>
        {
            if (request.TopicId == Guid.Empty)
            {
                return Results.BadRequest(new { message = "TopicId is required." });
            }

            var result = await service.UpdateDailyLessonTopicAsync(groupId, lessonId, request, cancellationToken);
            return result is null ? Results.BadRequest(new { message = "Lesson topic cannot be updated." }) : Results.Ok(result);
        })
        .WithName("UpdateGroupLessonTopic");

        group.MapPut("/{groupId:guid}/lessons/{lessonId:guid}/students/{studentId:guid}/score", async (
            Guid groupId,
            Guid lessonId,
            Guid studentId,
            [FromBody] UpdateGroupJournalScoreRequest request,
            ITeachingService service,
            CancellationToken cancellationToken) =>
        {
            if (request.Score is < 0 or > 100)
            {
                return Results.BadRequest(new { message = "Score must be between 0 and 100." });
            }

            var result = await service.UpdateGroupJournalScoreAsync(groupId, lessonId, studentId, request, cancellationToken);
            return result is null ? Results.BadRequest(new { message = "Score cannot be updated." }) : Results.Ok(result);
        })
        .RequireAuthorization(AuthorizationPolicies.Teachers)
        .WithName("UpdateGroupJournalScore");
    }

    private static void MapTeacherDashboardEndpoint(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/teacher/dashboard", async (
            ITeachingService service,
            CancellationToken cancellationToken) =>
            Results.Ok(await service.GetTeacherDashboardAsync(cancellationToken)))
            .WithTags("Teacher Dashboard")
            .RequireAuthorization(AuthorizationPolicies.EducationStaff)
            .WithName("GetTeacherDashboard");

        endpoints.MapGet("/api/teacher/dashboard/groups", async (
            ITeachingService service,
            CancellationToken cancellationToken) =>
            Results.Ok(await service.GetTeacherDashboardGroupsAsync(cancellationToken)))
            .WithTags("Teacher Dashboard")
            .RequireAuthorization(AuthorizationPolicies.Teachers)
            .WithName("GetTeacherDashboardGroups");

        endpoints.MapGet("/api/teacher/dashboard/daily-results", async (
            [FromQuery] DateOnly? date,
            [FromQuery] Guid? groupId,
            [FromQuery] string? sort,
            ITeachingService service,
            CancellationToken cancellationToken) =>
            Results.Ok(await service.GetTeacherDashboardDailyResultsAsync(date, groupId, sort, cancellationToken)))
            .WithTags("Teacher Dashboard")
            .RequireAuthorization(AuthorizationPolicies.Teachers)
            .WithName("GetTeacherDashboardDailyResults");
    }

    private static void MapStudentDashboardEndpoint(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/api/student/dashboard", async (
            ITeachingService service,
            CancellationToken cancellationToken) =>
            Results.Ok(await service.GetStudentDashboardAsync(cancellationToken)))
            .WithTags("Student Dashboard")
            .RequireAuthorization(AuthorizationPolicies.Students)
            .WithName("GetStudentDashboard");
    }

    private static string? ValidateQuestion(
        string text,
        QuestionType type,
        int points,
        IReadOnlyList<CreateQuestionOptionRequest> options)
    {
        if (string.IsNullOrWhiteSpace(text))
        {
            return "Question text is required.";
        }

        if (points <= 0)
        {
            return "Question points must be positive.";
        }

        if (options.Any(option => string.IsNullOrWhiteSpace(option.Text)))
        {
            return "Every option must have text.";
        }

        if (options.Select(option => option.SortOrder).Distinct().Count() != options.Count)
        {
            return "Option sort orders must be unique.";
        }

        var correctCount = options.Count(option => option.IsCorrect);

        return type switch
        {
            QuestionType.ClosedAnswer when options.Count != 1 || correctCount != 1 => "Closed answer questions require exactly one correct text answer.",
            QuestionType.OpenAnswer when options.Count != 1 || correctCount != 1 => "Closed answer questions require exactly one correct text answer.",
            QuestionType.SingleChoice when options.Count != 4 => "Single choice questions require exactly four options.",
            QuestionType.SingleChoice when correctCount != 1 => "Single choice questions require exactly one correct option.",
            _ => null
        };
    }
}

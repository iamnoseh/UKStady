using UKStady.Domain.Enums;

namespace UKStady.Application.Features.Teaching;

public sealed record TopicDto(
    Guid Id,
    Guid SubjectId,
    string SubjectName,
    string Title,
    string? Description,
    bool IsActive,
    int QuestionCount);

public sealed record CreateTopicRequest(Guid SubjectId, string Title, string? Description);

public sealed record UpdateTopicRequest(string Title, string? Description, bool IsActive);

public sealed record QuestionOptionDto(Guid Id, string Text, bool IsCorrect, int SortOrder);

public sealed record QuestionDto(
    Guid Id,
    Guid TopicId,
    string Text,
    QuestionType Type,
    int Points,
    bool IsActive,
    IReadOnlyList<QuestionOptionDto> Options);

public sealed record CreateQuestionOptionRequest(string Text, bool IsCorrect, int SortOrder);

public sealed record CreateQuestionRequest(
    Guid TopicId,
    string Text,
    QuestionType Type,
    int Points,
    IReadOnlyList<CreateQuestionOptionRequest> Options);

public sealed record UpdateQuestionRequest(
    string Text,
    QuestionType Type,
    int Points,
    bool IsActive,
    IReadOnlyList<CreateQuestionOptionRequest> Options);

public sealed record DailyLessonDto(
    Guid Id,
    Guid TeacherId,
    Guid SubjectId,
    string SubjectName,
    Guid TopicId,
    string TopicTitle,
    DateOnly LessonDate,
    string Title,
    int QuestionCount,
    DateTimeOffset OpensAtUtc,
    DateTimeOffset ClosesAtUtc,
    IReadOnlyList<Guid> AssignedGroupIds);

public sealed record CreateDailyLessonRequest(
    Guid SubjectId,
    Guid TopicId,
    DateOnly LessonDate,
    string Title,
    int QuestionCount,
    IReadOnlyList<Guid> GroupIds);

public sealed record TeacherDashboardDto(
    int Topics,
    int ActiveQuestions,
    int DailyLessons,
    int AssignedGroups);


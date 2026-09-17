using UKStady.Domain.Enums;

namespace UKStady.Application.Features.Teaching;

public sealed record TeacherSubjectDto(
    Guid Id,
    string Name,
    string? Description,
    bool IsActive,
    int TopicCount,
    int QuestionCount);

public sealed record TopicDto(
    Guid Id,
    Guid SubjectId,
    string SubjectName,
    string Title,
    string? Description,
    string? Source,
    string? Grade,
    bool IsActive,
    int QuestionCount);

public sealed record CreateTopicRequest(Guid SubjectId, string Title, string? Description, string? Source, string? Grade);

public sealed record UpdateTopicRequest(string Title, string? Description, string? Source, string? Grade, bool IsActive);

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
    Guid? TopicId,
    string? TopicTitle,
    DateOnly LessonDate,
    string Title,
    int QuestionCount,
    DateTimeOffset OpensAtUtc,
    DateTimeOffset ClosesAtUtc,
    IReadOnlyList<Guid> AssignedGroupIds);

public sealed record CreateDailyLessonRequest(
    Guid SubjectId,
    Guid? TopicId,
    DateOnly LessonDate,
    string Title,
    int QuestionCount,
    IReadOnlyList<Guid> GroupIds);

public sealed record CreateTodayGroupLessonRequest(Guid SubjectId);

public sealed record UpdateDailyLessonTopicRequest(Guid TopicId);

public sealed record CreateTodayGroupLessonResult(DailyLessonDto Lesson, bool Created);

public sealed record GroupJournalDto(
    Guid GroupId,
    string GroupName,
    DateOnly Today,
    IReadOnlyList<GroupSubjectJournalDto> Subjects);

public sealed record GroupSubjectJournalDto(
    Guid SubjectId,
    string SubjectName,
    Guid? TodayLessonId,
    Guid? TodayTopicId,
    string? TodayTopicTitle,
    int TodayQuestionCount,
    decimal? AverageScore,
    IReadOnlyList<GroupJournalLessonDto> Lessons,
    IReadOnlyList<GroupJournalStudentDto> Students);

public sealed record GroupJournalLessonDto(
    Guid Id,
    DateOnly LessonDate,
    string Title,
    Guid? TopicId,
    string? TopicTitle,
    int QuestionCount);

public sealed record GroupJournalStudentDto(
    Guid StudentId,
    string FullName,
    string PhoneNumber,
    decimal? TodayScore,
    decimal? AverageScore,
    string Status,
    IReadOnlyList<GroupJournalLessonScoreDto> LessonScores);

public sealed record GroupJournalLessonScoreDto(
    Guid LessonId,
    decimal? Score,
    string Status,
    bool IsAdjusted,
    bool CanEdit);

public sealed record UpdateGroupJournalScoreRequest(
    decimal Score,
    string? Reason);

public sealed record TeacherDashboardDto(
    int Topics,
    int ActiveQuestions,
    int DailyLessons,
    int AssignedGroups);

public sealed record TeacherDashboardGroupDto(
    Guid Id,
    string Name,
    string Branch,
    int StudentCount);

public sealed record TeacherDashboardDailyResultsDto(
    DateOnly Date,
    int TotalResults,
    decimal? AverageScore,
    IReadOnlyList<TeacherDashboardStudentResultDto> Results);

public sealed record TeacherDashboardStudentResultDto(
    Guid StudentId,
    string StudentName,
    string PhoneNumber,
    Guid GroupId,
    string GroupName,
    string Branch,
    Guid SubjectId,
    string SubjectName,
    Guid? DailyLessonId,
    string? LessonTitle,
    Guid? TopicId,
    string? TopicTitle,
    decimal? Score,
    string AttendanceStatus);

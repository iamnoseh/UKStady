namespace UKStady.Application.Features.Teaching;

public interface ITeachingService
{
    Task<IReadOnlyList<TeacherSubjectDto>> GetTeacherSubjectsAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<TopicDto>> GetTopicsAsync(CancellationToken cancellationToken);

    Task<TopicDto?> CreateTopicAsync(CreateTopicRequest request, CancellationToken cancellationToken);

    Task<TopicDto?> UpdateTopicAsync(Guid id, UpdateTopicRequest request, CancellationToken cancellationToken);

    Task<bool> DeactivateTopicAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<QuestionDto>> GetQuestionsAsync(Guid topicId, CancellationToken cancellationToken);

    Task<QuestionDto?> CreateQuestionAsync(CreateQuestionRequest request, CancellationToken cancellationToken);

    Task<QuestionDto?> UpdateQuestionAsync(Guid id, UpdateQuestionRequest request, CancellationToken cancellationToken);

    Task<bool> DeactivateQuestionAsync(Guid id, CancellationToken cancellationToken);

    Task<DailyLessonDto?> CreateDailyLessonAsync(CreateDailyLessonRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<DailyLessonDto>> GetDailyLessonsAsync(CancellationToken cancellationToken);

    Task<GroupJournalDto?> GetGroupJournalAsync(Guid groupId, CancellationToken cancellationToken);

    Task<CreateTodayGroupLessonResult?> CreateTodayGroupLessonAsync(
        Guid groupId,
        CreateTodayGroupLessonRequest request,
        CancellationToken cancellationToken);

    Task<DailyLessonDto?> UpdateDailyLessonTopicAsync(
        Guid groupId,
        Guid lessonId,
        UpdateDailyLessonTopicRequest request,
        CancellationToken cancellationToken);

    Task<GroupJournalLessonScoreDto?> UpdateGroupJournalScoreAsync(
        Guid groupId,
        Guid lessonId,
        Guid studentId,
        UpdateGroupJournalScoreRequest request,
        CancellationToken cancellationToken);

    Task<TeacherDashboardDto> GetTeacherDashboardAsync(CancellationToken cancellationToken);

    Task<IReadOnlyList<TeacherDashboardGroupDto>> GetTeacherDashboardGroupsAsync(
        CancellationToken cancellationToken);

    Task<TeacherDashboardDailyResultsDto> GetTeacherDashboardDailyResultsAsync(
        DateOnly? date,
        Guid? groupId,
        string? sort,
        CancellationToken cancellationToken);

    Task<StudentDashboardDto> GetStudentDashboardAsync(CancellationToken cancellationToken);
}

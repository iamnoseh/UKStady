namespace UKStady.Application.Features.Teaching;

public interface ITeachingService
{
    Task<IReadOnlyList<TopicDto>> GetTopicsAsync(CancellationToken cancellationToken);

    Task<TopicDto?> CreateTopicAsync(CreateTopicRequest request, CancellationToken cancellationToken);

    Task<TopicDto?> UpdateTopicAsync(Guid id, UpdateTopicRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<QuestionDto>> GetQuestionsAsync(Guid topicId, CancellationToken cancellationToken);

    Task<QuestionDto?> CreateQuestionAsync(CreateQuestionRequest request, CancellationToken cancellationToken);

    Task<QuestionDto?> UpdateQuestionAsync(Guid id, UpdateQuestionRequest request, CancellationToken cancellationToken);

    Task<bool> DeactivateQuestionAsync(Guid id, CancellationToken cancellationToken);

    Task<DailyLessonDto?> CreateDailyLessonAsync(CreateDailyLessonRequest request, CancellationToken cancellationToken);

    Task<IReadOnlyList<DailyLessonDto>> GetDailyLessonsAsync(CancellationToken cancellationToken);

    Task<TeacherDashboardDto> GetTeacherDashboardAsync(CancellationToken cancellationToken);
}


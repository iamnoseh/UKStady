using Microsoft.EntityFrameworkCore;
using UKStady.Application.Common.Interfaces;
using UKStady.Domain.Entities;
using UKStady.Domain.Enums;

namespace UKStady.Application.Features.Teaching;

public sealed class TeachingService : ITeachingService
{
    private readonly IAppDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly ITimeZoneProvider _timeZoneProvider;

    public TeachingService(
        IAppDbContext dbContext,
        ICurrentUserService currentUserService,
        ITimeZoneProvider timeZoneProvider)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _timeZoneProvider = timeZoneProvider;
    }

    public async Task<IReadOnlyList<TopicDto>> GetTopicsAsync(CancellationToken cancellationToken)
    {
        var query = _dbContext.Topics.AsNoTracking();

        if (IsTeacher())
        {
            var teacherId = RequireCurrentUserId();
            query = query.Where(topic =>
                _dbContext.TeacherSubjectGroups.Any(assignment =>
                    assignment.TeacherId == teacherId && assignment.SubjectId == topic.SubjectId) ||
                _dbContext.TeacherSubjects.Any(assignment =>
                    assignment.TeacherId == teacherId && assignment.SubjectId == topic.SubjectId));
        }

        return await query
            .OrderBy(topic => topic.Subject.Name)
            .ThenBy(topic => topic.Title)
            .Select(topic => new TopicDto(
                topic.Id,
                topic.SubjectId,
                topic.Subject.Name,
                topic.Title,
                topic.Description,
                topic.Source,
                topic.Grade,
                topic.IsActive,
                topic.Questions.Count(question => question.IsActive)))
            .ToListAsync(cancellationToken);
    }

    public async Task<TopicDto?> CreateTopicAsync(CreateTopicRequest request, CancellationToken cancellationToken)
    {
        if (!await CanUseSubjectAsync(request.SubjectId, cancellationToken))
        {
            return null;
        }

        var topic = new Topic
        {
            SubjectId = request.SubjectId,
            Title = request.Title.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Source = string.IsNullOrWhiteSpace(request.Source) ? null : request.Source.Trim(),
            Grade = string.IsNullOrWhiteSpace(request.Grade) ? null : request.Grade.Trim(),
            IsActive = true
        };

        _dbContext.Topics.Add(topic);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetTopicDtoAsync(topic.Id, cancellationToken);
    }

    public async Task<TopicDto?> UpdateTopicAsync(Guid id, UpdateTopicRequest request, CancellationToken cancellationToken)
    {
        var topic = await _dbContext.Topics.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (topic is null || !await CanUseSubjectAsync(topic.SubjectId, cancellationToken))
        {
            return null;
        }

        topic.Title = request.Title.Trim();
        topic.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        topic.Source = string.IsNullOrWhiteSpace(request.Source) ? null : request.Source.Trim();
        topic.Grade = string.IsNullOrWhiteSpace(request.Grade) ? null : request.Grade.Trim();
        topic.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetTopicDtoAsync(topic.Id, cancellationToken);
    }

    public async Task<bool> DeactivateTopicAsync(Guid id, CancellationToken cancellationToken)
    {
        var topic = await _dbContext.Topics.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (topic is null || !await CanUseSubjectAsync(topic.SubjectId, cancellationToken))
        {
            return false;
        }

        topic.IsActive = false;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<QuestionDto>> GetQuestionsAsync(Guid topicId, CancellationToken cancellationToken)
    {
        var topic = await _dbContext.Topics
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == topicId, cancellationToken);

        if (topic is null || !await CanUseSubjectAsync(topic.SubjectId, cancellationToken))
        {
            return [];
        }

        return await _dbContext.Questions
            .AsNoTracking()
            .Where(question => question.TopicId == topicId)
            .OrderBy(question => question.CreatedAtUtc)
            .Select(question => ToQuestionDto(question))
            .ToListAsync(cancellationToken);
    }

    public async Task<QuestionDto?> CreateQuestionAsync(CreateQuestionRequest request, CancellationToken cancellationToken)
    {
        var topic = await _dbContext.Topics
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == request.TopicId, cancellationToken);

        if (topic is null || !await CanUseSubjectAsync(topic.SubjectId, cancellationToken))
        {
            return null;
        }

        var question = new Question
        {
            TopicId = request.TopicId,
            Text = request.Text.Trim(),
            Type = request.Type,
            Points = request.Points,
            IsActive = true,
            Options = request.Options
                .OrderBy(option => option.SortOrder)
                .Select(option => new QuestionOption
                {
                    Text = option.Text.Trim(),
                    IsCorrect = option.IsCorrect,
                    SortOrder = option.SortOrder
                })
                .ToList()
        };

        _dbContext.Questions.Add(question);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetQuestionDtoAsync(question.Id, cancellationToken);
    }

    public async Task<QuestionDto?> UpdateQuestionAsync(Guid id, UpdateQuestionRequest request, CancellationToken cancellationToken)
    {
        var question = await _dbContext.Questions
            .Include(candidate => candidate.Topic)
            .Include(candidate => candidate.Options)
            .FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);

        if (question is null || !await CanUseSubjectAsync(question.Topic.SubjectId, cancellationToken))
        {
            return null;
        }

        question.Text = request.Text.Trim();
        question.Type = request.Type;
        question.Points = request.Points;
        question.IsActive = request.IsActive;
        question.Options.Clear();

        foreach (var option in request.Options.OrderBy(option => option.SortOrder))
        {
            question.Options.Add(new QuestionOption
            {
                Text = option.Text.Trim(),
                IsCorrect = option.IsCorrect,
                SortOrder = option.SortOrder
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetQuestionDtoAsync(question.Id, cancellationToken);
    }

    public async Task<bool> DeactivateQuestionAsync(Guid id, CancellationToken cancellationToken)
    {
        var question = await _dbContext.Questions
            .Include(candidate => candidate.Topic)
            .FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);

        if (question is null || !await CanUseSubjectAsync(question.Topic.SubjectId, cancellationToken))
        {
            return false;
        }

        question.IsActive = false;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<DailyLessonDto?> CreateDailyLessonAsync(
        CreateDailyLessonRequest request,
        CancellationToken cancellationToken)
    {
        if (!await CanUseSubjectAsync(request.SubjectId, cancellationToken))
        {
            return null;
        }

        var topic = await _dbContext.Topics
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate =>
                candidate.Id == request.TopicId && candidate.SubjectId == request.SubjectId,
                cancellationToken);

        if (topic is null)
        {
            return null;
        }

        var activeQuestionCount = await _dbContext.Questions.CountAsync(
            question => question.TopicId == request.TopicId && question.IsActive,
            cancellationToken);

        if (activeQuestionCount < request.QuestionCount)
        {
            return null;
        }

        if (IsTeacher() && !await TeacherCanUseAllGroupsAsync(request.SubjectId, request.GroupIds, cancellationToken))
        {
            return null;
        }

        var (opensAtUtc, closesAtUtc) = BuildAvailabilityWindow(request.LessonDate);
        var lesson = new DailyLesson
        {
            TeacherId = RequireCurrentUserId(),
            SubjectId = request.SubjectId,
            TopicId = request.TopicId,
            LessonDate = request.LessonDate,
            Title = request.Title.Trim(),
            QuestionCount = request.QuestionCount,
            OpensAtUtc = opensAtUtc,
            ClosesAtUtc = closesAtUtc,
            TestAssignments = request.GroupIds
                .Distinct()
                .Select(groupId => new TestAssignment { GroupId = groupId })
                .ToList()
        };

        _dbContext.DailyLessons.Add(lesson);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetDailyLessonDtoAsync(lesson.Id, cancellationToken);
    }

    public async Task<IReadOnlyList<DailyLessonDto>> GetDailyLessonsAsync(CancellationToken cancellationToken)
    {
        var query = _dbContext.DailyLessons.AsNoTracking();

        if (IsTeacher())
        {
            var teacherId = RequireCurrentUserId();
            query = query.Where(lesson => lesson.TeacherId == teacherId);
        }

        return await query
            .OrderByDescending(lesson => lesson.LessonDate)
            .Select(lesson => ToDailyLessonDto(lesson))
            .ToListAsync(cancellationToken);
    }

    public async Task<TeacherDashboardDto> GetTeacherDashboardAsync(CancellationToken cancellationToken)
    {
        if (!IsTeacher())
        {
            return new TeacherDashboardDto(
                await _dbContext.Topics.CountAsync(cancellationToken),
                await _dbContext.Questions.CountAsync(question => question.IsActive, cancellationToken),
                await _dbContext.DailyLessons.CountAsync(cancellationToken),
                await _dbContext.Groups.CountAsync(group => group.IsActive, cancellationToken));
        }

        var teacherId = RequireCurrentUserId();
        var subjectIds = _dbContext.TeacherSubjectGroups
            .Where(assignment => assignment.TeacherId == teacherId)
            .Select(assignment => assignment.SubjectId);
        var directlyAssignedSubjectIds = _dbContext.TeacherSubjects
            .Where(assignment => assignment.TeacherId == teacherId)
            .Select(assignment => assignment.SubjectId);
        var allSubjectIds = subjectIds.Union(directlyAssignedSubjectIds);

        var topics = await _dbContext.Topics.CountAsync(topic => allSubjectIds.Contains(topic.SubjectId), cancellationToken);
        var activeQuestions = await _dbContext.Questions.CountAsync(
            question => question.IsActive && allSubjectIds.Contains(question.Topic.SubjectId),
            cancellationToken);
        var dailyLessons = await _dbContext.DailyLessons.CountAsync(
            lesson => lesson.TeacherId == teacherId,
            cancellationToken);
        var assignedGroups = await _dbContext.TeacherSubjectGroups
            .Where(assignment => assignment.TeacherId == teacherId)
            .Select(assignment => assignment.GroupId)
            .Distinct()
            .CountAsync(cancellationToken);

        return new TeacherDashboardDto(topics, activeQuestions, dailyLessons, assignedGroups);
    }

    private async Task<TopicDto?> GetTopicDtoAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _dbContext.Topics
            .AsNoTracking()
            .Where(topic => topic.Id == id)
            .Select(topic => new TopicDto(
                topic.Id,
                topic.SubjectId,
                topic.Subject.Name,
                topic.Title,
                topic.Description,
                topic.Source,
                topic.Grade,
                topic.IsActive,
                topic.Questions.Count(question => question.IsActive)))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<QuestionDto?> GetQuestionDtoAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _dbContext.Questions
            .AsNoTracking()
            .Where(question => question.Id == id)
            .Select(question => ToQuestionDto(question))
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task<DailyLessonDto?> GetDailyLessonDtoAsync(Guid id, CancellationToken cancellationToken)
    {
        var lesson = await _dbContext.DailyLessons
            .AsNoTracking()
            .Include(candidate => candidate.Subject)
            .Include(candidate => candidate.Topic)
            .Include(candidate => candidate.TestAssignments)
            .Where(lesson => lesson.Id == id)
            .FirstOrDefaultAsync(cancellationToken);

        return lesson is null ? null : ToDailyLessonDto(lesson);
    }

    private async Task<bool> CanUseSubjectAsync(Guid subjectId, CancellationToken cancellationToken)
    {
        if (!IsTeacher())
        {
            return true;
        }

        var teacherId = RequireCurrentUserId();
        return await _dbContext.TeacherSubjectGroups.AnyAsync(
            assignment => assignment.TeacherId == teacherId && assignment.SubjectId == subjectId,
            cancellationToken) ||
            await _dbContext.TeacherSubjects.AnyAsync(
            assignment => assignment.TeacherId == teacherId && assignment.SubjectId == subjectId,
            cancellationToken);
    }

    private async Task<bool> TeacherCanUseAllGroupsAsync(
        Guid subjectId,
        IEnumerable<Guid> groupIds,
        CancellationToken cancellationToken)
    {
        var teacherId = RequireCurrentUserId();
        var uniqueGroupIds = groupIds.Distinct().ToList();

        var assignedCount = await _dbContext.TeacherSubjectGroups.CountAsync(
            assignment =>
                assignment.TeacherId == teacherId &&
                assignment.SubjectId == subjectId &&
                uniqueGroupIds.Contains(assignment.GroupId),
            cancellationToken);

        return assignedCount == uniqueGroupIds.Count;
    }

    private (DateTimeOffset OpensAtUtc, DateTimeOffset ClosesAtUtc) BuildAvailabilityWindow(DateOnly lessonDate)
    {
        var timeZone = _timeZoneProvider.BusinessTimeZone;
        var opensLocal = lessonDate.ToDateTime(new TimeOnly(20, 0));
        var closesLocal = lessonDate.AddDays(1).ToDateTime(new TimeOnly(7, 0));

        var opensAtUtc = TimeZoneInfo.ConvertTimeToUtc(opensLocal, timeZone);
        var closesAtUtc = TimeZoneInfo.ConvertTimeToUtc(closesLocal, timeZone);

        return (new DateTimeOffset(opensAtUtc, TimeSpan.Zero), new DateTimeOffset(closesAtUtc, TimeSpan.Zero));
    }

    private Guid RequireCurrentUserId()
    {
        return _currentUserService.UserId
            ?? throw new InvalidOperationException("Current user is required for teaching operations.");
    }

    private bool IsTeacher()
    {
        return _currentUserService.Role == UserRole.Teacher.ToString();
    }

    private static QuestionDto ToQuestionDto(Question question)
    {
        return new QuestionDto(
            question.Id,
            question.TopicId,
            question.Text,
            question.Type,
            question.Points,
            question.IsActive,
            question.Options
                .OrderBy(option => option.SortOrder)
                .Select(option => new QuestionOptionDto(
                    option.Id,
                    option.Text,
                    option.IsCorrect,
                    option.SortOrder))
                .ToList());
    }

    private static DailyLessonDto ToDailyLessonDto(DailyLesson lesson)
    {
        return new DailyLessonDto(
            lesson.Id,
            lesson.TeacherId,
            lesson.SubjectId,
            lesson.Subject.Name,
            lesson.TopicId,
            lesson.Topic.Title,
            lesson.LessonDate,
            lesson.Title,
            lesson.QuestionCount,
            lesson.OpensAtUtc,
            lesson.ClosesAtUtc,
            lesson.TestAssignments.Select(assignment => assignment.GroupId).ToList());
    }
}

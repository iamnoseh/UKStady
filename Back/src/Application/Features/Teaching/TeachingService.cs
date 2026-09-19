using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text.Json;
using UKStady.Application.Common.Interfaces;
using UKStady.Domain.Entities;
using UKStady.Domain.Enums;

namespace UKStady.Application.Features.Teaching;

public sealed class TeachingService : ITeachingService
{
    private const int DefaultStudentQuestionCount = 20;

    private readonly IAppDbContext _dbContext;
    private readonly ICurrentUserService _currentUserService;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ITimeZoneProvider _timeZoneProvider;

    public TeachingService(
        IAppDbContext dbContext,
        ICurrentUserService currentUserService,
        IDateTimeProvider dateTimeProvider,
        ITimeZoneProvider timeZoneProvider)
    {
        _dbContext = dbContext;
        _currentUserService = currentUserService;
        _dateTimeProvider = dateTimeProvider;
        _timeZoneProvider = timeZoneProvider;
    }

    public async Task<IReadOnlyList<TeacherSubjectDto>> GetTeacherSubjectsAsync(
        CancellationToken cancellationToken)
    {
        var teacherId = RequireCurrentUserId();
        var directSubjectIds = _dbContext.TeacherSubjects
            .Where(assignment => assignment.TeacherId == teacherId)
            .Select(assignment => assignment.SubjectId);
        var groupSubjectIds = _dbContext.TeacherSubjectGroups
            .Where(assignment => assignment.TeacherId == teacherId)
            .Select(assignment => assignment.SubjectId);
        var assignedSubjectIds = directSubjectIds.Union(groupSubjectIds);

        return await _dbContext.Subjects
            .AsNoTracking()
            .Where(subject => subject.IsActive && assignedSubjectIds.Contains(subject.Id))
            .OrderBy(subject => subject.Name)
            .Select(subject => new TeacherSubjectDto(
                subject.Id,
                subject.Name,
                subject.Description,
                subject.IsActive,
                subject.Topics.Count(topic => topic.IsActive),
                subject.Topics
                    .SelectMany(topic => topic.Questions)
                    .Count(question => question.IsActive)))
            .ToListAsync(cancellationToken);
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
        if (string.Equals(_currentUserService.Role, UserRole.Admin.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

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
        if (string.Equals(_currentUserService.Role, UserRole.Admin.ToString(), StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

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

        if (request.TopicId is null)
        {
            return null;
        }

        var topic = await _dbContext.Topics
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate =>
                candidate.Id == request.TopicId.Value && candidate.SubjectId == request.SubjectId,
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

    public async Task<GroupJournalDto?> GetGroupJournalAsync(Guid groupId, CancellationToken cancellationToken)
    {
        if (!await CanUseGroupAsync(groupId, cancellationToken))
        {
            return null;
        }

        var today = GetCurrentLessonDate();
        var group = await _dbContext.Groups
            .AsNoTracking()
            .Include(candidate => candidate.Subjects)
                .ThenInclude(groupSubject => groupSubject.Subject)
            .Include(candidate => candidate.Students)
                .ThenInclude(groupStudent => groupStudent.Student)
            .FirstOrDefaultAsync(candidate => candidate.Id == groupId, cancellationToken);

        if (group is null)
        {
            return null;
        }

        var subjectIds = group.Subjects.Select(groupSubject => groupSubject.SubjectId).ToList();
        if (IsTeacher())
        {
            var teacherId = RequireCurrentUserId();
            subjectIds = await _dbContext.TeacherSubjectGroups
                .AsNoTracking()
                .Where(assignment =>
                    assignment.TeacherId == teacherId &&
                    assignment.GroupId == groupId &&
                    subjectIds.Contains(assignment.SubjectId))
                .Select(assignment => assignment.SubjectId)
                .Distinct()
                .ToListAsync(cancellationToken);
        }

        var subjectIdSet = subjectIds.ToHashSet();
        var studentIds = group.Students.Select(groupStudent => groupStudent.StudentId).ToList();
        var lessons = await _dbContext.DailyLessons
            .AsNoTracking()
            .Include(lesson => lesson.Topic)
            .Include(lesson => lesson.TestAssignments)
            .Where(lesson =>
                subjectIds.Contains(lesson.SubjectId) &&
                lesson.TestAssignments.Any(assignment => assignment.GroupId == groupId))
            .ToListAsync(cancellationToken);

        var lessonIds = lessons.Select(lesson => lesson.Id).ToList();
        var gradeEntries = await _dbContext.GradeEntries
            .AsNoTracking()
            .Where(grade =>
                lessonIds.Contains(grade.DailyLessonId) &&
                studentIds.Contains(grade.StudentId))
            .Select(grade => new
            {
                grade.DailyLessonId,
                grade.StudentId,
                Score = grade.FinalScore ?? grade.AutoScore,
                grade.AttendanceStatus,
                IsAdjusted = grade.FinalScore.HasValue
            })
            .ToListAsync(cancellationToken);
        var canEditScores = IsTeacher();
        var editableLessonDate = today.AddDays(-1);

        var subjects = group.Subjects
            .Where(groupSubject => subjectIdSet.Contains(groupSubject.SubjectId))
            .OrderBy(groupSubject => groupSubject.Subject.Name)
            .Select(groupSubject =>
            {
                var subjectLessons = lessons
                    .Where(lesson => lesson.SubjectId == groupSubject.SubjectId)
                    .OrderByDescending(lesson => lesson.LessonDate)
                    .ThenByDescending(lesson => lesson.CreatedAtUtc)
                    .Take(50)
                    .OrderBy(lesson => lesson.LessonDate)
                    .ThenBy(lesson => lesson.CreatedAtUtc)
                    .ToList();
                var todayLesson = subjectLessons
                    .OrderByDescending(lesson => lesson.CreatedAtUtc)
                    .FirstOrDefault(lesson => lesson.LessonDate == today);
                var subjectLessonIds = subjectLessons.Select(lesson => lesson.Id).ToHashSet();
                var subjectGrades = gradeEntries
                    .Where(grade => subjectLessonIds.Contains(grade.DailyLessonId))
                    .ToList();

                var students = group.Students
                    .OrderBy(groupStudent => groupStudent.Student.LastName)
                    .ThenBy(groupStudent => groupStudent.Student.FirstName)
                    .Select(groupStudent =>
                    {
                        var studentGrades = subjectGrades
                            .Where(grade => grade.StudentId == groupStudent.StudentId)
                            .ToList();
                        var todayGrade = todayLesson is null
                            ? null
                            : studentGrades.FirstOrDefault(grade => grade.DailyLessonId == todayLesson.Id);
                        var totalScore = subjectLessons.Sum(lesson =>
                        {
                            var lessonGrade = studentGrades.FirstOrDefault(grade => grade.DailyLessonId == lesson.Id);
                            return lessonGrade?.Score ?? 0m;
                        });
                        var average = subjectLessons.Count == 0
                            ? (decimal?)null
                            : Math.Round(totalScore / subjectLessons.Count, 2);
                        var lessonScores = subjectLessons
                            .Select(lesson =>
                            {
                                var lessonGrade = studentGrades.FirstOrDefault(grade => grade.DailyLessonId == lesson.Id);
                                return new GroupJournalLessonScoreDto(
                                    lesson.Id,
                                    lessonGrade?.Score,
                                    lessonGrade?.AttendanceStatus.ToString() ?? "NoGrade",
                                    lessonGrade?.IsAdjusted ?? false,
                                    canEditScores && lesson.LessonDate == editableLessonDate);
                            })
                            .ToList();

                        return new GroupJournalStudentDto(
                            groupStudent.StudentId,
                            $"{groupStudent.Student.FirstName} {groupStudent.Student.LastName}",
                            groupStudent.Student.PhoneNumber,
                            todayGrade?.Score,
                            average,
                            todayGrade?.AttendanceStatus.ToString() ?? "NoGrade",
                            lessonScores);
                    })
                    .OrderByDescending(student => student.AverageScore.HasValue)
                    .ThenByDescending(student => student.AverageScore)
                    .ThenBy(student => student.FullName)
                    .ToList();

                var subjectAverage = students.Count == 0 || !students.Any(student => student.AverageScore.HasValue)
                    ? (decimal?)null
                    : Math.Round(students.Where(student => student.AverageScore.HasValue).Average(student => student.AverageScore!.Value), 2);

                return new GroupSubjectJournalDto(
                    groupSubject.SubjectId,
                    groupSubject.Subject.Name,
                    todayLesson?.Id,
                    todayLesson?.TopicId,
                    todayLesson?.Topic?.Title,
                    todayLesson?.QuestionCount ?? 0,
                    subjectAverage,
                    subjectLessons
                        .Select(lesson => new GroupJournalLessonDto(
                            lesson.Id,
                            lesson.LessonDate,
                            lesson.Title,
                            lesson.TopicId,
                            lesson.Topic?.Title,
                            lesson.QuestionCount))
                        .ToList(),
                    students);
            })
            .ToList();

        return new GroupJournalDto(group.Id, group.Name, today, subjects);
    }

    public async Task<CreateTodayGroupLessonResult?> CreateTodayGroupLessonAsync(
        Guid groupId,
        CreateTodayGroupLessonRequest request,
        CancellationToken cancellationToken)
    {
        if (request.SubjectId == Guid.Empty ||
            !await CanUseSubjectAsync(request.SubjectId, cancellationToken) ||
            !await CanUseGroupAsync(groupId, cancellationToken))
        {
            return null;
        }

        var groupHasSubject = await _dbContext.GroupSubjects.AnyAsync(
            groupSubject => groupSubject.GroupId == groupId && groupSubject.SubjectId == request.SubjectId,
            cancellationToken);

        if (!groupHasSubject)
        {
            return null;
        }

        if (IsTeacher() && !await TeacherCanUseAllGroupsAsync(request.SubjectId, [groupId], cancellationToken))
        {
            return null;
        }

        var today = GetCurrentLessonDate();
        var existingLesson = await _dbContext.DailyLessons
            .AsNoTracking()
            .Include(lesson => lesson.Subject)
            .Include(lesson => lesson.Topic)
            .Include(lesson => lesson.TestAssignments)
            .FirstOrDefaultAsync(lesson =>
                lesson.SubjectId == request.SubjectId &&
                lesson.LessonDate == today &&
                lesson.TestAssignments.Any(assignment => assignment.GroupId == groupId),
                cancellationToken);

        if (existingLesson is not null)
        {
            return new CreateTodayGroupLessonResult(ToDailyLessonDto(existingLesson), false);
        }

        var subject = await _dbContext.Subjects
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == request.SubjectId, cancellationToken);

        if (subject is null)
        {
            return null;
        }

        var (opensAtUtc, closesAtUtc) = BuildAvailabilityWindow(today);
        var lesson = new DailyLesson
        {
            TeacherId = RequireCurrentUserId(),
            SubjectId = request.SubjectId,
            LessonDate = today,
            Title = subject.Name,
            QuestionCount = 0,
            OpensAtUtc = opensAtUtc,
            ClosesAtUtc = closesAtUtc,
            TestAssignments = [new TestAssignment { GroupId = groupId }]
        };

        _dbContext.DailyLessons.Add(lesson);
        await _dbContext.SaveChangesAsync(cancellationToken);

        var createdLesson = await GetDailyLessonDtoAsync(lesson.Id, cancellationToken);
        return createdLesson is null ? null : new CreateTodayGroupLessonResult(createdLesson, true);
    }

    public async Task<DailyLessonDto?> UpdateDailyLessonTopicAsync(
        Guid groupId,
        Guid lessonId,
        UpdateDailyLessonTopicRequest request,
        CancellationToken cancellationToken)
    {
        var lesson = await _dbContext.DailyLessons
            .Include(candidate => candidate.TestAssignments)
            .FirstOrDefaultAsync(candidate =>
                candidate.Id == lessonId &&
                candidate.TestAssignments.Any(assignment => assignment.GroupId == groupId),
                cancellationToken);

        if (lesson is null ||
            !await CanUseSubjectAsync(lesson.SubjectId, cancellationToken) ||
            !await CanUseGroupAsync(groupId, cancellationToken))
        {
            return null;
        }

        var topic = await _dbContext.Topics
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate =>
                candidate.Id == request.TopicId &&
                candidate.SubjectId == lesson.SubjectId &&
                candidate.IsActive,
                cancellationToken);

        if (topic is null)
        {
            return null;
        }

        lesson.TopicId = topic.Id;
        lesson.Title = topic.Title;
        var activeQuestionCount = await _dbContext.Questions.CountAsync(
            question => question.TopicId == topic.Id && question.IsActive,
            cancellationToken);
        lesson.QuestionCount = Math.Min(activeQuestionCount, DefaultStudentQuestionCount);
        var (opensAtUtc, closesAtUtc) = BuildAvailabilityWindow(lesson.LessonDate);
        lesson.OpensAtUtc = opensAtUtc;
        lesson.ClosesAtUtc = closesAtUtc;

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetDailyLessonDtoAsync(lesson.Id, cancellationToken);
    }

    public async Task<GroupJournalLessonScoreDto?> UpdateGroupJournalScoreAsync(
        Guid groupId,
        Guid lessonId,
        Guid studentId,
        UpdateGroupJournalScoreRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsTeacher() || request.Score < 0 || request.Score > 100)
        {
            return null;
        }

        var teacherId = RequireCurrentUserId();
        var editableLessonDate = GetBusinessToday().AddDays(-1);
        var lesson = await _dbContext.DailyLessons
            .FirstOrDefaultAsync(candidate =>
                candidate.Id == lessonId &&
                candidate.LessonDate == editableLessonDate &&
                candidate.TestAssignments.Any(assignment => assignment.GroupId == groupId),
                cancellationToken);

        if (lesson is null)
        {
            return null;
        }

        var canEdit = await _dbContext.TeacherSubjectGroups.AnyAsync(
            assignment =>
                assignment.TeacherId == teacherId &&
                assignment.GroupId == groupId &&
                assignment.SubjectId == lesson.SubjectId,
            cancellationToken);
        if (!canEdit)
        {
            return null;
        }

        var studentInGroup = await _dbContext.GroupStudents.AnyAsync(
            groupStudent => groupStudent.GroupId == groupId && groupStudent.StudentId == studentId,
            cancellationToken);
        if (!studentInGroup)
        {
            return null;
        }

        var grade = await _dbContext.GradeEntries
            .FirstOrDefaultAsync(candidate =>
                candidate.DailyLessonId == lessonId &&
                candidate.StudentId == studentId,
                cancellationToken);
        if (grade is null)
        {
            grade = new GradeEntry
            {
                DailyLessonId = lessonId,
                StudentId = studentId,
                AttendanceStatus = AttendanceStatus.Present,
                AutoScore = 0
            };
            _dbContext.GradeEntries.Add(grade);
        }

        var newScore = Math.Round(request.Score, 2);
        var previousScore = grade.FinalScore ?? grade.AutoScore;
        grade.FinalScore = newScore;
        grade.GradedByTeacherId = teacherId;
        grade.GradedAtUtc = _dateTimeProvider.UtcNow;
        grade.TeacherComment = string.IsNullOrWhiteSpace(request.Reason)
            ? grade.TeacherComment
            : request.Reason.Trim();

        _dbContext.GradeAuditLogs.Add(new GradeAuditLog
        {
            GradeEntryId = grade.Id,
            ChangedByUserId = teacherId,
            PreviousFinalScore = previousScore,
            NewFinalScore = newScore,
            Reason = string.IsNullOrWhiteSpace(request.Reason)
                ? "Daily teacher adjustment"
                : request.Reason.Trim()
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new GroupJournalLessonScoreDto(
            lessonId,
            newScore,
            grade.AttendanceStatus.ToString(),
            true,
            true);
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

    public async Task<IReadOnlyList<TeacherDashboardGroupDto>> GetTeacherDashboardGroupsAsync(
        CancellationToken cancellationToken)
    {
        var teacherId = RequireCurrentUserId();

        return await _dbContext.Groups
            .AsNoTracking()
            .Where(group => group.IsActive && group.TeacherAssignments.Any(
                assignment => assignment.TeacherId == teacherId))
            .OrderBy(group => group.Name)
            .Select(group => new TeacherDashboardGroupDto(
                group.Id,
                group.Name,
                group.Branch,
                group.Students.Count))
            .ToListAsync(cancellationToken);
    }

    public async Task<TeacherDashboardDailyResultsDto> GetTeacherDashboardDailyResultsAsync(
        DateOnly? date,
        Guid? groupId,
        string? sort,
        CancellationToken cancellationToken)
    {
        var teacherId = RequireCurrentUserId();
        var targetDate = date ?? GetBusinessToday().AddDays(-1);
        var normalizedSort = string.IsNullOrWhiteSpace(sort) ? "scoreAsc" : sort.Trim();

        var assignedPairsQuery = _dbContext.TeacherSubjectGroups
            .AsNoTracking()
            .Where(assignment =>
                assignment.TeacherId == teacherId &&
                assignment.Group.IsActive &&
                assignment.Subject.IsActive);

        if (groupId.HasValue)
        {
            assignedPairsQuery = assignedPairsQuery.Where(assignment => assignment.GroupId == groupId.Value);
        }

        var assignedRows = await assignedPairsQuery
            .SelectMany(
                assignment => _dbContext.GroupStudents
                    .AsNoTracking()
                    .Where(groupStudent =>
                        groupStudent.GroupId == assignment.GroupId &&
                        groupStudent.Student.IsActive &&
                        groupStudent.Student.Role == UserRole.Student),
                (assignment, groupStudent) => new TeacherDashboardStudentSubjectRow(
                    groupStudent.StudentId,
                    groupStudent.Student.FirstName + " " + groupStudent.Student.LastName,
                    groupStudent.Student.PhoneNumber,
                    assignment.GroupId,
                    assignment.Group.Name,
                    assignment.Group.Branch,
                    assignment.SubjectId,
                    assignment.Subject.Name))
            .ToListAsync(cancellationToken);

        var groupIds = assignedRows.Select(row => row.GroupId).Distinct().ToList();
        var subjectIds = assignedRows.Select(row => row.SubjectId).Distinct().ToList();

        var lessonRows = await _dbContext.TestAssignments
            .AsNoTracking()
            .Where(assignment =>
                assignment.Group.IsActive &&
                assignment.DailyLesson.LessonDate == targetDate &&
                groupIds.Contains(assignment.GroupId) &&
                subjectIds.Contains(assignment.DailyLesson.SubjectId) &&
                _dbContext.TeacherSubjectGroups.Any(teacherAssignment =>
                    teacherAssignment.TeacherId == teacherId &&
                    teacherAssignment.GroupId == assignment.GroupId &&
                    teacherAssignment.SubjectId == assignment.DailyLesson.SubjectId))
            .Select(assignment => new TeacherDashboardLessonRow(
                assignment.GroupId,
                assignment.DailyLesson.SubjectId,
                assignment.DailyLessonId,
                assignment.DailyLesson.Title,
                assignment.DailyLesson.TopicId,
                assignment.DailyLesson.Topic == null ? null : assignment.DailyLesson.Topic.Title))
            .ToListAsync(cancellationToken);

        var lessonIds = lessonRows.Select(row => row.DailyLessonId).Distinct().ToList();
        var studentIds = assignedRows.Select(row => row.StudentId).Distinct().ToList();

        var gradeRows = await _dbContext.GradeEntries
            .AsNoTracking()
            .Where(grade =>
                lessonIds.Contains(grade.DailyLessonId) &&
                studentIds.Contains(grade.StudentId))
            .Select(grade => new TeacherDashboardGradeRow(
                grade.DailyLessonId,
                grade.StudentId,
                grade.FinalScore ?? grade.AutoScore,
                grade.AttendanceStatus.ToString()))
            .ToListAsync(cancellationToken);

        var lessonsByGroupSubject = lessonRows
            .GroupBy(row => (row.GroupId, row.SubjectId))
            .ToDictionary(group => group.Key, group => group.OrderBy(row => row.LessonTitle).ToList());
        var gradesByLessonStudent = gradeRows
            .GroupBy(row => (row.DailyLessonId, row.StudentId))
            .ToDictionary(group => group.Key, group => group.First());

        var results = new List<TeacherDashboardStudentResultDto>();
        foreach (var assignedRow in assignedRows)
        {
            if (!lessonsByGroupSubject.TryGetValue((assignedRow.GroupId, assignedRow.SubjectId), out var lessons) || lessons.Count == 0)
            {
                results.Add(new TeacherDashboardStudentResultDto(
                    assignedRow.StudentId,
                    assignedRow.StudentName,
                    assignedRow.PhoneNumber,
                    assignedRow.GroupId,
                    assignedRow.GroupName,
                    assignedRow.Branch,
                    assignedRow.SubjectId,
                    assignedRow.SubjectName,
                    null,
                    null,
                    null,
                    null,
                    null,
                    "NoGrade"));
                continue;
            }

            foreach (var lesson in lessons)
            {
                gradesByLessonStudent.TryGetValue((lesson.DailyLessonId, assignedRow.StudentId), out var grade);
                results.Add(new TeacherDashboardStudentResultDto(
                    assignedRow.StudentId,
                    assignedRow.StudentName,
                    assignedRow.PhoneNumber,
                    assignedRow.GroupId,
                    assignedRow.GroupName,
                    assignedRow.Branch,
                    assignedRow.SubjectId,
                    assignedRow.SubjectName,
                    lesson.DailyLessonId,
                    lesson.LessonTitle,
                    lesson.TopicId,
                    lesson.TopicTitle,
                    grade?.Score,
                    grade?.AttendanceStatus ?? "NoGrade"));
            }
        }

        results = SortTeacherDashboardResults(results, normalizedSort).ToList();
        var scoredResults = results.Where(result => result.Score.HasValue).ToList();
        var averageScore = scoredResults.Count == 0
            ? (decimal?)null
            : Math.Round(scoredResults.Average(result => result.Score!.Value), 2);

        return new TeacherDashboardDailyResultsDto(
            targetDate,
            results.Count,
            averageScore,
            results);
    }

    public async Task<StudentDashboardDto> GetStudentDashboardAsync(CancellationToken cancellationToken)
    {
        if (!IsStudent())
        {
            return new StudentDashboardDto(_dateTimeProvider.UtcNow, []);
        }

        var studentId = RequireCurrentUserId();
        var now = _dateTimeProvider.UtcNow;

        var groupRows = await _dbContext.GroupSubjects
            .AsNoTracking()
            .Where(groupSubject =>
                groupSubject.Group.IsActive &&
                groupSubject.Subject.IsActive &&
                groupSubject.Group.Students.Any(groupStudent => groupStudent.StudentId == studentId))
            .OrderBy(groupSubject => groupSubject.Subject.Name)
            .ThenBy(groupSubject => groupSubject.Group.Name)
            .Select(groupSubject => new StudentSubjectRow(
                groupSubject.GroupId,
                groupSubject.Group.Name,
                groupSubject.SubjectId,
                groupSubject.Subject.Name))
            .ToListAsync(cancellationToken);

        if (groupRows.Count == 0)
        {
            return new StudentDashboardDto(now, []);
        }

        var groupIds = groupRows.Select(row => row.GroupId).Distinct().ToList();
        var subjectIds = groupRows.Select(row => row.SubjectId).Distinct().ToList();
        var lessons = await _dbContext.DailyLessons
            .AsNoTracking()
            .Include(lesson => lesson.Topic)
            .Include(lesson => lesson.TestAssignments)
            .Where(lesson =>
                subjectIds.Contains(lesson.SubjectId) &&
                lesson.TestAssignments.Any(assignment => groupIds.Contains(assignment.GroupId)))
            .OrderByDescending(lesson => lesson.LessonDate)
            .ThenByDescending(lesson => lesson.CreatedAtUtc)
            .ToListAsync(cancellationToken);

        var topicIds = lessons
            .Where(lesson => lesson.TopicId.HasValue)
            .Select(lesson => lesson.TopicId!.Value)
            .Distinct()
            .ToList();
        var assignmentIds = lessons
            .SelectMany(lesson => lesson.TestAssignments)
            .Select(assignment => assignment.Id)
            .Distinct()
            .ToList();
        var attemptStatusesByAssignmentId = await _dbContext.StudentTestAttempts
            .AsNoTracking()
            .Where(attempt =>
                attempt.StudentId == studentId &&
                assignmentIds.Contains(attempt.TestAssignmentId))
            .Select(attempt => new { attempt.TestAssignmentId, attempt.Status })
            .ToDictionaryAsync(row => row.TestAssignmentId, row => row.Status, cancellationToken);
        var activeQuestionCounts = await _dbContext.Questions
            .AsNoTracking()
            .Where(question => topicIds.Contains(question.TopicId) && question.IsActive)
            .GroupBy(question => question.TopicId)
            .Select(group => new { TopicId = group.Key, Count = group.Count() })
            .ToDictionaryAsync(row => row.TopicId, row => row.Count, cancellationToken);

        var subjects = groupRows
            .Select(row =>
            {
                var lesson = lessons
                    .Where(candidate =>
                        candidate.SubjectId == row.SubjectId &&
                        candidate.TestAssignments.Any(assignment => assignment.GroupId == row.GroupId))
                    .OrderByDescending(candidate =>
                    {
                        var (opensAtUtc, closesAtUtc) = BuildAvailabilityWindow(candidate.LessonDate);
                        return now >= opensAtUtc && now <= closesAtUtc;
                    })
                    .ThenByDescending(candidate => candidate.LessonDate)
                    .ThenByDescending(candidate => candidate.CreatedAtUtc)
                    .FirstOrDefault();
                TestStatus? attemptStatus = null;
                var assignment = lesson?.TestAssignments.FirstOrDefault(candidate => candidate.GroupId == row.GroupId);
                if (assignment is not null && attemptStatusesByAssignmentId.TryGetValue(assignment.Id, out var status))
                {
                    attemptStatus = status;
                }

                return ToStudentDashboardSubject(row, lesson, activeQuestionCounts, attemptStatus, now);
            })
            .ToList();

        return new StudentDashboardDto(now, subjects);
    }

    public async Task<StudentJournalDayDto> GetStudentJournalDayAsync(
        DateOnly? date,
        CancellationToken cancellationToken)
    {
        var targetDate = date ?? GetCurrentLessonDate();
        if (!IsStudent())
        {
            return new StudentJournalDayDto(targetDate, []);
        }

        var studentId = RequireCurrentUserId();
        var subjectRows = await _dbContext.GroupSubjects
            .AsNoTracking()
            .Where(groupSubject =>
                groupSubject.Group.IsActive &&
                groupSubject.Subject.IsActive &&
                groupSubject.Group.Students.Any(groupStudent => groupStudent.StudentId == studentId))
            .OrderBy(groupSubject => groupSubject.Subject.Name)
            .ThenBy(groupSubject => groupSubject.Group.Name)
            .Select(groupSubject => new StudentSubjectRow(
                groupSubject.GroupId,
                groupSubject.Group.Name,
                groupSubject.SubjectId,
                groupSubject.Subject.Name))
            .ToListAsync(cancellationToken);

        if (subjectRows.Count == 0)
        {
            return new StudentJournalDayDto(targetDate, []);
        }

        var groupIds = subjectRows.Select(row => row.GroupId).Distinct().ToList();
        var subjectIds = subjectRows.Select(row => row.SubjectId).Distinct().ToList();
        var lessons = await _dbContext.DailyLessons
            .AsNoTracking()
            .Include(lesson => lesson.Topic)
            .Include(lesson => lesson.TestAssignments)
            .Where(lesson =>
                lesson.LessonDate == targetDate &&
                subjectIds.Contains(lesson.SubjectId) &&
                lesson.TestAssignments.Any(assignment => groupIds.Contains(assignment.GroupId)))
            .ToListAsync(cancellationToken);

        var lessonIds = lessons.Select(lesson => lesson.Id).Distinct().ToList();
        var gradesByLessonId = await _dbContext.GradeEntries
            .AsNoTracking()
            .Where(grade => grade.StudentId == studentId && lessonIds.Contains(grade.DailyLessonId))
            .Select(grade => new
            {
                grade.DailyLessonId,
                Score = grade.FinalScore ?? grade.AutoScore,
                grade.AttendanceStatus
            })
            .ToDictionaryAsync(grade => grade.DailyLessonId, cancellationToken);

        var subjects = subjectRows
            .Select(row =>
            {
                var lesson = lessons
                    .Where(candidate =>
                        candidate.SubjectId == row.SubjectId &&
                        candidate.TestAssignments.Any(assignment => assignment.GroupId == row.GroupId))
                    .OrderByDescending(candidate => candidate.CreatedAtUtc)
                    .FirstOrDefault();

                var grade = lesson is null || !gradesByLessonId.TryGetValue(lesson.Id, out var gradeRow)
                    ? null
                    : gradeRow;

                return new StudentJournalSubjectDto(
                    row.GroupId,
                    row.GroupName,
                    row.SubjectId,
                    row.SubjectName,
                    lesson?.Id,
                    lesson?.Topic?.Title,
                    grade?.Score,
                    grade?.AttendanceStatus.ToString() ?? "NoGrade");
            })
            .ToList();

        return new StudentJournalDayDto(targetDate, subjects);
    }

    public async Task<StudentTestActionResult<StudentTestSessionDto>> StartStudentTestAsync(
        Guid dailyLessonId,
        StartStudentTestRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsStudent())
        {
            return StudentTestActionResult<StudentTestSessionDto>.Failure("Only students can start tests.");
        }

        if (request.GroupId == Guid.Empty)
        {
            return StudentTestActionResult<StudentTestSessionDto>.Failure("GroupId is required.");
        }

        var studentId = RequireCurrentUserId();
        var now = _dateTimeProvider.UtcNow;
        var assignment = await _dbContext.TestAssignments
            .Include(candidate => candidate.Group)
            .Include(candidate => candidate.DailyLesson)
                .ThenInclude(lesson => lesson.Subject)
            .Include(candidate => candidate.DailyLesson)
                .ThenInclude(lesson => lesson.Topic)
            .FirstOrDefaultAsync(candidate =>
                candidate.DailyLessonId == dailyLessonId &&
                candidate.GroupId == request.GroupId,
                cancellationToken);

        if (assignment is null)
        {
            return StudentTestActionResult<StudentTestSessionDto>.Failure("Test assignment was not found.");
        }

        var isGroupStudent = await _dbContext.GroupStudents.AnyAsync(
            groupStudent => groupStudent.GroupId == request.GroupId && groupStudent.StudentId == studentId,
            cancellationToken);
        if (!isGroupStudent)
        {
            return StudentTestActionResult<StudentTestSessionDto>.Failure("This test is not assigned to your group.");
        }

        var lesson = assignment.DailyLesson;
        if (lesson.TopicId is null || lesson.Topic is null)
        {
            return StudentTestActionResult<StudentTestSessionDto>.Failure("The lesson topic is not selected yet.");
        }

        var (opensAtUtc, closesAtUtc) = BuildAvailabilityWindow(lesson.LessonDate);
        if (now < opensAtUtc || now > closesAtUtc)
        {
            return StudentTestActionResult<StudentTestSessionDto>.Failure("The test is not open at this time.");
        }

        var existingAttempt = await _dbContext.StudentTestAttempts
            .Include(attempt => attempt.AttemptQuestions)
                .ThenInclude(attemptQuestion => attemptQuestion.Question)
                    .ThenInclude(question => question.Options)
            .Include(attempt => attempt.Answers)
            .FirstOrDefaultAsync(attempt =>
                attempt.TestAssignmentId == assignment.Id &&
                attempt.StudentId == studentId,
                cancellationToken);

        if (existingAttempt is not null)
        {
            if (existingAttempt.Status is TestStatus.Submitted or TestStatus.Graded)
            {
                return StudentTestActionResult<StudentTestSessionDto>.Failure("You have already submitted this test.");
            }

            if (existingAttempt.Status == TestStatus.Expired)
            {
                return StudentTestActionResult<StudentTestSessionDto>.Failure("This test attempt is expired.");
            }

            return StudentTestActionResult<StudentTestSessionDto>.Success(ToStudentTestSessionDto(existingAttempt, assignment));
        }

        var questions = await _dbContext.Questions
            .Include(question => question.Options)
            .Where(question =>
                question.TopicId == lesson.TopicId.Value &&
                question.IsActive)
            .ToListAsync(cancellationToken);

        if (questions.Count < DefaultStudentQuestionCount)
        {
            return StudentTestActionResult<StudentTestSessionDto>.Failure($"At least {DefaultStudentQuestionCount} active questions are required for this topic.");
        }

        var selectedQuestions = Shuffle(questions).Take(DefaultStudentQuestionCount).ToList();
        var attempt = new StudentTestAttempt
        {
            Id = Guid.NewGuid(),
            TestAssignmentId = assignment.Id,
            StudentId = studentId,
            Status = TestStatus.InProgress,
            StartedAtUtc = now
        };

        for (var index = 0; index < selectedQuestions.Count; index++)
        {
            var question = selectedQuestions[index];
            var optionIds = question.Type == QuestionType.SingleChoice
                ? Shuffle(question.Options.ToList()).Select(option => option.Id).ToList()
                : question.Options.OrderBy(option => option.SortOrder).Select(option => option.Id).ToList();

            attempt.AttemptQuestions.Add(new AttemptQuestion
            {
                StudentTestAttemptId = attempt.Id,
                QuestionId = question.Id,
                Question = question,
                SortOrder = index + 1,
                OptionOrderJson = JsonSerializer.Serialize(optionIds)
            });
        }

        _dbContext.StudentTestAttempts.Add(attempt);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return StudentTestActionResult<StudentTestSessionDto>.Success(ToStudentTestSessionDto(attempt, assignment));
    }

    public async Task<StudentTestActionResult<StudentTestAnswerDto>> SaveStudentAnswerAsync(
        Guid attemptId,
        SaveStudentAnswerRequest request,
        CancellationToken cancellationToken)
    {
        if (!IsStudent())
        {
            return StudentTestActionResult<StudentTestAnswerDto>.Failure("Only students can answer tests.");
        }

        var studentId = RequireCurrentUserId();
        var now = _dateTimeProvider.UtcNow;
        var attempt = await _dbContext.StudentTestAttempts
            .Include(candidate => candidate.TestAssignment)
                .ThenInclude(assignment => assignment.DailyLesson)
            .Include(candidate => candidate.AttemptQuestions)
                .ThenInclude(attemptQuestion => attemptQuestion.Question)
                    .ThenInclude(question => question.Options)
            .Include(candidate => candidate.Answers)
            .FirstOrDefaultAsync(candidate => candidate.Id == attemptId, cancellationToken);

        if (attempt is null || attempt.StudentId != studentId)
        {
            return StudentTestActionResult<StudentTestAnswerDto>.Failure("Test attempt was not found.");
        }

        if (attempt.Status != TestStatus.InProgress)
        {
            return StudentTestActionResult<StudentTestAnswerDto>.Failure("This test cannot be changed anymore.");
        }

        var (opensAtUtc, closesAtUtc) = BuildAvailabilityWindow(attempt.TestAssignment.DailyLesson.LessonDate);
        if (now < opensAtUtc || now > closesAtUtc)
        {
            return StudentTestActionResult<StudentTestAnswerDto>.Failure("The test is not open at this time.");
        }

        var attemptQuestion = attempt.AttemptQuestions.FirstOrDefault(candidate => candidate.QuestionId == request.QuestionId);
        if (attemptQuestion is null)
        {
            return StudentTestActionResult<StudentTestAnswerDto>.Failure("This question does not belong to the attempt.");
        }

        var normalizedText = request.AnswerText?.Trim();
        if (attemptQuestion.Question.Type == QuestionType.SingleChoice)
        {
            if (!request.QuestionOptionId.HasValue ||
                !attemptQuestion.Question.Options.Any(option => option.Id == request.QuestionOptionId.Value))
            {
                return StudentTestActionResult<StudentTestAnswerDto>.Failure("Select one answer option.");
            }

            normalizedText = null;
        }
        else if (string.IsNullOrWhiteSpace(normalizedText))
        {
            return StudentTestActionResult<StudentTestAnswerDto>.Failure("Answer text is required.");
        }

        var answer = attempt.Answers.FirstOrDefault(candidate => candidate.QuestionId == request.QuestionId);
        if (answer?.IsChecked == true)
        {
            return StudentTestActionResult<StudentTestAnswerDto>.Failure("This question has already been checked.");
        }

        if (answer is null)
        {
            answer = new StudentAnswer
            {
                Id = Guid.NewGuid(),
                StudentTestAttemptId = attempt.Id,
                QuestionId = request.QuestionId
            };
            _dbContext.StudentAnswers.Add(answer);
        }

        answer.QuestionOptionId = attemptQuestion.Question.Type == QuestionType.SingleChoice ? request.QuestionOptionId : null;
        answer.AnswerText = normalizedText;
        answer.UpdatedAtUtc = now;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return StudentTestActionResult<StudentTestAnswerDto>.Success(new StudentTestAnswerDto(
            answer.QuestionId,
            answer.QuestionOptionId,
            answer.AnswerText,
            answer.IsChecked,
            null));
    }

    public async Task<StudentTestActionResult<StudentTestAnswerDto>> CheckStudentAnswerAsync(
        Guid attemptId,
        Guid questionId,
        CancellationToken cancellationToken)
    {
        if (!IsStudent())
        {
            return StudentTestActionResult<StudentTestAnswerDto>.Failure("Only students can check tests.");
        }

        var studentId = RequireCurrentUserId();
        var now = _dateTimeProvider.UtcNow;
        var attempt = await _dbContext.StudentTestAttempts
            .Include(candidate => candidate.TestAssignment)
                .ThenInclude(assignment => assignment.DailyLesson)
            .Include(candidate => candidate.AttemptQuestions)
                .ThenInclude(attemptQuestion => attemptQuestion.Question)
                    .ThenInclude(question => question.Options)
            .Include(candidate => candidate.Answers)
            .FirstOrDefaultAsync(candidate => candidate.Id == attemptId, cancellationToken);

        if (attempt is null || attempt.StudentId != studentId)
        {
            return StudentTestActionResult<StudentTestAnswerDto>.Failure("Test attempt was not found.");
        }

        if (attempt.Status != TestStatus.InProgress)
        {
            return StudentTestActionResult<StudentTestAnswerDto>.Failure("This test cannot be changed anymore.");
        }

        var (opensAtUtc, closesAtUtc) = BuildAvailabilityWindow(attempt.TestAssignment.DailyLesson.LessonDate);
        if (now < opensAtUtc || now > closesAtUtc)
        {
            return StudentTestActionResult<StudentTestAnswerDto>.Failure("The test is not open at this time.");
        }

        var attemptQuestion = attempt.AttemptQuestions.FirstOrDefault(candidate => candidate.QuestionId == questionId);
        if (attemptQuestion is null)
        {
            return StudentTestActionResult<StudentTestAnswerDto>.Failure("This question does not belong to the attempt.");
        }

        var answer = attempt.Answers.FirstOrDefault(candidate => candidate.QuestionId == questionId);
        if (answer is null)
        {
            answer = new StudentAnswer
            {
                Id = Guid.NewGuid(),
                StudentTestAttemptId = attempt.Id,
                QuestionId = questionId,
                QuestionOptionId = null,
                AnswerText = null,
                IsChecked = true,
                CreatedAtUtc = now,
                UpdatedAtUtc = now
            };
            _dbContext.StudentAnswers.Add(answer);
            attempt.Answers.Add(answer);
            await _dbContext.SaveChangesAsync(cancellationToken);
        }
        else if (!answer.IsChecked)
        {
            answer.IsChecked = true;
            answer.UpdatedAtUtc = now;
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var isCorrect = IsStudentAnswerCorrect(attemptQuestion.Question, answer);

        return StudentTestActionResult<StudentTestAnswerDto>.Success(new StudentTestAnswerDto(
            answer.QuestionId,
            answer.QuestionOptionId,
            answer.AnswerText,
            answer.IsChecked,
            isCorrect));
    }

    public async Task<StudentTestActionResult<StudentTestSubmitResultDto>> SubmitStudentTestAsync(
        Guid attemptId,
        CancellationToken cancellationToken)
    {
        if (!IsStudent())
        {
            return StudentTestActionResult<StudentTestSubmitResultDto>.Failure("Only students can submit tests.");
        }

        var studentId = RequireCurrentUserId();
        var now = _dateTimeProvider.UtcNow;
        var attempt = await _dbContext.StudentTestAttempts
            .Include(candidate => candidate.TestAssignment)
                .ThenInclude(assignment => assignment.DailyLesson)
            .Include(candidate => candidate.AttemptQuestions)
                .ThenInclude(attemptQuestion => attemptQuestion.Question)
                    .ThenInclude(question => question.Options)
            .Include(candidate => candidate.Answers)
            .FirstOrDefaultAsync(candidate => candidate.Id == attemptId, cancellationToken);

        if (attempt is null || attempt.StudentId != studentId)
        {
            return StudentTestActionResult<StudentTestSubmitResultDto>.Failure("Test attempt was not found.");
        }

        if (attempt.Status is TestStatus.Submitted or TestStatus.Graded)
        {
            return StudentTestActionResult<StudentTestSubmitResultDto>.Failure("You have already submitted this test.");
        }

        if (attempt.Status == TestStatus.Expired)
        {
            return StudentTestActionResult<StudentTestSubmitResultDto>.Failure("This test attempt is expired.");
        }

        var (opensAtUtc, closesAtUtc) = BuildAvailabilityWindow(attempt.TestAssignment.DailyLesson.LessonDate);
        if (now > closesAtUtc)
        {
            attempt.Status = TestStatus.Expired;
            attempt.ExpiredAtUtc = now;
            await _dbContext.SaveChangesAsync(cancellationToken);
            return StudentTestActionResult<StudentTestSubmitResultDto>.Failure("The test time has passed.");
        }

        var totalQuestions = attempt.AttemptQuestions.Count;
        if (totalQuestions == 0)
        {
            return StudentTestActionResult<StudentTestSubmitResultDto>.Failure("This attempt has no questions.");
        }

        var hasUnchecked = false;
        foreach (var attemptQuestion in attempt.AttemptQuestions)
        {
            var existingAnswer = attempt.Answers.FirstOrDefault(candidate => candidate.QuestionId == attemptQuestion.QuestionId);
            if (existingAnswer is null)
            {
                existingAnswer = new StudentAnswer
                {
                    Id = Guid.NewGuid(),
                    StudentTestAttemptId = attempt.Id,
                    QuestionId = attemptQuestion.QuestionId,
                    QuestionOptionId = null,
                    AnswerText = null,
                    IsChecked = true,
                    CreatedAtUtc = now,
                    UpdatedAtUtc = now
                };
                _dbContext.StudentAnswers.Add(existingAnswer);
                attempt.Answers.Add(existingAnswer);
                hasUnchecked = true;
            }
            else if (!existingAnswer.IsChecked)
            {
                existingAnswer.IsChecked = true;
                existingAnswer.UpdatedAtUtc = now;
                hasUnchecked = true;
            }
        }

        if (hasUnchecked)
        {
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        var correctAnswers = attempt.AttemptQuestions.Count(attemptQuestion =>
            IsStudentAnswerCorrect(attemptQuestion.Question, attempt.Answers.FirstOrDefault(answer => answer.QuestionId == attemptQuestion.QuestionId)));
        var score = Math.Round((decimal)correctAnswers / totalQuestions * 100m, 2);

        attempt.Status = TestStatus.Submitted;
        attempt.SubmittedAtUtc = now;
        attempt.AutoScore = score;

        var grade = await _dbContext.GradeEntries.FirstOrDefaultAsync(
            candidate =>
                candidate.DailyLessonId == attempt.TestAssignment.DailyLessonId &&
                candidate.StudentId == studentId,
            cancellationToken);

        if (grade is null)
        {
            grade = new GradeEntry
            {
                Id = Guid.NewGuid(),
                DailyLessonId = attempt.TestAssignment.DailyLessonId,
                StudentId = studentId,
                AttendanceStatus = AttendanceStatus.Present
            };
            _dbContext.GradeEntries.Add(grade);
        }

        grade.StudentTestAttemptId = attempt.Id;
        grade.AutoScore = score;
        grade.AttendanceStatus = AttendanceStatus.Present;
        grade.UpdatedAtUtc = now;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return StudentTestActionResult<StudentTestSubmitResultDto>.Success(new StudentTestSubmitResultDto(
            attempt.Id,
            attempt.Status.ToString(),
            totalQuestions,
            correctAnswers,
            score,
            now));
    }

    private StudentDashboardSubjectDto ToStudentDashboardSubject(
        StudentSubjectRow row,
        DailyLesson? lesson,
        IReadOnlyDictionary<Guid, int> activeQuestionCounts,
        TestStatus? attemptStatus,
        DateTimeOffset now)
    {
        if (lesson is null)
        {
            return new StudentDashboardSubjectDto(
                row.GroupId,
                row.GroupName,
                row.SubjectId,
                row.SubjectName,
                null,
                null,
                null,
                0,
                null,
                null,
                false,
                false,
                "NoLesson",
                "Барои ин фан ҳоло дарси тестӣ нест.");
        }

        var activeQuestionCount = lesson.TopicId.HasValue && activeQuestionCounts.TryGetValue(lesson.TopicId.Value, out var count)
            ? count
            : 0;
        var hasTopic = lesson.TopicId.HasValue;
        var hasQuestions = activeQuestionCount >= DefaultStudentQuestionCount;
        var isReady = hasTopic && hasQuestions;
        var (opensAtUtc, closesAtUtc) = BuildAvailabilityWindow(lesson.LessonDate);
        var isOpen = now >= opensAtUtc && now <= closesAtUtc;
        var (status, statusText) = BuildStudentDashboardStatus(lesson, opensAtUtc, closesAtUtc, hasTopic, hasQuestions, isOpen, attemptStatus, now);

        return new StudentDashboardSubjectDto(
            row.GroupId,
            row.GroupName,
            row.SubjectId,
            row.SubjectName,
            lesson.Id,
            lesson.TopicId,
            lesson.Topic?.Title,
            DefaultStudentQuestionCount,
            opensAtUtc,
            closesAtUtc,
            isReady,
            isReady && isOpen && attemptStatus is not (TestStatus.Submitted or TestStatus.Graded or TestStatus.Expired),
            status,
            statusText);
    }

    private (string Status, string StatusText) BuildStudentDashboardStatus(
        DailyLesson lesson,
        DateTimeOffset opensAtUtc,
        DateTimeOffset closesAtUtc,
        bool hasTopic,
        bool hasQuestions,
        bool isOpen,
        TestStatus? attemptStatus,
        DateTimeOffset now)
    {
        if (attemptStatus is TestStatus.Submitted or TestStatus.Graded)
        {
            return ("Completed", "Шумо ин тестро аллакай супоридед.");
        }

        if (attemptStatus == TestStatus.Expired)
        {
            return ("Expired", "Муҳлати супоридани ин тест гузаштааст.");
        }

        if (attemptStatus == TestStatus.InProgress)
        {
            return ("InProgress", "Тест оғоз шудааст. Метавонед идома диҳед.");
        }

        if (!hasTopic)
        {
            return ("MissingTopic", "Мавзӯи дарс ҳанӯз интихоб нашудааст.");
        }

        if (!hasQuestions)
        {
            return ("NotReady", "Саволҳои тест ҳанӯз омода нестанд.");
        }

        if (now < opensAtUtc)
        {
            return ("NotOpenYet", "Вақти супоридани тест ҳанӯз нарасидааст.");
        }

        if (now > closesAtUtc)
        {
            return ("Closed", "Вақти супоридани тест гузашт.");
        }

        return isOpen
            ? ("Available", "Тест барои супоридан кушода аст.")
            : ("Closed", "Тест дастрас нест.");
    }


    private static IEnumerable<TeacherDashboardStudentResultDto> SortTeacherDashboardResults(
        IEnumerable<TeacherDashboardStudentResultDto> results,
        string sort)
    {
        return string.Equals(sort, "scoreDesc", StringComparison.OrdinalIgnoreCase)
            ? results
                .OrderBy(result => result.Score.HasValue ? 0 : 1)
                .ThenByDescending(result => result.Score)
                .ThenBy(result => result.StudentName)
                .ThenBy(result => result.GroupName)
                .ThenBy(result => result.SubjectName)
            : results
                .OrderBy(result => result.Score.HasValue ? 1 : 0)
                .ThenBy(result => result.Score)
                .ThenBy(result => result.StudentName)
                .ThenBy(result => result.GroupName)
                .ThenBy(result => result.SubjectName);
    }

    private sealed record TeacherDashboardStudentSubjectRow(
        Guid StudentId,
        string StudentName,
        string PhoneNumber,
        Guid GroupId,
        string GroupName,
        string Branch,
        Guid SubjectId,
        string SubjectName);

    private sealed record TeacherDashboardLessonRow(
        Guid GroupId,
        Guid SubjectId,
        Guid DailyLessonId,
        string LessonTitle,
        Guid? TopicId,
        string? TopicTitle);

    private sealed record TeacherDashboardGradeRow(
        Guid DailyLessonId,
        Guid StudentId,
        decimal Score,
        string AttendanceStatus);

    private sealed record StudentSubjectRow(
        Guid GroupId,
        string GroupName,
        Guid SubjectId,
        string SubjectName);

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

    private async Task<bool> CanUseGroupAsync(Guid groupId, CancellationToken cancellationToken)
    {
        if (IsStudent())
        {
            var studentId = RequireCurrentUserId();
            return await _dbContext.GroupStudents.AnyAsync(
                groupStudent => groupStudent.GroupId == groupId && groupStudent.StudentId == studentId,
                cancellationToken);
        }

        if (!IsTeacher())
        {
            return await _dbContext.Groups.AnyAsync(group => group.Id == groupId, cancellationToken);
        }

        var teacherId = RequireCurrentUserId();
        return await _dbContext.TeacherSubjectGroups.AnyAsync(
            assignment => assignment.TeacherId == teacherId && assignment.GroupId == groupId,
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

    private DateOnly GetBusinessToday()
    {
        var localNow = TimeZoneInfo.ConvertTime(_dateTimeProvider.UtcNow, _timeZoneProvider.BusinessTimeZone);
        return DateOnly.FromDateTime(localNow.DateTime);
    }

    private DateOnly GetCurrentLessonDate()
    {
        var localNow = TimeZoneInfo.ConvertTime(_dateTimeProvider.UtcNow, _timeZoneProvider.BusinessTimeZone);
        var date = DateOnly.FromDateTime(localNow.DateTime);
        return TimeOnly.FromDateTime(localNow.DateTime) < new TimeOnly(7, 0)
            ? date.AddDays(-1)
            : date;
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

    private bool IsStudent()
    {
        return _currentUserService.Role == UserRole.Student.ToString();
    }

    private StudentTestSessionDto ToStudentTestSessionDto(
        StudentTestAttempt attempt,
        TestAssignment assignment)
    {
        var lesson = assignment.DailyLesson;
        var (opensAtUtc, closesAtUtc) = BuildAvailabilityWindow(lesson.LessonDate);
        var answersByQuestionId = attempt.Answers.ToDictionary(answer => answer.QuestionId);
        var questions = attempt.AttemptQuestions
            .OrderBy(attemptQuestion => attemptQuestion.SortOrder)
            .Select(attemptQuestion =>
            {
                answersByQuestionId.TryGetValue(attemptQuestion.QuestionId, out var answer);
                return new StudentTestQuestionDto(
                    attemptQuestion.QuestionId,
                    attemptQuestion.Question.Text,
                    attemptQuestion.Question.Type,
                    attemptQuestion.SortOrder,
                    answer?.AnswerText,
                    answer?.QuestionOptionId,
                    answer?.IsChecked ?? false,
                    answer?.IsChecked == true ? IsStudentAnswerCorrect(attemptQuestion.Question, answer) : null,
                    BuildStudentQuestionOptions(attemptQuestion));
            })
            .ToList();

        return new StudentTestSessionDto(
            attempt.Id,
            lesson.Id,
            assignment.GroupId,
            assignment.Group.Name,
            lesson.SubjectId,
            lesson.Subject.Name,
            lesson.TopicId!.Value,
            lesson.Topic!.Title,
            opensAtUtc,
            closesAtUtc,
            attempt.Status.ToString(),
            questions);
    }

    private static IReadOnlyList<StudentTestQuestionOptionDto> BuildStudentQuestionOptions(AttemptQuestion attemptQuestion)
    {
        if (attemptQuestion.Question.Type != QuestionType.SingleChoice)
        {
            return [];
        }

        var optionOrder = ParseOptionOrder(attemptQuestion.OptionOrderJson);
        var optionsById = attemptQuestion.Question.Options.ToDictionary(option => option.Id);
        var orderedOptions = optionOrder
            .Where(optionsById.ContainsKey)
            .Select(optionId => optionsById[optionId])
            .Concat(attemptQuestion.Question.Options.Where(option => !optionOrder.Contains(option.Id)).OrderBy(option => option.SortOrder))
            .ToList();

        return orderedOptions
            .Select((option, index) => new StudentTestQuestionOptionDto(option.Id, option.Text, index + 1))
            .ToList();
    }

    private static IReadOnlyList<Guid> ParseOptionOrder(string? optionOrderJson)
    {
        if (string.IsNullOrWhiteSpace(optionOrderJson))
        {
            return [];
        }

        try
        {
            return JsonSerializer.Deserialize<List<Guid>>(optionOrderJson) ?? [];
        }
        catch (JsonException)
        {
            return [];
        }
    }

    private static bool IsStudentAnswerCorrect(Question question, StudentAnswer? answer)
    {
        if (answer is null)
        {
            return false;
        }

        if (question.Type == QuestionType.SingleChoice)
        {
            return answer.QuestionOptionId.HasValue &&
                question.Options.Any(option => option.Id == answer.QuestionOptionId.Value && option.IsCorrect);
        }

        var correctAnswer = question.Options.FirstOrDefault(option => option.IsCorrect)?.Text;
        return !string.IsNullOrWhiteSpace(correctAnswer) &&
            NormalizeStudentAnswer(answer.AnswerText) == NormalizeStudentAnswer(correctAnswer);
    }

    private static string NormalizeStudentAnswer(string? value)
    {
        return string.Join(
            ' ',
            (value ?? string.Empty)
                .Trim()
                .ToUpperInvariant()
                .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
    }

    private static IReadOnlyList<T> Shuffle<T>(IReadOnlyList<T> items)
    {
        var shuffled = items.ToList();
        for (var index = shuffled.Count - 1; index > 0; index--)
        {
            var swapIndex = RandomNumberGenerator.GetInt32(index + 1);
            (shuffled[index], shuffled[swapIndex]) = (shuffled[swapIndex], shuffled[index]);
        }

        return shuffled;
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
            lesson.Topic?.Title,
            lesson.LessonDate,
            lesson.Title,
            lesson.QuestionCount,
            lesson.OpensAtUtc,
            lesson.ClosesAtUtc,
            lesson.TestAssignments.Select(assignment => assignment.GroupId).ToList());
    }
}

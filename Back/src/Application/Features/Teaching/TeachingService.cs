using Microsoft.EntityFrameworkCore;
using UKStady.Application.Common.Interfaces;
using UKStady.Domain.Entities;
using UKStady.Domain.Enums;

namespace UKStady.Application.Features.Teaching;

public sealed class TeachingService : ITeachingService
{
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

        var today = GetBusinessToday();
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
                grade.AttendanceStatus
            })
            .ToListAsync(cancellationToken);

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
                        var average = studentGrades.Count == 0
                            ? (decimal?)null
                            : Math.Round(studentGrades.Average(grade => grade.Score), 2);
                        var lessonScores = subjectLessons
                            .Select(lesson =>
                            {
                                var lessonGrade = studentGrades.FirstOrDefault(grade => grade.DailyLessonId == lesson.Id);
                                return new GroupJournalLessonScoreDto(
                                    lesson.Id,
                                    lessonGrade?.Score,
                                    lessonGrade?.AttendanceStatus.ToString() ?? "NoGrade");
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

                var subjectAverage = subjectGrades.Count == 0
                    ? (decimal?)null
                    : Math.Round(subjectGrades.Average(grade => grade.Score), 2);

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

        var today = GetBusinessToday();
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
        lesson.QuestionCount = await _dbContext.Questions.CountAsync(
            question => question.TopicId == topic.Id && question.IsActive,
            cancellationToken);

        await _dbContext.SaveChangesAsync(cancellationToken);
        return await GetDailyLessonDtoAsync(lesson.Id, cancellationToken);
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
                .OrderBy(result => result.Score.HasValue ? 0 : 1)
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
            lesson.Topic?.Title,
            lesson.LessonDate,
            lesson.Title,
            lesson.QuestionCount,
            lesson.OpensAtUtc,
            lesson.ClosesAtUtc,
            lesson.TestAssignments.Select(assignment => assignment.GroupId).ToList());
    }
}

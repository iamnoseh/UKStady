using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using UKStady.Application.Common.Interfaces;
using UKStady.Domain.Entities;
using UKStady.Domain.Enums;

namespace UKStady.Application.Features.Administration;

public sealed class AdministrationService : IAdministrationService
{
    private const string EnglishLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    private readonly IAppDbContext _dbContext;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IDateTimeProvider _dateTimeProvider;
    private readonly ITimeZoneProvider _timeZoneProvider;

    public AdministrationService(
        IAppDbContext dbContext,
        IPasswordHasher passwordHasher,
        IDateTimeProvider dateTimeProvider,
        ITimeZoneProvider timeZoneProvider)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _dateTimeProvider = dateTimeProvider;
        _timeZoneProvider = timeZoneProvider;
    }

    public async Task<IReadOnlyList<UserDto>> GetUsersAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Users
            .AsNoTracking()
            .OrderBy(user => user.LastName)
            .ThenBy(user => user.FirstName)
            .Select(user => ToUserDto(user))
            .ToListAsync(cancellationToken);
    }

    public async Task<UserDto?> GetUserAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _dbContext.Users
            .AsNoTracking()
            .Where(user => user.Id == id)
            .Select(user => ToUserDto(user))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public GeneratedPasswordDto GenerateUserPassword()
    {
        Span<char> password = stackalloc char[6];

        for (var index = 0; index < 5; index++)
        {
            password[index] = (char)('0' + RandomNumberGenerator.GetInt32(0, 10));
        }

        password[5] = EnglishLetters[RandomNumberGenerator.GetInt32(0, EnglishLetters.Length)];

        for (var index = password.Length - 1; index > 0; index--)
        {
            var swapIndex = RandomNumberGenerator.GetInt32(0, index + 1);
            (password[index], password[swapIndex]) = (password[swapIndex], password[index]);
        }

        return new GeneratedPasswordDto(password.ToString());
    }

    public async Task<UserDto> CreateUserAsync(CreateUserRequest request, CancellationToken cancellationToken)
    {
        var phoneNumber = NormalizePhoneNumber(request.PhoneNumber);
        var user = new User
        {
            FirstName = request.FirstName.Trim(),
            LastName = request.LastName.Trim(),
            MiddleName = string.IsNullOrWhiteSpace(request.MiddleName) ? null : request.MiddleName.Trim(),
            PhoneNumber = phoneNumber,
            UserName = string.IsNullOrWhiteSpace(request.UserName) ? phoneNumber : request.UserName.Trim(),
            PasswordHash = _passwordHasher.Hash(request.Password),
            Role = request.Role,
            IsActive = true
        };

        _dbContext.Users.Add(user);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToUserDto(user);
    }

    public async Task<UserDto?> UpdateUserAsync(Guid id, UpdateUserRequest request, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (user is null)
        {
            return null;
        }

        user.FirstName = request.FirstName.Trim();
        user.LastName = request.LastName.Trim();
        user.MiddleName = string.IsNullOrWhiteSpace(request.MiddleName) ? null : request.MiddleName.Trim();
        user.PhoneNumber = NormalizePhoneNumber(request.PhoneNumber);
        user.UserName = string.IsNullOrWhiteSpace(request.UserName) ? user.PhoneNumber : request.UserName.Trim();
        user.Role = request.Role;
        user.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync(cancellationToken);

        return ToUserDto(user);
    }

    public async Task<bool> DeactivateUserAsync(Guid id, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (user is null)
        {
            return false;
        }

        user.IsActive = false;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<GroupDto>> GetGroupsAsync(CancellationToken cancellationToken)
    {
        var groups = await _dbContext.Groups
            .AsNoTracking()
            .Include(group => group.Students)
            .ThenInclude(groupStudent => groupStudent.Student)
            .Include(group => group.Subjects)
            .ThenInclude(groupSubject => groupSubject.Subject)
            .OrderBy(group => group.Name)
            .ToListAsync(cancellationToken);

        return groups.Select(ToGroupDto).ToList();
    }

    public async Task<GroupDto?> GetGroupAsync(Guid id, CancellationToken cancellationToken)
    {
        var group = await _dbContext.Groups
            .AsNoTracking()
            .Include(candidate => candidate.Students)
            .ThenInclude(groupStudent => groupStudent.Student)
            .Include(candidate => candidate.Subjects)
            .ThenInclude(groupSubject => groupSubject.Subject)
            .Where(group => group.Id == id)
            .FirstOrDefaultAsync(cancellationToken);

        return group is null ? null : ToGroupDto(group);
    }

    public async Task<GroupDto> CreateGroupAsync(CreateGroupRequest request, CancellationToken cancellationToken)
    {
        var subjectIds = request.SubjectIds.Distinct().ToList();
        var existingSubjectIds = await _dbContext.Subjects
            .Where(subject => subjectIds.Contains(subject.Id))
            .Select(subject => subject.Id)
            .ToListAsync(cancellationToken);

        var group = new Group
        {
            Name = request.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            Branch = request.Branch.Trim(),
            IsActive = true
        };

        _dbContext.Groups.Add(group);
        await _dbContext.SaveChangesAsync(cancellationToken);

        foreach (var subjectId in existingSubjectIds)
        {
            _dbContext.GroupSubjects.Add(new GroupSubject
            {
                GroupId = group.Id,
                SubjectId = subjectId,
                AddedAtUtc = _dateTimeProvider.UtcNow
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetGroupAsync(group.Id, cancellationToken)
            ?? throw new InvalidOperationException("Created group could not be loaded.");
    }

    public async Task<GroupDto?> UpdateGroupAsync(Guid id, UpdateGroupRequest request, CancellationToken cancellationToken)
    {
        var group = await _dbContext.Groups
            .Include(candidate => candidate.Subjects)
            .FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (group is null)
        {
            return null;
        }

        group.Name = request.Name.Trim();
        group.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        group.Branch = request.Branch.Trim();
        group.IsActive = request.IsActive;

        var requestedSubjectIds = request.SubjectIds.Distinct().ToHashSet();
        var existingSubjectIds = await _dbContext.Subjects
            .Where(subject => requestedSubjectIds.Contains(subject.Id))
            .Select(subject => subject.Id)
            .ToListAsync(cancellationToken);
        var existingSubjectIdSet = existingSubjectIds.ToHashSet();

        var removedGroupSubjects = group.Subjects
            .Where(item => !existingSubjectIdSet.Contains(item.SubjectId))
            .ToList();
        var removedSubjectIds = removedGroupSubjects
            .Select(item => item.SubjectId)
            .ToList();

        if (removedSubjectIds.Count > 0)
        {
            var obsoleteTeacherAssignments = await _dbContext.TeacherSubjectGroups
                .Where(assignment =>
                    assignment.GroupId == group.Id && removedSubjectIds.Contains(assignment.SubjectId))
                .ToListAsync(cancellationToken);
            _dbContext.TeacherSubjectGroups.RemoveRange(obsoleteTeacherAssignments);
        }

        foreach (var groupSubject in removedGroupSubjects)
        {
            group.Subjects.Remove(groupSubject);
        }

        foreach (var subjectId in existingSubjectIds.Where(subjectId => group.Subjects.All(item => item.SubjectId != subjectId)))
        {
            group.Subjects.Add(new GroupSubject
            {
                GroupId = group.Id,
                SubjectId = subjectId,
                AddedAtUtc = _dateTimeProvider.UtcNow
            });
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return await GetGroupAsync(group.Id, cancellationToken);
    }

    public async Task<bool> DeactivateGroupAsync(Guid id, CancellationToken cancellationToken)
    {
        var group = await _dbContext.Groups.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (group is null)
        {
            return false;
        }

        group.IsActive = false;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> AddStudentToGroupAsync(Guid groupId, Guid studentId, CancellationToken cancellationToken)
    {
        var groupExists = await _dbContext.Groups.AnyAsync(group => group.Id == groupId, cancellationToken);
        var studentExists = await _dbContext.Users.AnyAsync(
            user => user.Id == studentId && user.Role == UserRole.Student,
            cancellationToken);

        if (!groupExists || !studentExists)
        {
            return false;
        }

        var alreadyExists = await _dbContext.GroupStudents.AnyAsync(
            groupStudent => groupStudent.GroupId == groupId && groupStudent.StudentId == studentId,
            cancellationToken);

        if (!alreadyExists)
        {
            _dbContext.GroupStudents.Add(new GroupStudent
            {
                GroupId = groupId,
                StudentId = studentId,
                JoinedAtUtc = _dateTimeProvider.UtcNow
            });
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return true;
    }

    public async Task<bool> RemoveStudentFromGroupAsync(Guid groupId, Guid studentId, CancellationToken cancellationToken)
    {
        var groupStudent = await _dbContext.GroupStudents.FirstOrDefaultAsync(
            item => item.GroupId == groupId && item.StudentId == studentId,
            cancellationToken);

        if (groupStudent is null)
        {
            return false;
        }

        _dbContext.GroupStudents.Remove(groupStudent);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<SubjectDto>> GetSubjectsAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.Subjects
            .AsNoTracking()
            .OrderBy(subject => subject.Name)
            .Select(subject => new SubjectDto(
                subject.Id,
                subject.Name,
                subject.Description,
                subject.IsActive,
                subject.Topics.Count,
                subject.Topics.SelectMany(topic => topic.Questions).Count(question => question.IsActive)))
            .ToListAsync(cancellationToken);
    }

    public async Task<SubjectDto?> GetSubjectAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _dbContext.Subjects
            .AsNoTracking()
            .Where(subject => subject.Id == id)
            .Select(subject => new SubjectDto(
                subject.Id,
                subject.Name,
                subject.Description,
                subject.IsActive,
                subject.Topics.Count,
                subject.Topics.SelectMany(topic => topic.Questions).Count(question => question.IsActive)))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<SubjectDto> CreateSubjectAsync(CreateSubjectRequest request, CancellationToken cancellationToken)
    {
        var subject = new Subject
        {
            Name = request.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            IsActive = true
        };

        _dbContext.Subjects.Add(subject);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new SubjectDto(subject.Id, subject.Name, subject.Description, subject.IsActive, 0, 0);
    }

    public async Task<SubjectDto?> UpdateSubjectAsync(Guid id, UpdateSubjectRequest request, CancellationToken cancellationToken)
    {
        var subject = await _dbContext.Subjects.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (subject is null)
        {
            return null;
        }

        subject.Name = request.Name.Trim();
        subject.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        subject.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var topicCount = await _dbContext.Topics.CountAsync(topic => topic.SubjectId == id, cancellationToken);
        var questionCount = await _dbContext.Questions.CountAsync(
            question => question.Topic.SubjectId == id && question.IsActive,
            cancellationToken);
        return new SubjectDto(subject.Id, subject.Name, subject.Description, subject.IsActive, topicCount, questionCount);
    }

    public async Task<bool> DeactivateSubjectAsync(Guid id, CancellationToken cancellationToken)
    {
        var subject = await _dbContext.Subjects.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (subject is null)
        {
            return false;
        }

        subject.IsActive = false;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<TeacherSubjectAssignmentDto?> AssignTeacherSubjectAsync(
        AssignTeacherSubjectRequest request,
        CancellationToken cancellationToken)
    {
        var teacher = await _dbContext.Users.FirstOrDefaultAsync(
            user => user.Id == request.TeacherId && user.Role == UserRole.Teacher && user.IsActive,
            cancellationToken);
        var subject = await _dbContext.Subjects.FirstOrDefaultAsync(
            candidate => candidate.Id == request.SubjectId && candidate.IsActive,
            cancellationToken);

        if (teacher is null || subject is null)
        {
            return null;
        }

        var alreadyExists = await _dbContext.TeacherSubjects.AnyAsync(
            assignment => assignment.TeacherId == request.TeacherId && assignment.SubjectId == request.SubjectId,
            cancellationToken);

        if (!alreadyExists)
        {
            _dbContext.TeacherSubjects.Add(new TeacherSubject
            {
                TeacherId = request.TeacherId,
                SubjectId = request.SubjectId,
                AssignedAtUtc = _dateTimeProvider.UtcNow
            });
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return new TeacherSubjectAssignmentDto(
            teacher.Id,
            $"{teacher.FirstName} {teacher.LastName}",
            subject.Id,
            subject.Name,
            _dateTimeProvider.UtcNow);
    }

    public async Task<bool> RemoveTeacherSubjectAsync(
        Guid teacherId,
        Guid subjectId,
        CancellationToken cancellationToken)
    {
        var assignment = await _dbContext.TeacherSubjects.FirstOrDefaultAsync(
            item => item.TeacherId == teacherId && item.SubjectId == subjectId,
            cancellationToken);

        if (assignment is null)
        {
            return false;
        }

        var groupAssignments = await _dbContext.TeacherSubjectGroups
            .Where(item => item.TeacherId == teacherId && item.SubjectId == subjectId)
            .ToListAsync(cancellationToken);
        _dbContext.TeacherSubjectGroups.RemoveRange(groupAssignments);
        _dbContext.TeacherSubjects.Remove(assignment);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<TeacherSubjectAssignmentDto>> GetTeacherSubjectsAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.TeacherSubjects
            .AsNoTracking()
            .OrderBy(assignment => assignment.Teacher.LastName)
            .ThenBy(assignment => assignment.Teacher.FirstName)
            .ThenBy(assignment => assignment.Subject.Name)
            .Select(assignment => new TeacherSubjectAssignmentDto(
                assignment.TeacherId,
                assignment.Teacher.FirstName + " " + assignment.Teacher.LastName,
                assignment.SubjectId,
                assignment.Subject.Name,
                assignment.AssignedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<TeacherAssignmentDto?> AssignTeacherAsync(
        AssignTeacherRequest request,
        CancellationToken cancellationToken)
    {
        return await SetTeacherAssignmentAsync(
            request.GroupId,
            request.SubjectId,
            new SetTeacherAssignmentRequest(request.TeacherId),
            cancellationToken);
    }

    public async Task<TeacherAssignmentDto?> SetTeacherAssignmentAsync(
        Guid groupId,
        Guid subjectId,
        SetTeacherAssignmentRequest request,
        CancellationToken cancellationToken)
    {
        var teacher = await _dbContext.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(
                user => user.Id == request.TeacherId && user.Role == UserRole.Teacher && user.IsActive,
                cancellationToken);
        var subject = await _dbContext.Subjects
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == subjectId && candidate.IsActive, cancellationToken);
        var group = await _dbContext.Groups
            .AsNoTracking()
            .FirstOrDefaultAsync(candidate => candidate.Id == groupId && candidate.IsActive, cancellationToken);

        if (teacher is null || subject is null || group is null)
        {
            return null;
        }

        var groupHasSubject = await _dbContext.GroupSubjects.AnyAsync(
            assignment => assignment.GroupId == groupId && assignment.SubjectId == subjectId,
            cancellationToken);
        var teacherHasSubject = await _dbContext.TeacherSubjects.AnyAsync(
            assignment => assignment.TeacherId == request.TeacherId && assignment.SubjectId == subjectId,
            cancellationToken);

        if (!groupHasSubject || !teacherHasSubject)
        {
            return null;
        }

        var currentAssignments = await _dbContext.TeacherSubjectGroups
            .Where(assignment => assignment.GroupId == groupId && assignment.SubjectId == subjectId)
            .ToListAsync(cancellationToken);
        var selectedAssignment = currentAssignments.FirstOrDefault(
            assignment => assignment.TeacherId == request.TeacherId);

        _dbContext.TeacherSubjectGroups.RemoveRange(
            currentAssignments.Where(assignment => assignment.TeacherId != request.TeacherId));

        if (selectedAssignment is null)
        {
            selectedAssignment = new TeacherSubjectGroup
            {
                TeacherId = request.TeacherId,
                SubjectId = subjectId,
                GroupId = groupId,
                AssignedAtUtc = _dateTimeProvider.UtcNow
            };
            _dbContext.TeacherSubjectGroups.Add(selectedAssignment);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        return new TeacherAssignmentDto(
            teacher.Id,
            $"{teacher.FirstName} {teacher.LastName}",
            subject.Id,
            subject.Name,
            group.Id,
            group.Name,
            selectedAssignment.AssignedAtUtc);
    }

    public async Task<bool> RemoveTeacherAssignmentAsync(
        Guid teacherId,
        Guid subjectId,
        Guid groupId,
        CancellationToken cancellationToken)
    {
        var assignment = await _dbContext.TeacherSubjectGroups.FirstOrDefaultAsync(
            item => item.TeacherId == teacherId && item.SubjectId == subjectId && item.GroupId == groupId,
            cancellationToken);

        if (assignment is null)
        {
            return false;
        }

        _dbContext.TeacherSubjectGroups.Remove(assignment);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<TeacherAssignmentDto>> GetTeacherAssignmentsAsync(CancellationToken cancellationToken)
    {
        return await _dbContext.TeacherSubjectGroups
            .AsNoTracking()
            .Select(assignment => new TeacherAssignmentDto(
                assignment.TeacherId,
                assignment.Teacher.FirstName + " " + assignment.Teacher.LastName,
                assignment.SubjectId,
                assignment.Subject.Name,
                assignment.GroupId,
                assignment.Group.Name,
                assignment.AssignedAtUtc))
            .ToListAsync(cancellationToken);
    }

    public async Task<DashboardSummaryDto> GetDashboardSummaryAsync(CancellationToken cancellationToken)
    {
        var totalUsers = await _dbContext.Users.CountAsync(cancellationToken);
        var activeStudents = await _dbContext.Users.CountAsync(
            user => user.IsActive && user.Role == UserRole.Student,
            cancellationToken);
        var activeTeachers = await _dbContext.Users.CountAsync(
            user => user.IsActive && user.Role == UserRole.Teacher,
            cancellationToken);
        var activeGroups = await _dbContext.Groups.CountAsync(group => group.IsActive, cancellationToken);
        var activeSubjects = await _dbContext.Subjects.CountAsync(subject => subject.IsActive, cancellationToken);
        var teacherAssignments = await _dbContext.TeacherSubjectGroups.CountAsync(cancellationToken);

        return new DashboardSummaryDto(
            totalUsers,
            activeStudents,
            activeTeachers,
            activeGroups,
            activeSubjects,
            teacherAssignments);
    }

    public async Task<DashboardDailyResultsDto> GetDashboardDailyResultsAsync(
        DateOnly? date,
        Guid? groupId,
        string? sort,
        CancellationToken cancellationToken)
    {
        var targetDate = date ?? GetBusinessToday().AddDays(-1);
        var normalizedSort = string.IsNullOrWhiteSpace(sort) ? "scoreAsc" : sort.Trim();

        var query = _dbContext.TestAssignments
            .AsNoTracking()
            .Where(assignment => assignment.DailyLesson.LessonDate == targetDate);

        if (groupId.HasValue)
        {
            query = query.Where(assignment => assignment.GroupId == groupId.Value);
        }

        var resultsQuery = query.SelectMany(
            assignment => assignment.DailyLesson.GradeEntries
                .Where(grade => assignment.Group.Students.Any(groupStudent => groupStudent.StudentId == grade.StudentId)),
            (assignment, grade) => new
            {
                grade.StudentId,
                StudentName = grade.Student.FirstName + " " + grade.Student.LastName,
                grade.Student.PhoneNumber,
                assignment.GroupId,
                GroupName = assignment.Group.Name,
                assignment.Group.Branch,
                assignment.DailyLesson.SubjectId,
                SubjectName = assignment.DailyLesson.Subject.Name,
                assignment.DailyLessonId,
                LessonTitle = assignment.DailyLesson.Title,
                assignment.DailyLesson.TopicId,
                TopicTitle = assignment.DailyLesson.Topic == null ? null : assignment.DailyLesson.Topic.Title,
                Score = grade.FinalScore ?? grade.AutoScore,
                grade.AttendanceStatus
            });

        resultsQuery = string.Equals(normalizedSort, "scoreDesc", StringComparison.OrdinalIgnoreCase)
            ? resultsQuery
                .OrderByDescending(result => result.Score)
                .ThenBy(result => result.StudentName)
                .ThenBy(result => result.SubjectName)
            : resultsQuery
                .OrderBy(result => result.Score)
                .ThenBy(result => result.StudentName)
                .ThenBy(result => result.SubjectName);

        var rows = await resultsQuery.ToListAsync(cancellationToken);
        var results = rows
            .Select(row => new DashboardDailyStudentResultDto(
                row.StudentId,
                row.StudentName,
                row.PhoneNumber,
                row.GroupId,
                row.GroupName,
                row.Branch,
                row.SubjectId,
                row.SubjectName,
                row.DailyLessonId,
                row.LessonTitle,
                row.TopicId,
                row.TopicTitle,
                row.Score,
                row.AttendanceStatus.ToString()))
            .ToList();
        var averageScore = results.Count == 0
            ? (decimal?)null
            : Math.Round(results.Average(result => result.Score), 2);

        return new DashboardDailyResultsDto(
            targetDate,
            results.Count,
            averageScore,
            results);
    }

    private static UserDto ToUserDto(User user)
    {
        return new UserDto(
            user.Id,
            user.FirstName,
            user.LastName,
            user.MiddleName,
            user.PhoneNumber,
            user.UserName,
            user.Role,
            user.IsActive);
    }

    private static GroupDto ToGroupDto(Group group)
    {
        return new GroupDto(
            group.Id,
            group.Name,
            group.Description,
            group.Branch,
            group.IsActive,
            group.Students.Count,
            group.Subjects
                .OrderBy(groupSubject => groupSubject.Subject.Name)
                .Select(groupSubject => new GroupSubjectDto(
                    groupSubject.SubjectId,
                    groupSubject.Subject.Name))
                .ToList(),
            group.Students
                .OrderBy(groupStudent => groupStudent.Student.LastName)
                .ThenBy(groupStudent => groupStudent.Student.FirstName)
                .Select(groupStudent => new GroupStudentDto(
                    groupStudent.StudentId,
                    groupStudent.Student.FirstName,
                    groupStudent.Student.LastName,
                    groupStudent.Student.PhoneNumber))
                .ToList());
    }

    private static string NormalizePhoneNumber(string phoneNumber)
    {
        return phoneNumber.Trim().Replace(" ", string.Empty);
    }

    private DateOnly GetBusinessToday()
    {
        var localNow = TimeZoneInfo.ConvertTime(_dateTimeProvider.UtcNow, _timeZoneProvider.BusinessTimeZone);
        return DateOnly.FromDateTime(localNow.DateTime);
    }
}

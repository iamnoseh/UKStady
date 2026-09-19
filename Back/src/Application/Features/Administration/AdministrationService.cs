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
    private readonly ICurrentUserService _currentUserService;

    public AdministrationService(
        IAppDbContext dbContext,
        IPasswordHasher passwordHasher,
        IDateTimeProvider dateTimeProvider,
        ITimeZoneProvider timeZoneProvider,
        ICurrentUserService currentUserService)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _dateTimeProvider = dateTimeProvider;
        _timeZoneProvider = timeZoneProvider;
        _currentUserService = currentUserService;
    }

    private bool IsSuperAdmin() =>
        string.Equals(_currentUserService.Role, UserRole.SuperAdmin.ToString(), StringComparison.OrdinalIgnoreCase);

    public async Task<IReadOnlyList<UserDto>> GetUsersAsync(CancellationToken cancellationToken)
    {
        var query = _dbContext.Users.AsNoTracking();
        if (!IsSuperAdmin())
        {
            query = query.Where(user => user.Role != UserRole.SuperAdmin && user.Role != UserRole.Admin);
        }

        return await query
            .OrderBy(user => user.LastName)
            .ThenBy(user => user.FirstName)
            .Select(user => ToUserDto(user))
            .ToListAsync(cancellationToken);
    }

    public async Task<UserDto?> GetUserAsync(Guid id, CancellationToken cancellationToken)
    {
        var query = _dbContext.Users.AsNoTracking().Where(user => user.Id == id);
        if (!IsSuperAdmin())
        {
            query = query.Where(user => user.Role != UserRole.SuperAdmin && user.Role != UserRole.Admin);
        }

        return await query
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
        if ((request.Role == UserRole.SuperAdmin || request.Role == UserRole.Admin) && !IsSuperAdmin())
        {
            throw new InvalidOperationException("Only SuperAdmin can create Admin or SuperAdmin users.");
        }

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

        if ((user.Role == UserRole.SuperAdmin || user.Role == UserRole.Admin || request.Role == UserRole.SuperAdmin || request.Role == UserRole.Admin) && !IsSuperAdmin())
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
        if (!IsSuperAdmin())
        {
            return false;
        }

        var user = await _dbContext.Users.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (user is null)
        {
            return false;
        }

        user.IsActive = false;
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> ChangeUserPasswordAsync(Guid id, string newPassword, CancellationToken cancellationToken)
    {
        var user = await _dbContext.Users.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (user is null)
        {
            return false;
        }

        var isSelf = _currentUserService.UserId.HasValue && _currentUserService.UserId.Value == id;
        if ((user.Role == UserRole.SuperAdmin || user.Role == UserRole.Admin) && !IsSuperAdmin() && !isSelf)
        {
            return false;
        }

        user.PasswordHash = _passwordHasher.Hash(newPassword.Trim());
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<bool> HardDeleteUserAsync(Guid id, CancellationToken cancellationToken)
    {
        if (!IsSuperAdmin())
        {
            return false;
        }
        var user = await _dbContext.Users
            .Include(u => u.TeacherAssignments)
            .Include(u => u.TeacherSubjects)
            .Include(u => u.StudentGroups)
            .FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);

        if (user is null)
        {
            return false;
        }

        // 1. Remove TeacherSubjectGroup assignments
        if (user.TeacherAssignments.Count > 0)
        {
            _dbContext.TeacherSubjectGroups.RemoveRange(user.TeacherAssignments);
        }

        // 2. Remove TeacherSubject relations
        if (user.TeacherSubjects.Count > 0)
        {
            _dbContext.TeacherSubjects.RemoveRange(user.TeacherSubjects);
        }

        // 3. Remove StudentGroups if any
        if (user.StudentGroups.Count > 0)
        {
            _dbContext.GroupStudents.RemoveRange(user.StudentGroups);
        }

        // 4. Nullify GradedByTeacherId in GradeEntries
        var gradedEntries = await _dbContext.GradeEntries
            .Where(g => g.GradedByTeacherId == id)
            .ToListAsync(cancellationToken);
        foreach (var entry in gradedEntries)
        {
            entry.GradedByTeacherId = null;
        }

        // 5. Remove GradeAuditLogs changed by this user
        var auditLogs = await _dbContext.GradeAuditLogs
            .Where(l => l.ChangedByUserId == id)
            .ToListAsync(cancellationToken);
        if (auditLogs.Count > 0)
        {
            _dbContext.GradeAuditLogs.RemoveRange(auditLogs);
        }

        // 6. If teacher created daily lessons, remove them cleanly along with their test assignments and attempts
        var lessons = await _dbContext.DailyLessons
            .Include(l => l.TestAssignments)
                .ThenInclude(ta => ta.Attempts)
                    .ThenInclude(a => a.Answers)
            .Include(l => l.TestAssignments)
                .ThenInclude(ta => ta.Attempts)
                    .ThenInclude(a => a.AttemptQuestions)
            .Include(l => l.TestAssignments)
                .ThenInclude(ta => ta.Attempts)
                    .ThenInclude(a => a.GradeEntry)
            .Include(l => l.GradeEntries)
            .Where(l => l.TeacherId == id)
            .ToListAsync(cancellationToken);

        if (lessons.Count > 0)
        {
            foreach (var lesson in lessons)
            {
                foreach (var testAssignment in lesson.TestAssignments)
                {
                    foreach (var attempt in testAssignment.Attempts)
                    {
                        if (attempt.GradeEntry is not null)
                        {
                            _dbContext.GradeEntries.Remove(attempt.GradeEntry);
                        }
                        _dbContext.StudentAnswers.RemoveRange(attempt.Answers);
                        _dbContext.AttemptQuestions.RemoveRange(attempt.AttemptQuestions);
                    }
                    _dbContext.StudentTestAttempts.RemoveRange(testAssignment.Attempts);
                }
                _dbContext.TestAssignments.RemoveRange(lesson.TestAssignments);
                _dbContext.GradeEntries.RemoveRange(lesson.GradeEntries);
            }
            _dbContext.DailyLessons.RemoveRange(lessons);
        }

        // 7. If student has test attempts or answers
        var studentAttempts = await _dbContext.StudentTestAttempts
            .Include(a => a.Answers)
            .Include(a => a.AttemptQuestions)
            .Include(a => a.GradeEntry)
            .Where(a => a.StudentId == id)
            .ToListAsync(cancellationToken);

        if (studentAttempts.Count > 0)
        {
            foreach (var attempt in studentAttempts)
            {
                if (attempt.GradeEntry is not null)
                {
                    _dbContext.GradeEntries.Remove(attempt.GradeEntry);
                }
                _dbContext.StudentAnswers.RemoveRange(attempt.Answers);
                _dbContext.AttemptQuestions.RemoveRange(attempt.AttemptQuestions);
            }
            _dbContext.StudentTestAttempts.RemoveRange(studentAttempts);
        }

        var studentGrades = await _dbContext.GradeEntries
            .Where(g => g.StudentId == id)
            .ToListAsync(cancellationToken);
        if (studentGrades.Count > 0)
        {
            _dbContext.GradeEntries.RemoveRange(studentGrades);
        }

        _dbContext.Users.Remove(user);
        await _dbContext.SaveChangesAsync(cancellationToken);
        return true;
    }

    public async Task<IReadOnlyList<GroupDto>> GetGroupsAsync(CancellationToken cancellationToken)
    {
        IQueryable<Group> query = _dbContext.Groups
            .AsNoTracking()
            .Include(group => group.Students)
            .ThenInclude(groupStudent => groupStudent.Student)
            .Include(group => group.Subjects)
            .ThenInclude(groupSubject => groupSubject.Subject);

        Dictionary<Guid, HashSet<Guid>>? teacherSubjectIdsByGroup = null;
        if (IsTeacher())
        {
            var teacherId = RequireCurrentUserId();
            query = query.Where(group => _dbContext.TeacherSubjectGroups.Any(assignment =>
                assignment.TeacherId == teacherId && assignment.GroupId == group.Id));

            var assignments = await _dbContext.TeacherSubjectGroups
                .AsNoTracking()
                .Where(assignment => assignment.TeacherId == teacherId)
                .Select(assignment => new { assignment.GroupId, assignment.SubjectId })
                .ToListAsync(cancellationToken);

            teacherSubjectIdsByGroup = assignments
                .GroupBy(assignment => assignment.GroupId)
                .ToDictionary(
                    group => group.Key,
                    group => group.Select(assignment => assignment.SubjectId).ToHashSet());
        }
        else if (IsStudent())
        {
            var studentId = RequireCurrentUserId();
            query = query.Where(group => _dbContext.GroupStudents.Any(groupStudent =>
                groupStudent.StudentId == studentId && groupStudent.GroupId == group.Id));
        }

        var groups = await query
            .OrderBy(group => group.Name)
            .ToListAsync(cancellationToken);

        return groups
            .Select(group => ToGroupDto(group, teacherSubjectIdsByGroup?.GetValueOrDefault(group.Id)))
            .ToList();
    }

    public async Task<GroupDto?> GetGroupAsync(Guid id, CancellationToken cancellationToken)
    {
        IQueryable<Group> query = _dbContext.Groups
            .AsNoTracking()
            .Include(candidate => candidate.Students)
            .ThenInclude(groupStudent => groupStudent.Student)
            .Include(candidate => candidate.Subjects)
            .ThenInclude(groupSubject => groupSubject.Subject)
            .Where(group => group.Id == id);

        HashSet<Guid>? teacherSubjectIds = null;
        if (IsTeacher())
        {
            var teacherId = RequireCurrentUserId();
            var assignments = await _dbContext.TeacherSubjectGroups
                .AsNoTracking()
                .Where(assignment => assignment.TeacherId == teacherId && assignment.GroupId == id)
                .Select(assignment => assignment.SubjectId)
                .ToListAsync(cancellationToken);

            if (assignments.Count == 0)
            {
                return null;
            }

            teacherSubjectIds = assignments.ToHashSet();
        }
        else if (IsStudent())
        {
            var studentId = RequireCurrentUserId();
            var isMember = await _dbContext.GroupStudents.AnyAsync(
                groupStudent => groupStudent.GroupId == id && groupStudent.StudentId == studentId,
                cancellationToken);

            if (!isMember)
            {
                return null;
            }
        }

        var group = await query.FirstOrDefaultAsync(cancellationToken);

        return group is null ? null : ToGroupDto(group, teacherSubjectIds);
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

    public async Task<GroupDto?> UpdateGroupTestAccessAsync(
        Guid id,
        UpdateGroupTestAccessRequest request,
        CancellationToken cancellationToken)
    {
        var group = await _dbContext.Groups
            .FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (group is null)
        {
            return null;
        }

        group.TestStartTime = request.TestStartTime;
        group.TestEndTime = request.TestEndTime;
        group.TestAccessMode = string.IsNullOrWhiteSpace(request.TestAccessMode) ? "Scheduled" : request.TestAccessMode.Trim();

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

        var studentRowsQuery = _dbContext.GroupStudents
            .AsNoTracking()
            .Where(groupStudent =>
                groupStudent.Group.IsActive &&
                groupStudent.Student.IsActive &&
                groupStudent.Student.Role == UserRole.Student);

        if (groupId.HasValue)
        {
            studentRowsQuery = studentRowsQuery.Where(groupStudent => groupStudent.GroupId == groupId.Value);
        }

        var studentRows = await studentRowsQuery
            .SelectMany(
                groupStudent => _dbContext.GroupSubjects
                    .AsNoTracking()
                    .Where(groupSubject =>
                        groupSubject.GroupId == groupStudent.GroupId &&
                        groupSubject.Subject.IsActive),
                (groupStudent, groupSubject) => new DashboardStudentSubjectRow(
                    groupStudent.StudentId,
                    groupStudent.Student.FirstName + " " + groupStudent.Student.LastName,
                    groupStudent.Student.PhoneNumber,
                    groupStudent.GroupId,
                    groupStudent.Group.Name,
                    groupStudent.Group.Branch,
                    groupSubject.SubjectId,
                    groupSubject.Subject.Name))
            .ToListAsync(cancellationToken);

        var groupIds = studentRows.Select(row => row.GroupId).Distinct().ToList();
        var subjectIds = studentRows.Select(row => row.SubjectId).Distinct().ToList();

        var lessonRows = await _dbContext.TestAssignments
            .AsNoTracking()
            .Where(assignment =>
                assignment.Group.IsActive &&
                assignment.DailyLesson.LessonDate == targetDate &&
                groupIds.Contains(assignment.GroupId) &&
                subjectIds.Contains(assignment.DailyLesson.SubjectId))
            .Select(assignment => new DashboardLessonRow(
                assignment.GroupId,
                assignment.DailyLesson.SubjectId,
                assignment.DailyLessonId,
                assignment.DailyLesson.Title,
                assignment.DailyLesson.TopicId,
                assignment.DailyLesson.Topic == null ? null : assignment.DailyLesson.Topic.Title))
            .ToListAsync(cancellationToken);

        var lessonIds = lessonRows.Select(row => row.DailyLessonId).Distinct().ToList();
        var studentIds = studentRows.Select(row => row.StudentId).Distinct().ToList();

        var gradeRows = await _dbContext.GradeEntries
            .AsNoTracking()
            .Where(grade =>
                lessonIds.Contains(grade.DailyLessonId) &&
                studentIds.Contains(grade.StudentId))
            .Select(grade => new DashboardGradeRow(
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

        var results = new List<DashboardDailyStudentResultDto>();
        foreach (var studentRow in studentRows)
        {
            if (!lessonsByGroupSubject.TryGetValue((studentRow.GroupId, studentRow.SubjectId), out var lessons) || lessons.Count == 0)
            {
                results.Add(new DashboardDailyStudentResultDto(
                    studentRow.StudentId,
                    studentRow.StudentName,
                    studentRow.PhoneNumber,
                    studentRow.GroupId,
                    studentRow.GroupName,
                    studentRow.Branch,
                    studentRow.SubjectId,
                    studentRow.SubjectName,
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
                gradesByLessonStudent.TryGetValue((lesson.DailyLessonId, studentRow.StudentId), out var grade);
                results.Add(new DashboardDailyStudentResultDto(
                    studentRow.StudentId,
                    studentRow.StudentName,
                    studentRow.PhoneNumber,
                    studentRow.GroupId,
                    studentRow.GroupName,
                    studentRow.Branch,
                    studentRow.SubjectId,
                    studentRow.SubjectName,
                    lesson.DailyLessonId,
                    lesson.LessonTitle,
                    lesson.TopicId,
                    lesson.TopicTitle,
                    grade?.Score,
                    grade?.AttendanceStatus ?? "NoGrade"));
            }
        }

        results = SortDashboardResults(results, normalizedSort).ToList();
        var scoredResults = results.Where(result => result.Score.HasValue).ToList();
        var averageScore = scoredResults.Count == 0
            ? (decimal?)null
            : Math.Round(scoredResults.Average(result => result.Score!.Value), 2);

        return new DashboardDailyResultsDto(
            targetDate,
            results.Count,
            averageScore,
            results);
    }


    private static IEnumerable<DashboardDailyStudentResultDto> SortDashboardResults(
        IEnumerable<DashboardDailyStudentResultDto> results,
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

    private sealed record DashboardStudentSubjectRow(
        Guid StudentId,
        string StudentName,
        string PhoneNumber,
        Guid GroupId,
        string GroupName,
        string Branch,
        Guid SubjectId,
        string SubjectName);

    private sealed record DashboardLessonRow(
        Guid GroupId,
        Guid SubjectId,
        Guid DailyLessonId,
        string LessonTitle,
        Guid? TopicId,
        string? TopicTitle);

    private sealed record DashboardGradeRow(
        Guid DailyLessonId,
        Guid StudentId,
        decimal Score,
        string AttendanceStatus);

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

    private static GroupDto ToGroupDto(Group group, IReadOnlySet<Guid>? subjectIds = null)
    {
        return new GroupDto(
            group.Id,
            group.Name,
            group.Description,
            group.Branch,
            group.IsActive,
            group.Students.Count,
            group.Subjects
                .Where(groupSubject => subjectIds is null || subjectIds.Contains(groupSubject.SubjectId))
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
                .ToList(),
            group.TestStartTime,
            group.TestEndTime,
            group.TestAccessMode);
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

    private Guid RequireCurrentUserId()
    {
        return _currentUserService.UserId
            ?? throw new InvalidOperationException("Current user is required for administration operations.");
    }

    private bool IsTeacher()
    {
        return _currentUserService.Role == UserRole.Teacher.ToString();
    }

    private bool IsStudent()
    {
        return _currentUserService.Role == UserRole.Student.ToString();
    }
}

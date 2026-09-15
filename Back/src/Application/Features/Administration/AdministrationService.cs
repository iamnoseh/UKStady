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

    public AdministrationService(
        IAppDbContext dbContext,
        IPasswordHasher passwordHasher,
        IDateTimeProvider dateTimeProvider)
    {
        _dbContext = dbContext;
        _passwordHasher = passwordHasher;
        _dateTimeProvider = dateTimeProvider;
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
            Email = string.IsNullOrWhiteSpace(request.Email) ? $"{phoneNumber}@ukstady.local" : request.Email.Trim(),
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
        user.Email = string.IsNullOrWhiteSpace(request.Email) ? $"{user.PhoneNumber}@ukstady.local" : request.Email.Trim();
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
        return await _dbContext.Groups
            .AsNoTracking()
            .OrderBy(group => group.Name)
            .Select(group => new GroupDto(
                group.Id,
                group.Name,
                group.Description,
                group.IsActive,
                group.Students.Count))
            .ToListAsync(cancellationToken);
    }

    public async Task<GroupDto?> GetGroupAsync(Guid id, CancellationToken cancellationToken)
    {
        return await _dbContext.Groups
            .AsNoTracking()
            .Where(group => group.Id == id)
            .Select(group => new GroupDto(
                group.Id,
                group.Name,
                group.Description,
                group.IsActive,
                group.Students.Count))
            .FirstOrDefaultAsync(cancellationToken);
    }

    public async Task<GroupDto> CreateGroupAsync(CreateGroupRequest request, CancellationToken cancellationToken)
    {
        var group = new Group
        {
            Name = request.Name.Trim(),
            Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim(),
            IsActive = true
        };

        _dbContext.Groups.Add(group);
        await _dbContext.SaveChangesAsync(cancellationToken);

        return new GroupDto(group.Id, group.Name, group.Description, group.IsActive, 0);
    }

    public async Task<GroupDto?> UpdateGroupAsync(Guid id, UpdateGroupRequest request, CancellationToken cancellationToken)
    {
        var group = await _dbContext.Groups.FirstOrDefaultAsync(candidate => candidate.Id == id, cancellationToken);
        if (group is null)
        {
            return null;
        }

        group.Name = request.Name.Trim();
        group.Description = string.IsNullOrWhiteSpace(request.Description) ? null : request.Description.Trim();
        group.IsActive = request.IsActive;

        await _dbContext.SaveChangesAsync(cancellationToken);

        var studentCount = await _dbContext.GroupStudents.CountAsync(item => item.GroupId == id, cancellationToken);
        return new GroupDto(group.Id, group.Name, group.Description, group.IsActive, studentCount);
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
                subject.Topics.Count))
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
                subject.Topics.Count))
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

        return new SubjectDto(subject.Id, subject.Name, subject.Description, subject.IsActive, 0);
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
        return new SubjectDto(subject.Id, subject.Name, subject.Description, subject.IsActive, topicCount);
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

    public async Task<TeacherAssignmentDto?> AssignTeacherAsync(
        AssignTeacherRequest request,
        CancellationToken cancellationToken)
    {
        var teacher = await _dbContext.Users.FirstOrDefaultAsync(
            user => user.Id == request.TeacherId && user.Role == UserRole.Teacher,
            cancellationToken);
        var subject = await _dbContext.Subjects.FirstOrDefaultAsync(
            candidate => candidate.Id == request.SubjectId,
            cancellationToken);
        var group = await _dbContext.Groups.FirstOrDefaultAsync(
            candidate => candidate.Id == request.GroupId,
            cancellationToken);

        if (teacher is null || subject is null || group is null)
        {
            return null;
        }

        var alreadyExists = await _dbContext.TeacherSubjectGroups.AnyAsync(
            assignment =>
                assignment.TeacherId == request.TeacherId &&
                assignment.SubjectId == request.SubjectId &&
                assignment.GroupId == request.GroupId,
            cancellationToken);

        if (!alreadyExists)
        {
            _dbContext.TeacherSubjectGroups.Add(new TeacherSubjectGroup
            {
                TeacherId = request.TeacherId,
                SubjectId = request.SubjectId,
                GroupId = request.GroupId,
                AssignedAtUtc = _dateTimeProvider.UtcNow
            });
            await _dbContext.SaveChangesAsync(cancellationToken);
        }

        return new TeacherAssignmentDto(
            teacher.Id,
            $"{teacher.FirstName} {teacher.LastName}",
            subject.Id,
            subject.Name,
            group.Id,
            group.Name,
            _dateTimeProvider.UtcNow);
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

    private static UserDto ToUserDto(User user)
    {
        return new UserDto(
            user.Id,
            user.FirstName,
            user.LastName,
            user.MiddleName,
            user.PhoneNumber,
            user.UserName,
            user.Email,
            user.Role,
            user.IsActive);
    }

    private static string NormalizePhoneNumber(string phoneNumber)
    {
        return phoneNumber.Trim().Replace(" ", string.Empty);
    }
}

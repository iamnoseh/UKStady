using UKStady.Domain.Enums;

namespace UKStady.Application.Features.Administration;

public sealed record UserDto(
    Guid Id,
    string FirstName,
    string LastName,
    string? MiddleName,
    string PhoneNumber,
    string UserName,
    UserRole Role,
    bool IsActive);

public sealed record CreateUserRequest(
    string FirstName,
    string LastName,
    string? MiddleName,
    string PhoneNumber,
    string Password,
    UserRole Role,
    string? UserName = null);

public sealed record UpdateUserRequest(
    string FirstName,
    string LastName,
    string? MiddleName,
    string PhoneNumber,
    UserRole Role,
    bool IsActive,
    string? UserName = null);

public sealed record GeneratedPasswordDto(string Password);

public sealed record GroupSubjectDto(Guid Id, string Name);

public sealed record GroupStudentDto(Guid Id, string FirstName, string LastName, string PhoneNumber);

public sealed record GroupDto(
    Guid Id,
    string Name,
    string? Description,
    string Branch,
    bool IsActive,
    int StudentCount,
    IReadOnlyList<GroupSubjectDto> Subjects,
    IReadOnlyList<GroupStudentDto> Students);

public sealed record CreateGroupRequest(string Name, string? Description, string Branch, IReadOnlyList<Guid> SubjectIds);

public sealed record UpdateGroupRequest(string Name, string? Description, string Branch, bool IsActive, IReadOnlyList<Guid> SubjectIds);

public sealed record SubjectDto(
    Guid Id,
    string Name,
    string? Description,
    bool IsActive,
    int TopicCount,
    int QuestionCount);

public sealed record CreateSubjectRequest(string Name, string? Description);

public sealed record UpdateSubjectRequest(string Name, string? Description, bool IsActive);

public sealed record AssignTeacherRequest(Guid TeacherId, Guid SubjectId, Guid GroupId);

public sealed record SetTeacherAssignmentRequest(Guid TeacherId);

public sealed record AssignTeacherSubjectRequest(Guid TeacherId, Guid SubjectId);

public sealed record TeacherSubjectAssignmentDto(
    Guid TeacherId,
    string TeacherName,
    Guid SubjectId,
    string SubjectName,
    DateTimeOffset AssignedAtUtc);

public sealed record TeacherAssignmentDto(
    Guid TeacherId,
    string TeacherName,
    Guid SubjectId,
    string SubjectName,
    Guid GroupId,
    string GroupName,
    DateTimeOffset AssignedAtUtc);

public sealed record DashboardSummaryDto(
    int TotalUsers,
    int ActiveStudents,
    int ActiveTeachers,
    int ActiveGroups,
    int ActiveSubjects,
    int TeacherAssignments);

public sealed record DashboardDailyResultsDto(
    DateOnly Date,
    int TotalResults,
    decimal? AverageScore,
    IReadOnlyList<DashboardDailyStudentResultDto> Results);

public sealed record DashboardDailyStudentResultDto(
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

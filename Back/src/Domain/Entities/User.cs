using UKStady.Domain.Common;
using UKStady.Domain.Enums;

namespace UKStady.Domain.Entities;

public sealed class User : AuditableEntity
{
    public string FirstName { get; set; } = string.Empty;

    public string LastName { get; set; } = string.Empty;

    public string? MiddleName { get; set; }

    public string PhoneNumber { get; set; } = string.Empty;

    public string UserName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string PasswordHash { get; set; } = string.Empty;

    public UserRole Role { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<GroupStudent> StudentGroups { get; set; } = [];

    public ICollection<TeacherSubjectGroup> TeacherAssignments { get; set; } = [];

    public ICollection<DailyLesson> CreatedDailyLessons { get; set; } = [];

    public ICollection<StudentTestAttempt> TestAttempts { get; set; } = [];

    public ICollection<GradeEntry> GradeEntries { get; set; } = [];
}

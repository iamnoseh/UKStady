using UKStady.Domain.Common;

namespace UKStady.Domain.Entities;

public sealed class Subject : AuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<Topic> Topics { get; set; } = [];

    public ICollection<GroupSubject> Groups { get; set; } = [];

    public ICollection<TeacherSubjectGroup> TeacherAssignments { get; set; } = [];

    public ICollection<TeacherSubject> TeacherSubjects { get; set; } = [];
}

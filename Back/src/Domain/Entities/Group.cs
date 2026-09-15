using UKStady.Domain.Common;

namespace UKStady.Domain.Entities;

public sealed class Group : AuditableEntity
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string Branch { get; set; } = string.Empty;

    public bool IsActive { get; set; } = true;

    public ICollection<GroupStudent> Students { get; set; } = [];

    public ICollection<GroupSubject> Subjects { get; set; } = [];

    public ICollection<TeacherSubjectGroup> TeacherAssignments { get; set; } = [];

    public ICollection<TestAssignment> TestAssignments { get; set; } = [];
}

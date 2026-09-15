namespace UKStady.Domain.Entities;

public sealed class TeacherSubjectGroup
{
    public Guid TeacherId { get; set; }

    public User Teacher { get; set; } = null!;

    public Guid SubjectId { get; set; }

    public Subject Subject { get; set; } = null!;

    public Guid GroupId { get; set; }

    public Group Group { get; set; } = null!;

    public DateTimeOffset AssignedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}


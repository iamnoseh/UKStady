namespace UKStady.Domain.Entities;

public sealed class GroupSubject
{
    public Guid GroupId { get; set; }

    public Group Group { get; set; } = null!;

    public Guid SubjectId { get; set; }

    public Subject Subject { get; set; } = null!;

    public DateTimeOffset AddedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}

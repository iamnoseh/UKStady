namespace UKStady.Domain.Entities;

public sealed class GroupStudent
{
    public Guid GroupId { get; set; }

    public Group Group { get; set; } = null!;

    public Guid StudentId { get; set; }

    public User Student { get; set; } = null!;

    public DateTimeOffset JoinedAtUtc { get; set; } = DateTimeOffset.UtcNow;
}


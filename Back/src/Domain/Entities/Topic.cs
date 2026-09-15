using UKStady.Domain.Common;

namespace UKStady.Domain.Entities;

public sealed class Topic : AuditableEntity
{
    public Guid SubjectId { get; set; }

    public Subject Subject { get; set; } = null!;

    public string Title { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<Question> Questions { get; set; } = [];

    public ICollection<DailyLesson> DailyLessons { get; set; } = [];
}


using UKStady.Domain.Common;

namespace UKStady.Domain.Entities;

public sealed class TestAssignment : AuditableEntity
{
    public Guid DailyLessonId { get; set; }

    public DailyLesson DailyLesson { get; set; } = null!;

    public Guid GroupId { get; set; }

    public Group Group { get; set; } = null!;

    public ICollection<StudentTestAttempt> Attempts { get; set; } = [];
}


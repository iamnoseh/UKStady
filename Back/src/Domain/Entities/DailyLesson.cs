using UKStady.Domain.Common;

namespace UKStady.Domain.Entities;

public sealed class DailyLesson : AuditableEntity
{
    public Guid TeacherId { get; set; }

    public User Teacher { get; set; } = null!;

    public Guid SubjectId { get; set; }

    public Subject Subject { get; set; } = null!;

    public Guid? TopicId { get; set; }

    public Topic? Topic { get; set; }

    public DateOnly LessonDate { get; set; }

    public string Title { get; set; } = string.Empty;

    public int QuestionCount { get; set; }

    public DateTimeOffset OpensAtUtc { get; set; }

    public DateTimeOffset ClosesAtUtc { get; set; }

    public ICollection<TestAssignment> TestAssignments { get; set; } = [];

    public ICollection<GradeEntry> GradeEntries { get; set; } = [];
}

using UKStady.Domain.Common;
using UKStady.Domain.Enums;

namespace UKStady.Domain.Entities;

public sealed class StudentTestAttempt : AuditableEntity
{
    public Guid TestAssignmentId { get; set; }

    public TestAssignment TestAssignment { get; set; } = null!;

    public Guid StudentId { get; set; }

    public User Student { get; set; } = null!;

    public TestStatus Status { get; set; } = TestStatus.InProgress;

    public DateTimeOffset StartedAtUtc { get; set; } = DateTimeOffset.UtcNow;

    public DateTimeOffset? SubmittedAtUtc { get; set; }

    public DateTimeOffset? ExpiredAtUtc { get; set; }

    public decimal? AutoScore { get; set; }

    public ICollection<AttemptQuestion> AttemptQuestions { get; set; } = [];

    public ICollection<StudentAnswer> Answers { get; set; } = [];

    public GradeEntry? GradeEntry { get; set; }
}


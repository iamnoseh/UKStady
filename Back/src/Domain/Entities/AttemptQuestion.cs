namespace UKStady.Domain.Entities;

public sealed class AttemptQuestion
{
    public Guid StudentTestAttemptId { get; set; }

    public StudentTestAttempt StudentTestAttempt { get; set; } = null!;

    public Guid QuestionId { get; set; }

    public Question Question { get; set; } = null!;

    public int SortOrder { get; set; }

    public string? OptionOrderJson { get; set; }
}

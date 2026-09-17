using UKStady.Domain.Common;

namespace UKStady.Domain.Entities;

public sealed class StudentAnswer : AuditableEntity
{
    public Guid StudentTestAttemptId { get; set; }

    public StudentTestAttempt StudentTestAttempt { get; set; } = null!;

    public Guid QuestionId { get; set; }

    public Question Question { get; set; } = null!;

    public Guid? QuestionOptionId { get; set; }

    public QuestionOption? QuestionOption { get; set; }

    public string? AnswerText { get; set; }

    public bool IsChecked { get; set; }
}

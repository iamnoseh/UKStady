using UKStady.Domain.Common;

namespace UKStady.Domain.Entities;

public sealed class QuestionOption : AuditableEntity
{
    public Guid QuestionId { get; set; }

    public Question Question { get; set; } = null!;

    public string Text { get; set; } = string.Empty;

    public bool IsCorrect { get; set; }

    public int SortOrder { get; set; }

    public ICollection<StudentAnswer> StudentAnswers { get; set; } = [];
}


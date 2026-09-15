using UKStady.Domain.Common;
using UKStady.Domain.Enums;

namespace UKStady.Domain.Entities;

public sealed class Question : AuditableEntity
{
    public Guid TopicId { get; set; }

    public Topic Topic { get; set; } = null!;

    public string Text { get; set; } = string.Empty;

    public QuestionType Type { get; set; } = QuestionType.SingleChoice;

    public int Points { get; set; } = 1;

    public bool IsActive { get; set; } = true;

    public ICollection<QuestionOption> Options { get; set; } = [];

    public ICollection<AttemptQuestion> AttemptQuestions { get; set; } = [];
}


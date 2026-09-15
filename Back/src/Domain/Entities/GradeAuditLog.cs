using UKStady.Domain.Common;

namespace UKStady.Domain.Entities;

public sealed class GradeAuditLog : AuditableEntity
{
    public Guid GradeEntryId { get; set; }

    public GradeEntry GradeEntry { get; set; } = null!;

    public Guid ChangedByUserId { get; set; }

    public User ChangedByUser { get; set; } = null!;

    public decimal? PreviousFinalScore { get; set; }

    public decimal? NewFinalScore { get; set; }

    public string? Reason { get; set; }
}


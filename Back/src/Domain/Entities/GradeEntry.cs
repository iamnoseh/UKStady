using UKStady.Domain.Common;
using UKStady.Domain.Enums;

namespace UKStady.Domain.Entities;

public sealed class GradeEntry : AuditableEntity
{
    public Guid DailyLessonId { get; set; }

    public DailyLesson DailyLesson { get; set; } = null!;

    public Guid StudentId { get; set; }

    public User Student { get; set; } = null!;

    public Guid? StudentTestAttemptId { get; set; }

    public StudentTestAttempt? StudentTestAttempt { get; set; }

    public AttendanceStatus AttendanceStatus { get; set; }

    public decimal AutoScore { get; set; }

    public decimal? FinalScore { get; set; }

    public Guid? GradedByTeacherId { get; set; }

    public User? GradedByTeacher { get; set; }

    public DateTimeOffset? GradedAtUtc { get; set; }

    public string? TeacherComment { get; set; }

    public ICollection<GradeAuditLog> AuditLogs { get; set; } = [];
}


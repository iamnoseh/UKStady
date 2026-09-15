using Microsoft.EntityFrameworkCore;
using UKStady.Application.Common.Interfaces;
using UKStady.Domain.Common;
using UKStady.Domain.Entities;

namespace UKStady.Infrastructure.Persistence;

public sealed class AppDbContext : DbContext, IAppDbContext
{
    private readonly IDateTimeProvider _dateTimeProvider;

    public AppDbContext(DbContextOptions<AppDbContext> options, IDateTimeProvider dateTimeProvider)
        : base(options)
    {
        _dateTimeProvider = dateTimeProvider;
    }

    public DbSet<User> Users => Set<User>();

    public DbSet<Group> Groups => Set<Group>();

    public DbSet<GroupStudent> GroupStudents => Set<GroupStudent>();

    public DbSet<Subject> Subjects => Set<Subject>();

    public DbSet<Topic> Topics => Set<Topic>();

    public DbSet<Question> Questions => Set<Question>();

    public DbSet<QuestionOption> QuestionOptions => Set<QuestionOption>();

    public DbSet<TeacherSubjectGroup> TeacherSubjectGroups => Set<TeacherSubjectGroup>();

    public DbSet<DailyLesson> DailyLessons => Set<DailyLesson>();

    public DbSet<TestAssignment> TestAssignments => Set<TestAssignment>();

    public DbSet<StudentTestAttempt> StudentTestAttempts => Set<StudentTestAttempt>();

    public DbSet<AttemptQuestion> AttemptQuestions => Set<AttemptQuestion>();

    public DbSet<StudentAnswer> StudentAnswers => Set<StudentAnswer>();

    public DbSet<GradeEntry> GradeEntries => Set<GradeEntry>();

    public DbSet<GradeAuditLog> GradeAuditLogs => Set<GradeAuditLog>();

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        var now = _dateTimeProvider.UtcNow;

        foreach (var entry in ChangeTracker.Entries<AuditableEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                entry.Entity.CreatedAtUtc = now;
            }

            if (entry.State == EntityState.Modified)
            {
                entry.Entity.UpdatedAtUtc = now;
            }
        }

        return base.SaveChangesAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}


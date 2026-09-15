using Microsoft.EntityFrameworkCore;
using UKStady.Domain.Entities;

namespace UKStady.Application.Common.Interfaces;

public interface IAppDbContext
{
    DbSet<User> Users { get; }

    DbSet<Group> Groups { get; }

    DbSet<GroupStudent> GroupStudents { get; }

    DbSet<GroupSubject> GroupSubjects { get; }

    DbSet<Subject> Subjects { get; }

    DbSet<Topic> Topics { get; }

    DbSet<Question> Questions { get; }

    DbSet<QuestionOption> QuestionOptions { get; }

    DbSet<TeacherSubjectGroup> TeacherSubjectGroups { get; }

    DbSet<TeacherSubject> TeacherSubjects { get; }

    DbSet<DailyLesson> DailyLessons { get; }

    DbSet<TestAssignment> TestAssignments { get; }

    DbSet<StudentTestAttempt> StudentTestAttempts { get; }

    DbSet<AttemptQuestion> AttemptQuestions { get; }

    DbSet<StudentAnswer> StudentAnswers { get; }

    DbSet<GradeEntry> GradeEntries { get; }

    DbSet<GradeAuditLog> GradeAuditLogs { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}

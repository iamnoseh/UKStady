using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using UKStady.Domain.Entities;
using UKStady.Domain.Enums;

namespace UKStady.Infrastructure.Persistence.Configurations;

public sealed class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.ToTable("users");
        builder.HasKey(user => user.Id);
        builder.Property(user => user.FirstName).HasMaxLength(100).IsRequired();
        builder.Property(user => user.LastName).HasMaxLength(100).IsRequired();
        builder.Property(user => user.MiddleName).HasMaxLength(100);
        builder.Property(user => user.PhoneNumber).HasMaxLength(30).IsRequired();
        builder.Property(user => user.UserName).HasMaxLength(80).IsRequired();
        builder.Property(user => user.Email).HasMaxLength(255).IsRequired();
        builder.Property(user => user.PasswordHash).HasMaxLength(500).IsRequired();
        builder.Property(user => user.Role).HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.HasIndex(user => user.UserName).IsUnique();
        builder.HasIndex(user => user.Email).IsUnique();
        builder.HasIndex(user => user.PhoneNumber).IsUnique();

        builder.HasData(new User
        {
            Id = SeedIds.SuperAdminUserId,
            FirstName = "System",
            LastName = "Administrator",
            PhoneNumber = "+992000000000",
            UserName = "superadmin",
            Email = "superadmin@ukstady.local",
            PasswordHash = "$2b$10$RzitZs5gDWdUufRQfxvAm.M2Bm64tpJOPBd/JCQMcKX4qBuvOcL5.",
            Role = UserRole.SuperAdmin,
            IsActive = true,
            CreatedAtUtc = SeedIds.SeedCreatedAtUtc
        });
    }
}

public sealed class GroupConfiguration : IEntityTypeConfiguration<Group>
{
    public void Configure(EntityTypeBuilder<Group> builder)
    {
        builder.ToTable("groups");
        builder.HasKey(group => group.Id);
        builder.Property(group => group.Name).HasMaxLength(150).IsRequired();
        builder.Property(group => group.Description).HasMaxLength(500);
        builder.HasIndex(group => group.Name).IsUnique();
    }
}

public sealed class GroupStudentConfiguration : IEntityTypeConfiguration<GroupStudent>
{
    public void Configure(EntityTypeBuilder<GroupStudent> builder)
    {
        builder.ToTable("group_students");
        builder.HasKey(groupStudent => new { groupStudent.GroupId, groupStudent.StudentId });
        builder.HasOne(groupStudent => groupStudent.Group)
            .WithMany(group => group.Students)
            .HasForeignKey(groupStudent => groupStudent.GroupId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(groupStudent => groupStudent.Student)
            .WithMany(user => user.StudentGroups)
            .HasForeignKey(groupStudent => groupStudent.StudentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

public sealed class SubjectConfiguration : IEntityTypeConfiguration<Subject>
{
    public void Configure(EntityTypeBuilder<Subject> builder)
    {
        builder.ToTable("subjects");
        builder.HasKey(subject => subject.Id);
        builder.Property(subject => subject.Name).HasMaxLength(150).IsRequired();
        builder.Property(subject => subject.Description).HasMaxLength(500);
        builder.HasIndex(subject => subject.Name).IsUnique();
    }
}

public sealed class TopicConfiguration : IEntityTypeConfiguration<Topic>
{
    public void Configure(EntityTypeBuilder<Topic> builder)
    {
        builder.ToTable("topics");
        builder.HasKey(topic => topic.Id);
        builder.Property(topic => topic.Title).HasMaxLength(200).IsRequired();
        builder.Property(topic => topic.Description).HasMaxLength(1000);
        builder.HasOne(topic => topic.Subject)
            .WithMany(subject => subject.Topics)
            .HasForeignKey(topic => topic.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(topic => new { topic.SubjectId, topic.Title }).IsUnique();
    }
}

public sealed class QuestionConfiguration : IEntityTypeConfiguration<Question>
{
    public void Configure(EntityTypeBuilder<Question> builder)
    {
        builder.ToTable("questions");
        builder.HasKey(question => question.Id);
        builder.Property(question => question.Text).HasMaxLength(4000).IsRequired();
        builder.Property(question => question.Type).HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(question => question.Points).HasDefaultValue(1);
        builder.HasOne(question => question.Topic)
            .WithMany(topic => topic.Questions)
            .HasForeignKey(question => question.TopicId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class QuestionOptionConfiguration : IEntityTypeConfiguration<QuestionOption>
{
    public void Configure(EntityTypeBuilder<QuestionOption> builder)
    {
        builder.ToTable("question_options");
        builder.HasKey(option => option.Id);
        builder.Property(option => option.Text).HasMaxLength(2000).IsRequired();
        builder.HasOne(option => option.Question)
            .WithMany(question => question.Options)
            .HasForeignKey(option => option.QuestionId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasIndex(option => new { option.QuestionId, option.SortOrder }).IsUnique();
    }
}

public sealed class TeacherSubjectGroupConfiguration : IEntityTypeConfiguration<TeacherSubjectGroup>
{
    public void Configure(EntityTypeBuilder<TeacherSubjectGroup> builder)
    {
        builder.ToTable("teacher_subject_groups");
        builder.HasKey(assignment => new { assignment.TeacherId, assignment.SubjectId, assignment.GroupId });
        builder.HasOne(assignment => assignment.Teacher)
            .WithMany(user => user.TeacherAssignments)
            .HasForeignKey(assignment => assignment.TeacherId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(assignment => assignment.Subject)
            .WithMany(subject => subject.TeacherAssignments)
            .HasForeignKey(assignment => assignment.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(assignment => assignment.Group)
            .WithMany(group => group.TeacherAssignments)
            .HasForeignKey(assignment => assignment.GroupId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class TeacherSubjectConfiguration : IEntityTypeConfiguration<TeacherSubject>
{
    public void Configure(EntityTypeBuilder<TeacherSubject> builder)
    {
        builder.ToTable("teacher_subjects");
        builder.HasKey(assignment => new { assignment.TeacherId, assignment.SubjectId });
        builder.HasOne(assignment => assignment.Teacher)
            .WithMany(user => user.TeacherSubjects)
            .HasForeignKey(assignment => assignment.TeacherId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(assignment => assignment.Subject)
            .WithMany(subject => subject.TeacherSubjects)
            .HasForeignKey(assignment => assignment.SubjectId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

public sealed class DailyLessonConfiguration : IEntityTypeConfiguration<DailyLesson>
{
    public void Configure(EntityTypeBuilder<DailyLesson> builder)
    {
        builder.ToTable("daily_lessons");
        builder.HasKey(lesson => lesson.Id);
        builder.Property(lesson => lesson.Title).HasMaxLength(200).IsRequired();
        builder.HasOne(lesson => lesson.Teacher)
            .WithMany(user => user.CreatedDailyLessons)
            .HasForeignKey(lesson => lesson.TeacherId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(lesson => lesson.Subject)
            .WithMany()
            .HasForeignKey(lesson => lesson.SubjectId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(lesson => lesson.Topic)
            .WithMany(topic => topic.DailyLessons)
            .HasForeignKey(lesson => lesson.TopicId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(lesson => new { lesson.TeacherId, lesson.TopicId, lesson.LessonDate }).IsUnique();
    }
}

public sealed class TestAssignmentConfiguration : IEntityTypeConfiguration<TestAssignment>
{
    public void Configure(EntityTypeBuilder<TestAssignment> builder)
    {
        builder.ToTable("test_assignments");
        builder.HasKey(assignment => assignment.Id);
        builder.HasOne(assignment => assignment.DailyLesson)
            .WithMany(lesson => lesson.TestAssignments)
            .HasForeignKey(assignment => assignment.DailyLessonId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(assignment => assignment.Group)
            .WithMany(group => group.TestAssignments)
            .HasForeignKey(assignment => assignment.GroupId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(assignment => new { assignment.DailyLessonId, assignment.GroupId }).IsUnique();
    }
}

public sealed class StudentTestAttemptConfiguration : IEntityTypeConfiguration<StudentTestAttempt>
{
    public void Configure(EntityTypeBuilder<StudentTestAttempt> builder)
    {
        builder.ToTable("student_test_attempts");
        builder.HasKey(attempt => attempt.Id);
        builder.Property(attempt => attempt.Status).HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(attempt => attempt.AutoScore).HasPrecision(5, 2);
        builder.HasOne(attempt => attempt.TestAssignment)
            .WithMany(assignment => assignment.Attempts)
            .HasForeignKey(attempt => attempt.TestAssignmentId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(attempt => attempt.Student)
            .WithMany(user => user.TestAttempts)
            .HasForeignKey(attempt => attempt.StudentId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(attempt => new { attempt.TestAssignmentId, attempt.StudentId }).IsUnique();
    }
}

public sealed class AttemptQuestionConfiguration : IEntityTypeConfiguration<AttemptQuestion>
{
    public void Configure(EntityTypeBuilder<AttemptQuestion> builder)
    {
        builder.ToTable("attempt_questions");
        builder.HasKey(attemptQuestion => new { attemptQuestion.StudentTestAttemptId, attemptQuestion.QuestionId });
        builder.HasOne(attemptQuestion => attemptQuestion.StudentTestAttempt)
            .WithMany(attempt => attempt.AttemptQuestions)
            .HasForeignKey(attemptQuestion => attemptQuestion.StudentTestAttemptId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(attemptQuestion => attemptQuestion.Question)
            .WithMany(question => question.AttemptQuestions)
            .HasForeignKey(attemptQuestion => attemptQuestion.QuestionId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(attemptQuestion => new { attemptQuestion.StudentTestAttemptId, attemptQuestion.SortOrder }).IsUnique();
    }
}

public sealed class StudentAnswerConfiguration : IEntityTypeConfiguration<StudentAnswer>
{
    public void Configure(EntityTypeBuilder<StudentAnswer> builder)
    {
        builder.ToTable("student_answers");
        builder.HasKey(answer => answer.Id);
        builder.HasOne(answer => answer.StudentTestAttempt)
            .WithMany(attempt => attempt.Answers)
            .HasForeignKey(answer => answer.StudentTestAttemptId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(answer => answer.Question)
            .WithMany()
            .HasForeignKey(answer => answer.QuestionId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(answer => answer.QuestionOption)
            .WithMany(option => option.StudentAnswers)
            .HasForeignKey(answer => answer.QuestionOptionId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(answer => new
        {
            answer.StudentTestAttemptId,
            answer.QuestionId,
            answer.QuestionOptionId
        }).IsUnique();
    }
}

public sealed class GradeEntryConfiguration : IEntityTypeConfiguration<GradeEntry>
{
    public void Configure(EntityTypeBuilder<GradeEntry> builder)
    {
        builder.ToTable("grade_entries");
        builder.HasKey(grade => grade.Id);
        builder.Property(grade => grade.AttendanceStatus).HasConversion<string>().HasMaxLength(30).IsRequired();
        builder.Property(grade => grade.AutoScore).HasPrecision(5, 2);
        builder.Property(grade => grade.FinalScore).HasPrecision(5, 2);
        builder.Property(grade => grade.TeacherComment).HasMaxLength(1000);
        builder.HasOne(grade => grade.DailyLesson)
            .WithMany(lesson => lesson.GradeEntries)
            .HasForeignKey(grade => grade.DailyLessonId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(grade => grade.Student)
            .WithMany(user => user.GradeEntries)
            .HasForeignKey(grade => grade.StudentId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasOne(grade => grade.StudentTestAttempt)
            .WithOne(attempt => attempt.GradeEntry)
            .HasForeignKey<GradeEntry>(grade => grade.StudentTestAttemptId)
            .OnDelete(DeleteBehavior.SetNull);
        builder.HasOne(grade => grade.GradedByTeacher)
            .WithMany()
            .HasForeignKey(grade => grade.GradedByTeacherId)
            .OnDelete(DeleteBehavior.Restrict);
        builder.HasIndex(grade => new { grade.DailyLessonId, grade.StudentId }).IsUnique();
    }
}

public sealed class GradeAuditLogConfiguration : IEntityTypeConfiguration<GradeAuditLog>
{
    public void Configure(EntityTypeBuilder<GradeAuditLog> builder)
    {
        builder.ToTable("grade_audit_logs");
        builder.HasKey(log => log.Id);
        builder.Property(log => log.PreviousFinalScore).HasPrecision(5, 2);
        builder.Property(log => log.NewFinalScore).HasPrecision(5, 2);
        builder.Property(log => log.Reason).HasMaxLength(1000);
        builder.HasOne(log => log.GradeEntry)
            .WithMany(grade => grade.AuditLogs)
            .HasForeignKey(log => log.GradeEntryId)
            .OnDelete(DeleteBehavior.Cascade);
        builder.HasOne(log => log.ChangedByUser)
            .WithMany()
            .HasForeignKey(log => log.ChangedByUserId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}

internal static class SeedIds
{
    public static readonly Guid SuperAdminUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");

    public static readonly DateTimeOffset SeedCreatedAtUtc = new(2026, 9, 15, 0, 0, 0, TimeSpan.Zero);
}

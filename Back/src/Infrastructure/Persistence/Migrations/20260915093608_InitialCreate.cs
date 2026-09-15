using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UKStady.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "groups",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_groups", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "subjects",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    Description = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_subjects", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "users",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FirstName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    LastName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    MiddleName = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    UserName = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    Email = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    PasswordHash = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    Role = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "topics",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    SubjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_topics", x => x.Id);
                    table.ForeignKey(
                        name: "FK_topics_subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "subjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "group_students",
                columns: table => new
                {
                    GroupId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentId = table.Column<Guid>(type: "uuid", nullable: false),
                    JoinedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_group_students", x => new { x.GroupId, x.StudentId });
                    table.ForeignKey(
                        name: "FK_group_students_groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_group_students_users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "teacher_subject_groups",
                columns: table => new
                {
                    TeacherId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    GroupId = table.Column<Guid>(type: "uuid", nullable: false),
                    AssignedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_teacher_subject_groups", x => new { x.TeacherId, x.SubjectId, x.GroupId });
                    table.ForeignKey(
                        name: "FK_teacher_subject_groups_groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_teacher_subject_groups_subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "subjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_teacher_subject_groups_users_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "daily_lessons",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TeacherId = table.Column<Guid>(type: "uuid", nullable: false),
                    SubjectId = table.Column<Guid>(type: "uuid", nullable: false),
                    TopicId = table.Column<Guid>(type: "uuid", nullable: false),
                    LessonDate = table.Column<DateOnly>(type: "date", nullable: false),
                    Title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    QuestionCount = table.Column<int>(type: "integer", nullable: false),
                    OpensAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    ClosesAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_daily_lessons", x => x.Id);
                    table.ForeignKey(
                        name: "FK_daily_lessons_subjects_SubjectId",
                        column: x => x.SubjectId,
                        principalTable: "subjects",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_daily_lessons_topics_TopicId",
                        column: x => x.TopicId,
                        principalTable: "topics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_daily_lessons_users_TeacherId",
                        column: x => x.TeacherId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "questions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TopicId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "character varying(4000)", maxLength: 4000, nullable: false),
                    Type = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    Points = table.Column<int>(type: "integer", nullable: false, defaultValue: 1),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_questions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_questions_topics_TopicId",
                        column: x => x.TopicId,
                        principalTable: "topics",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "test_assignments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DailyLessonId = table.Column<Guid>(type: "uuid", nullable: false),
                    GroupId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_test_assignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_test_assignments_daily_lessons_DailyLessonId",
                        column: x => x.DailyLessonId,
                        principalTable: "daily_lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_test_assignments_groups_GroupId",
                        column: x => x.GroupId,
                        principalTable: "groups",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "question_options",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    Text = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: false),
                    IsCorrect = table.Column<bool>(type: "boolean", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_question_options", x => x.Id);
                    table.ForeignKey(
                        name: "FK_question_options_questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "student_test_attempts",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    TestAssignmentId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentId = table.Column<Guid>(type: "uuid", nullable: false),
                    Status = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    StartedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    SubmittedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    ExpiredAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    AutoScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_student_test_attempts", x => x.Id);
                    table.ForeignKey(
                        name: "FK_student_test_attempts_test_assignments_TestAssignmentId",
                        column: x => x.TestAssignmentId,
                        principalTable: "test_assignments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_student_test_attempts_users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "attempt_questions",
                columns: table => new
                {
                    StudentTestAttemptId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    SortOrder = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_attempt_questions", x => new { x.StudentTestAttemptId, x.QuestionId });
                    table.ForeignKey(
                        name: "FK_attempt_questions_questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_attempt_questions_student_test_attempts_StudentTestAttemptId",
                        column: x => x.StudentTestAttemptId,
                        principalTable: "student_test_attempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "grade_entries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    DailyLessonId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentId = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentTestAttemptId = table.Column<Guid>(type: "uuid", nullable: true),
                    AttendanceStatus = table.Column<string>(type: "character varying(30)", maxLength: 30, nullable: false),
                    AutoScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: false),
                    FinalScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    GradedByTeacherId = table.Column<Guid>(type: "uuid", nullable: true),
                    GradedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    TeacherComment = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_grade_entries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_grade_entries_daily_lessons_DailyLessonId",
                        column: x => x.DailyLessonId,
                        principalTable: "daily_lessons",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_grade_entries_student_test_attempts_StudentTestAttemptId",
                        column: x => x.StudentTestAttemptId,
                        principalTable: "student_test_attempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_grade_entries_users_GradedByTeacherId",
                        column: x => x.GradedByTeacherId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_grade_entries_users_StudentId",
                        column: x => x.StudentId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "student_answers",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    StudentTestAttemptId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionId = table.Column<Guid>(type: "uuid", nullable: false),
                    QuestionOptionId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_student_answers", x => x.Id);
                    table.ForeignKey(
                        name: "FK_student_answers_question_options_QuestionOptionId",
                        column: x => x.QuestionOptionId,
                        principalTable: "question_options",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_student_answers_questions_QuestionId",
                        column: x => x.QuestionId,
                        principalTable: "questions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_student_answers_student_test_attempts_StudentTestAttemptId",
                        column: x => x.StudentTestAttemptId,
                        principalTable: "student_test_attempts",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "grade_audit_logs",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    GradeEntryId = table.Column<Guid>(type: "uuid", nullable: false),
                    ChangedByUserId = table.Column<Guid>(type: "uuid", nullable: false),
                    PreviousFinalScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    NewFinalScore = table.Column<decimal>(type: "numeric(5,2)", precision: 5, scale: 2, nullable: true),
                    Reason = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_grade_audit_logs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_grade_audit_logs_grade_entries_GradeEntryId",
                        column: x => x.GradeEntryId,
                        principalTable: "grade_entries",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_grade_audit_logs_users_ChangedByUserId",
                        column: x => x.ChangedByUserId,
                        principalTable: "users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.InsertData(
                table: "users",
                columns: new[] { "Id", "CreatedAtUtc", "Email", "FirstName", "IsActive", "LastName", "MiddleName", "PasswordHash", "Role", "UpdatedAtUtc", "UserName" },
                values: new object[] { new Guid("11111111-1111-1111-1111-111111111111"), new DateTimeOffset(new DateTime(2026, 9, 15, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), "superadmin@ukstady.local", "System", true, "Administrator", null, "$2b$10$RzitZs5gDWdUufRQfxvAm.M2Bm64tpJOPBd/JCQMcKX4qBuvOcL5.", "SuperAdmin", null, "superadmin" });

            migrationBuilder.CreateIndex(
                name: "IX_attempt_questions_QuestionId",
                table: "attempt_questions",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_attempt_questions_StudentTestAttemptId_SortOrder",
                table: "attempt_questions",
                columns: new[] { "StudentTestAttemptId", "SortOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_daily_lessons_SubjectId",
                table: "daily_lessons",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_daily_lessons_TeacherId_TopicId_LessonDate",
                table: "daily_lessons",
                columns: new[] { "TeacherId", "TopicId", "LessonDate" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_daily_lessons_TopicId",
                table: "daily_lessons",
                column: "TopicId");

            migrationBuilder.CreateIndex(
                name: "IX_grade_audit_logs_ChangedByUserId",
                table: "grade_audit_logs",
                column: "ChangedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_grade_audit_logs_GradeEntryId",
                table: "grade_audit_logs",
                column: "GradeEntryId");

            migrationBuilder.CreateIndex(
                name: "IX_grade_entries_DailyLessonId_StudentId",
                table: "grade_entries",
                columns: new[] { "DailyLessonId", "StudentId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_grade_entries_GradedByTeacherId",
                table: "grade_entries",
                column: "GradedByTeacherId");

            migrationBuilder.CreateIndex(
                name: "IX_grade_entries_StudentId",
                table: "grade_entries",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_grade_entries_StudentTestAttemptId",
                table: "grade_entries",
                column: "StudentTestAttemptId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_group_students_StudentId",
                table: "group_students",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_groups_Name",
                table: "groups",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_question_options_QuestionId_SortOrder",
                table: "question_options",
                columns: new[] { "QuestionId", "SortOrder" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_questions_TopicId",
                table: "questions",
                column: "TopicId");

            migrationBuilder.CreateIndex(
                name: "IX_student_answers_QuestionId",
                table: "student_answers",
                column: "QuestionId");

            migrationBuilder.CreateIndex(
                name: "IX_student_answers_QuestionOptionId",
                table: "student_answers",
                column: "QuestionOptionId");

            migrationBuilder.CreateIndex(
                name: "IX_student_answers_StudentTestAttemptId_QuestionId_QuestionOpt~",
                table: "student_answers",
                columns: new[] { "StudentTestAttemptId", "QuestionId", "QuestionOptionId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_student_test_attempts_StudentId",
                table: "student_test_attempts",
                column: "StudentId");

            migrationBuilder.CreateIndex(
                name: "IX_student_test_attempts_TestAssignmentId_StudentId",
                table: "student_test_attempts",
                columns: new[] { "TestAssignmentId", "StudentId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_subjects_Name",
                table: "subjects",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_teacher_subject_groups_GroupId",
                table: "teacher_subject_groups",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_teacher_subject_groups_SubjectId",
                table: "teacher_subject_groups",
                column: "SubjectId");

            migrationBuilder.CreateIndex(
                name: "IX_test_assignments_DailyLessonId_GroupId",
                table: "test_assignments",
                columns: new[] { "DailyLessonId", "GroupId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_test_assignments_GroupId",
                table: "test_assignments",
                column: "GroupId");

            migrationBuilder.CreateIndex(
                name: "IX_topics_SubjectId_Title",
                table: "topics",
                columns: new[] { "SubjectId", "Title" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_Email",
                table: "users",
                column: "Email",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_users_UserName",
                table: "users",
                column: "UserName",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "attempt_questions");

            migrationBuilder.DropTable(
                name: "grade_audit_logs");

            migrationBuilder.DropTable(
                name: "group_students");

            migrationBuilder.DropTable(
                name: "student_answers");

            migrationBuilder.DropTable(
                name: "teacher_subject_groups");

            migrationBuilder.DropTable(
                name: "grade_entries");

            migrationBuilder.DropTable(
                name: "question_options");

            migrationBuilder.DropTable(
                name: "student_test_attempts");

            migrationBuilder.DropTable(
                name: "questions");

            migrationBuilder.DropTable(
                name: "test_assignments");

            migrationBuilder.DropTable(
                name: "daily_lessons");

            migrationBuilder.DropTable(
                name: "groups");

            migrationBuilder.DropTable(
                name: "topics");

            migrationBuilder.DropTable(
                name: "users");

            migrationBuilder.DropTable(
                name: "subjects");
        }
    }
}

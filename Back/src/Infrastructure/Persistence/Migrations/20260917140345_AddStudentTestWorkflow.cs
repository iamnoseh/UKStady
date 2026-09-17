using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UKStady.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddStudentTestWorkflow : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_student_answers_StudentTestAttemptId_QuestionId_QuestionOpt~",
                table: "student_answers");

            migrationBuilder.AlterColumn<Guid>(
                name: "QuestionOptionId",
                table: "student_answers",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddColumn<string>(
                name: "AnswerText",
                table: "student_answers",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "OptionOrderJson",
                table: "attempt_questions",
                type: "character varying(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_student_answers_StudentTestAttemptId_QuestionId",
                table: "student_answers",
                columns: new[] { "StudentTestAttemptId", "QuestionId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_student_answers_StudentTestAttemptId_QuestionId",
                table: "student_answers");

            migrationBuilder.DropColumn(
                name: "AnswerText",
                table: "student_answers");

            migrationBuilder.DropColumn(
                name: "OptionOrderJson",
                table: "attempt_questions");

            migrationBuilder.AlterColumn<Guid>(
                name: "QuestionOptionId",
                table: "student_answers",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_student_answers_StudentTestAttemptId_QuestionId_QuestionOpt~",
                table: "student_answers",
                columns: new[] { "StudentTestAttemptId", "QuestionId", "QuestionOptionId" },
                unique: true);
        }
    }
}

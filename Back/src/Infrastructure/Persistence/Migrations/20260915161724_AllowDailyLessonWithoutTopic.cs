using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UKStady.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AllowDailyLessonWithoutTopic : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_daily_lessons_SubjectId",
                table: "daily_lessons");

            migrationBuilder.AlterColumn<Guid>(
                name: "TopicId",
                table: "daily_lessons",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.CreateIndex(
                name: "IX_daily_lessons_SubjectId_LessonDate",
                table: "daily_lessons",
                columns: new[] { "SubjectId", "LessonDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_daily_lessons_SubjectId_LessonDate",
                table: "daily_lessons");

            migrationBuilder.AlterColumn<Guid>(
                name: "TopicId",
                table: "daily_lessons",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_daily_lessons_SubjectId",
                table: "daily_lessons",
                column: "SubjectId");
        }
    }
}

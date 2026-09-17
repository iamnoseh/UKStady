using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UKStady.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AllowSameTopicLessonForMultipleGroups : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_daily_lessons_TeacherId_TopicId_LessonDate",
                table: "daily_lessons");

            migrationBuilder.CreateIndex(
                name: "IX_daily_lessons_TeacherId_TopicId_LessonDate",
                table: "daily_lessons",
                columns: new[] { "TeacherId", "TopicId", "LessonDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_daily_lessons_TeacherId_TopicId_LessonDate",
                table: "daily_lessons");

            migrationBuilder.CreateIndex(
                name: "IX_daily_lessons_TeacherId_TopicId_LessonDate",
                table: "daily_lessons",
                columns: new[] { "TeacherId", "TopicId", "LessonDate" },
                unique: true);
        }
    }
}

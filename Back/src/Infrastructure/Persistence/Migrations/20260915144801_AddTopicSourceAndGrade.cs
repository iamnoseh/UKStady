using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UKStady.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTopicSourceAndGrade : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Grade",
                table: "topics",
                type: "character varying(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Source",
                table: "topics",
                type: "character varying(500)",
                maxLength: 500,
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Grade",
                table: "topics");

            migrationBuilder.DropColumn(
                name: "Source",
                table: "topics");
        }
    }
}

using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace UKStady.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddGroupTestAccessSettings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "TestAccessMode",
                table: "groups",
                type: "character varying(30)",
                maxLength: 30,
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "TestEndTime",
                table: "groups",
                type: "time without time zone",
                nullable: true);

            migrationBuilder.AddColumn<TimeOnly>(
                name: "TestStartTime",
                table: "groups",
                type: "time without time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "TestAccessMode",
                table: "groups");

            migrationBuilder.DropColumn(
                name: "TestEndTime",
                table: "groups");

            migrationBuilder.DropColumn(
                name: "TestStartTime",
                table: "groups");
        }
    }
}

using System.Text.Json.Serialization;

namespace UKStady.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter<UserRole>))]
public enum UserRole
{
    SuperAdmin = 1,
    Admin = 2,
    Manager = 3,
    Teacher = 4,
    Student = 5
}

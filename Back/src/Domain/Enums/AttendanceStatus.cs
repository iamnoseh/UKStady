using System.Text.Json.Serialization;

namespace UKStady.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter<AttendanceStatus>))]
public enum AttendanceStatus
{
    Present = 1,
    Absent = 2
}

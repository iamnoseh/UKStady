using System.Text.Json.Serialization;

namespace UKStady.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter<TestStatus>))]
public enum TestStatus
{
    Pending = 1,
    InProgress = 2,
    Submitted = 3,
    Expired = 4,
    Graded = 5
}

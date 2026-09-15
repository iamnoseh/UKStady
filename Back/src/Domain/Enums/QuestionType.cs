using System.Text.Json.Serialization;

namespace UKStady.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter<QuestionType>))]
public enum QuestionType
{
    ClosedAnswer = 1,
    OpenAnswer = 1,
    SingleChoice = 2
}

using System.Text.Json.Serialization;

namespace UKStady.Domain.Enums;

[JsonConverter(typeof(JsonStringEnumConverter<QuestionType>))]
public enum QuestionType
{
    SingleChoice = 1,
    MultipleChoice = 2
}

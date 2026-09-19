namespace UKStady.Application.Features.Administration;

public interface IAdministrationService
{
    Task<IReadOnlyList<UserDto>> GetUsersAsync(CancellationToken cancellationToken);

    Task<UserDto?> GetUserAsync(Guid id, CancellationToken cancellationToken);

    GeneratedPasswordDto GenerateUserPassword();

    Task<UserDto> CreateUserAsync(CreateUserRequest request, CancellationToken cancellationToken);

    Task<UserDto?> UpdateUserAsync(Guid id, UpdateUserRequest request, CancellationToken cancellationToken);

    Task<bool> ChangeUserPasswordAsync(Guid id, string newPassword, CancellationToken cancellationToken);

    Task<bool> DeactivateUserAsync(Guid id, CancellationToken cancellationToken);

    Task<bool> HardDeleteUserAsync(Guid id, CancellationToken cancellationToken);

    Task<IReadOnlyList<GroupDto>> GetGroupsAsync(CancellationToken cancellationToken);

    Task<GroupDto?> GetGroupAsync(Guid id, CancellationToken cancellationToken);

    Task<GroupDto> CreateGroupAsync(CreateGroupRequest request, CancellationToken cancellationToken);

    Task<GroupDto?> UpdateGroupAsync(Guid id, UpdateGroupRequest request, CancellationToken cancellationToken);

    Task<GroupDto?> UpdateGroupTestAccessAsync(Guid id, UpdateGroupTestAccessRequest request, CancellationToken cancellationToken);

    Task<bool> DeactivateGroupAsync(Guid id, CancellationToken cancellationToken);

    Task<bool> AddStudentToGroupAsync(Guid groupId, Guid studentId, CancellationToken cancellationToken);

    Task<bool> RemoveStudentFromGroupAsync(Guid groupId, Guid studentId, CancellationToken cancellationToken);

    Task<IReadOnlyList<SubjectDto>> GetSubjectsAsync(CancellationToken cancellationToken);

    Task<SubjectDto?> GetSubjectAsync(Guid id, CancellationToken cancellationToken);

    Task<SubjectDto> CreateSubjectAsync(CreateSubjectRequest request, CancellationToken cancellationToken);

    Task<SubjectDto?> UpdateSubjectAsync(Guid id, UpdateSubjectRequest request, CancellationToken cancellationToken);

    Task<bool> DeactivateSubjectAsync(Guid id, CancellationToken cancellationToken);

    Task<TeacherSubjectAssignmentDto?> AssignTeacherSubjectAsync(
        AssignTeacherSubjectRequest request,
        CancellationToken cancellationToken);

    Task<bool> RemoveTeacherSubjectAsync(
        Guid teacherId,
        Guid subjectId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<TeacherSubjectAssignmentDto>> GetTeacherSubjectsAsync(CancellationToken cancellationToken);

    Task<TeacherAssignmentDto?> AssignTeacherAsync(AssignTeacherRequest request, CancellationToken cancellationToken);

    Task<TeacherAssignmentDto?> SetTeacherAssignmentAsync(
        Guid groupId,
        Guid subjectId,
        SetTeacherAssignmentRequest request,
        CancellationToken cancellationToken);

    Task<bool> RemoveTeacherAssignmentAsync(
        Guid teacherId,
        Guid subjectId,
        Guid groupId,
        CancellationToken cancellationToken);

    Task<IReadOnlyList<TeacherAssignmentDto>> GetTeacherAssignmentsAsync(CancellationToken cancellationToken);

    Task<DashboardSummaryDto> GetDashboardSummaryAsync(CancellationToken cancellationToken);

    Task<DashboardDailyResultsDto> GetDashboardDailyResultsAsync(
        DateOnly? date,
        Guid? groupId,
        string? sort,
        CancellationToken cancellationToken);
}

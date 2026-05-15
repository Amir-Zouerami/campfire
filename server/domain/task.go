package domain

import "time"

/*
TaskStatus identifies the lifecycle state of a Campfire task.
*/
type TaskStatus string

const (
	/*
		TaskStatusActive means the task is still in progress.
	*/
	TaskStatusActive TaskStatus = "active"

	/*
		TaskStatusCompleted means the task has been finished.
	*/
	TaskStatusCompleted TaskStatus = "completed"

	/*
		TaskStatusBlocked means the task is blocked.
	*/
	TaskStatusBlocked TaskStatus = "blocked"

	/*
		TaskStatusDropped means the task was intentionally dropped.
	*/
	TaskStatusDropped TaskStatus = "dropped"

	/*
		TaskStatusArchived means the task is hidden by default.
	*/
	TaskStatusArchived TaskStatus = "archived"
)

/*
Task represents work tracked by Campfire.

Tasks may be created manually or later derived from standup answers. Time entries
can be attached to any task for any workspace-local date.
*/
type Task struct {
	ID          ID
	WorkspaceID ID
	UserID      string

	SourceSubmissionID ID
	SourceAnswerID     ID

	Title       string
	Description string

	ProjectID  ID
	CategoryID ID

	Status   TaskStatus
	BoardURL string

	CreatedBy   string
	CreatedAt   time.Time
	UpdatedAt   time.Time
	CompletedAt *time.Time
}

/*
Project groups tasks and time entries at workspace level.
*/
type Project struct {
	ID          ID
	WorkspaceID ID

	Name  string
	Code  string
	Color string

	CreatedBy string
	CreatedAt time.Time
	UpdatedAt time.Time
}

/*
TaskCategory groups tasks and time entries at workspace level.
*/
type TaskCategory struct {
	ID          ID
	WorkspaceID ID

	Name  string
	Color string

	CreatedBy string
	CreatedAt time.Time
	UpdatedAt time.Time
}

/*
TimeEntry records time spent against a task for a workspace-local date.
*/
type TimeEntry struct {
	ID          ID
	WorkspaceID ID

	TaskID ID
	UserID string

	EntryDate LocalDate
	Minutes   int
	Note      string

	ProjectID  ID
	CategoryID ID

	CreatedBy string
	CreatedAt time.Time
	UpdatedAt time.Time
}

/*
IsValid returns true when the task status is supported by Campfire MVP.
*/
func (s TaskStatus) IsValid() bool {
	switch s {
	case TaskStatusActive,
		TaskStatusCompleted,
		TaskStatusBlocked,
		TaskStatusDropped,
		TaskStatusArchived:
		return true
	default:
		return false
	}
}

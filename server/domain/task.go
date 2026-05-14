package domain

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

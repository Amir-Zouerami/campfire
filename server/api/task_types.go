package api

import (
	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/service"
)

/*
TaskPayload is the API representation of a task.
*/
type TaskPayload struct {
	ID                 string `json:"id"`
	WorkspaceID        string `json:"workspaceId"`
	UserID             string `json:"userId"`
	SourceSubmissionID string `json:"sourceSubmissionId"`
	SourceAnswerID     string `json:"sourceAnswerId"`
	Title              string `json:"title"`
	Description        string `json:"description"`
	ProjectID          string `json:"projectId"`
	CategoryID         string `json:"categoryId"`
	Status             string `json:"status"`
	BoardURL           string `json:"boardUrl"`
	CreatedBy          string `json:"createdBy"`
	CreatedAt          string `json:"createdAt"`
	UpdatedAt          string `json:"updatedAt"`
	CompletedAt        string `json:"completedAt"`
}

/*
TimeEntryPayload is the API representation of a time entry.
*/
type TimeEntryPayload struct {
	ID          string `json:"id"`
	WorkspaceID string `json:"workspaceId"`
	TaskID      string `json:"taskId"`
	UserID      string `json:"userId"`
	EntryDate   string `json:"entryDate"`
	Minutes     int    `json:"minutes"`
	Note        string `json:"note"`
	ProjectID   string `json:"projectId"`
	CategoryID  string `json:"categoryId"`
	CreatedBy   string `json:"createdBy"`
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

/*
ListMyTasksResponse is returned by GET /workspaces/{workspaceID}/tasks/my.
*/
type ListMyTasksResponse struct {
	Tasks []TaskPayload `json:"tasks"`
}

/*
CreateTaskRequest is accepted by POST /workspaces/{workspaceID}/tasks.
*/
type CreateTaskRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	BoardURL    string `json:"boardUrl"`
}

/*
CreateTaskResponse is returned by POST /workspaces/{workspaceID}/tasks.
*/
type CreateTaskResponse struct {
	Task TaskPayload `json:"task"`
}

/*
UpdateTaskRequest is accepted by PUT /workspaces/{workspaceID}/tasks/{taskID}.
*/
type UpdateTaskRequest struct {
	Title       string `json:"title"`
	Description string `json:"description"`
	Status      string `json:"status"`
	BoardURL    string `json:"boardUrl"`
}

/*
UpdateTaskResponse is returned by PUT /workspaces/{workspaceID}/tasks/{taskID}.
*/
type UpdateTaskResponse struct {
	Task TaskPayload `json:"task"`
}

/*
ListMyTimeEntriesResponse is returned by GET /workspaces/{workspaceID}/time-entries/my.
*/
type ListMyTimeEntriesResponse struct {
	TimeEntries []TimeEntryPayload `json:"timeEntries"`
}

/*
CreateTimeEntryRequest is accepted by POST /workspaces/{workspaceID}/time-entries.
*/
type CreateTimeEntryRequest struct {
	TaskID    string `json:"taskId"`
	EntryDate string `json:"entryDate"`
	Minutes   int    `json:"minutes"`
	Note      string `json:"note"`
}

/*
CreateTimeEntryResponse is returned by POST /workspaces/{workspaceID}/time-entries.
*/
type CreateTimeEntryResponse struct {
	TimeEntry TimeEntryPayload `json:"timeEntry"`
}

/*
ToServiceInput maps a create-task request to service input.
*/
func (r CreateTaskRequest) ToServiceInput(actorUserID string, workspaceID string) service.CreateTaskInput {
	return service.CreateTaskInput{
		ActorUserID: actorUserID,
		WorkspaceID: workspaceID,
		Title:       r.Title,
		Description: r.Description,
		BoardURL:    r.BoardURL,
	}
}

/*
ToServiceInput maps an update-task request to service input.
*/
func (r UpdateTaskRequest) ToServiceInput(
	actorUserID string,
	workspaceID string,
	taskID string,
) service.UpdateTaskInput {
	return service.UpdateTaskInput{
		ActorUserID: actorUserID,
		WorkspaceID: workspaceID,
		TaskID:      taskID,
		Title:       r.Title,
		Description: r.Description,
		Status:      r.Status,
		BoardURL:    r.BoardURL,
	}
}

/*
ToServiceInput maps a create-time-entry request to service input.
*/
func (r CreateTimeEntryRequest) ToServiceInput(
	actorUserID string,
	workspaceID string,
) service.CreateTimeEntryInput {
	return service.CreateTimeEntryInput{
		ActorUserID: actorUserID,
		WorkspaceID: workspaceID,
		TaskID:      r.TaskID,
		EntryDate:   r.EntryDate,
		Minutes:     r.Minutes,
		Note:        r.Note,
	}
}

/*
TasksToPayload maps tasks to API payloads.
*/
func TasksToPayload(tasks []domain.Task) []TaskPayload {
	payloads := make([]TaskPayload, 0, len(tasks))

	for _, task := range tasks {
		payloads = append(payloads, TaskToPayload(task))
	}

	return payloads
}

/*
TaskToPayload maps one task to an API payload.
*/
func TaskToPayload(task domain.Task) TaskPayload {
	completedAt := ""
	if task.CompletedAt != nil {
		completedAt = formatAPITime(*task.CompletedAt)
	}

	return TaskPayload{
		ID:                 task.ID.String(),
		WorkspaceID:        task.WorkspaceID.String(),
		UserID:             task.UserID,
		SourceSubmissionID: task.SourceSubmissionID.String(),
		SourceAnswerID:     task.SourceAnswerID.String(),
		Title:              task.Title,
		Description:        task.Description,
		ProjectID:          task.ProjectID.String(),
		CategoryID:         task.CategoryID.String(),
		Status:             string(task.Status),
		BoardURL:           task.BoardURL,
		CreatedBy:          task.CreatedBy,
		CreatedAt:          formatAPITime(task.CreatedAt),
		UpdatedAt:          formatAPITime(task.UpdatedAt),
		CompletedAt:        completedAt,
	}
}

/*
TimeEntriesToPayload maps time entries to API payloads.
*/
func TimeEntriesToPayload(entries []domain.TimeEntry) []TimeEntryPayload {
	payloads := make([]TimeEntryPayload, 0, len(entries))

	for _, entry := range entries {
		payloads = append(payloads, TimeEntryToPayload(entry))
	}

	return payloads
}

/*
TimeEntryToPayload maps one time entry to an API payload.
*/
func TimeEntryToPayload(entry domain.TimeEntry) TimeEntryPayload {
	return TimeEntryPayload{
		ID:          entry.ID.String(),
		WorkspaceID: entry.WorkspaceID.String(),
		TaskID:      entry.TaskID.String(),
		UserID:      entry.UserID,
		EntryDate:   entry.EntryDate.String(),
		Minutes:     entry.Minutes,
		Note:        entry.Note,
		ProjectID:   entry.ProjectID.String(),
		CategoryID:  entry.CategoryID.String(),
		CreatedBy:   entry.CreatedBy,
		CreatedAt:   formatAPITime(entry.CreatedAt),
		UpdatedAt:   formatAPITime(entry.UpdatedAt),
	}
}

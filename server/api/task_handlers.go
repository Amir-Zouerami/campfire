package api

import (
	"encoding/json"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/service"
	"github.com/go-chi/chi/v5"
)

/*
handleListMyTasks handles listing current-user tasks.
*/
func handleListMyTasks(
	log logger.Logger,
	mm mattermost.Client,
	taskService *service.TaskService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		includeArchived := strings.EqualFold(r.URL.Query().Get("includeArchived"), "true")
		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		tasks, err := taskService.ListMyTasks(r.Context(), service.ListMyTasksInput{
			ActorUserID:     user.ID,
			WorkspaceID:     workspaceID,
			IncludeArchived: includeArchived,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListMyTasks(w, http.StatusOK, ListMyTasksResponse{
			Tasks: TasksToPayload(tasks),
		})
	}
}

/*
handleCreateTask handles creating a current-user task.
*/
func handleCreateTask(
	log logger.Logger,
	mm mattermost.Client,
	taskService *service.TaskService,
	auditService *service.AuditService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		var request CreateTaskRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		task, err := taskService.CreateTask(
			r.Context(),
			request.ToServiceInput(user.ID, workspaceID),
		)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		recordAuditEvent(
			r.Context(),
			auditService,
			task.WorkspaceID.String(),
			user.ID,
			"task_created",
			"task",
			task.ID.String(),
			map[string]string{
				"title":  task.Title,
				"status": string(task.Status),
			},
		)

		WriteCreateTask(w, http.StatusCreated, CreateTaskResponse{
			Task: TaskToPayload(*task),
		})
	}
}

/*
handleUpdateTask handles updating a current-user task.
*/
func handleUpdateTask(
	log logger.Logger,
	mm mattermost.Client,
	taskService *service.TaskService,
	auditService *service.AuditService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		taskID := strings.TrimSpace(chi.URLParam(r, "taskID"))

		var request UpdateTaskRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		task, err := taskService.UpdateTask(
			r.Context(),
			request.ToServiceInput(user.ID, workspaceID, taskID),
		)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		recordAuditEvent(
			r.Context(),
			auditService,
			task.WorkspaceID.String(),
			user.ID,
			"task_updated",
			"task",
			task.ID.String(),
			map[string]string{
				"title":  task.Title,
				"status": string(task.Status),
			},
		)

		WriteUpdateTask(w, http.StatusOK, UpdateTaskResponse{
			Task: TaskToPayload(*task),
		})
	}
}

/*
handleListMyTimeEntries handles listing current-user time entries.
*/
func handleListMyTimeEntries(
	log logger.Logger,
	mm mattermost.Client,
	taskService *service.TaskService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))
		startDate := strings.TrimSpace(r.URL.Query().Get("startDate"))
		endDate := strings.TrimSpace(r.URL.Query().Get("endDate"))
		if startDate == "" || endDate == "" {
			startDate, endDate = defaultTimeEntryDateRange()
		}

		entries, err := taskService.ListMyTimeEntries(r.Context(), service.ListMyTimeEntriesInput{
			ActorUserID: user.ID,
			WorkspaceID: workspaceID,
			StartDate:   startDate,
			EndDate:     endDate,
		})
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		WriteListMyTimeEntries(w, http.StatusOK, ListMyTimeEntriesResponse{
			TimeEntries: TimeEntriesToPayload(entries),
		})
	}
}

/*
handleCreateTimeEntry handles creating a current-user time entry.
*/
func handleCreateTimeEntry(
	log logger.Logger,
	mm mattermost.Client,
	taskService *service.TaskService,
	auditService *service.AuditService,
) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		user, ok := loadCurrentUser(w, r, log, mm)
		if !ok {
			return
		}

		workspaceID := strings.TrimSpace(chi.URLParam(r, "workspaceID"))

		var request CreateTimeEntryRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			WriteError(w, http.StatusBadRequest, "invalid_request", "Request body must be valid JSON.")
			return
		}

		timeEntry, err := taskService.CreateTimeEntry(
			r.Context(),
			request.ToServiceInput(user.ID, workspaceID),
		)
		if err != nil {
			logServiceError(log, err)
			WriteServiceError(w, err)
			return
		}

		recordAuditEvent(
			r.Context(),
			auditService,
			timeEntry.WorkspaceID.String(),
			user.ID,
			"time_entry_created",
			"time_entry",
			timeEntry.ID.String(),
			map[string]string{
				"task_id":    timeEntry.TaskID.String(),
				"entry_date": string(timeEntry.EntryDate),
				"minutes":    strconv.Itoa(timeEntry.Minutes),
			},
		)

		WriteCreateTimeEntry(w, http.StatusCreated, CreateTimeEntryResponse{
			TimeEntry: TimeEntryToPayload(*timeEntry),
		})
	}
}

/*
defaultTimeEntryDateRange returns a safe default range for time-entry listing.
*/
func defaultTimeEntryDateRange() (string, string) {
	now := time.Now().UTC()
	start := now.AddDate(0, 0, -14).Format("2006-01-02")
	end := now.Format("2006-01-02")

	return start, end
}

/*
parsePositiveIntQuery parses an optional positive integer query value.
*/
func parsePositiveIntQuery(value string, fallback int) int {
	parsed, err := strconv.Atoi(strings.TrimSpace(value))
	if err != nil || parsed <= 0 {
		return fallback
	}

	return parsed
}

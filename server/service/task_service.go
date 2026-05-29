package service

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
	"github.com/google/uuid"
)

/*
ListMyTasksInput contains filters for listing the current user's tasks.
*/
type ListMyTasksInput struct {
	ActorUserID     string
	WorkspaceID     string
	IncludeArchived bool
}

type CreateTaskInput struct {
	ActorUserID string
	WorkspaceID string

	Title       string
	Description string
	ProjectID   string
	CategoryID  string
	BoardURL    string
}

/*
UpdateTaskInput contains mutable task fields.
*/
type UpdateTaskInput struct {
	ActorUserID string
	WorkspaceID string
	TaskID      string

	Title       string
	Description string
	ProjectID   string
	CategoryID  string
	Status      string
	BoardURL    string
}

/*
ListMyTimeEntriesInput contains filters for listing the current user's time entries.
*/
type ListMyTimeEntriesInput struct {
	ActorUserID string
	WorkspaceID string
	StartDate   string
	EndDate     string
}

/*
CreateTimeEntryInput contains user-submitted time-entry data.
*/
type CreateTimeEntryInput struct {
	ActorUserID string
	WorkspaceID string

	TaskID     string
	EntryDate  string
	Minutes    int
	Note       string
	ProjectID  string
	CategoryID string
}

/*
TaskService owns task and time-entry business rules.
*/
type TaskService struct {
	workspaceStore store.WorkspaceStore
	taskStore      store.TaskStore
}

/*
NewTaskService creates a task service.
*/
func NewTaskService(
	workspaceStore store.WorkspaceStore,
	taskStore store.TaskStore,
) *TaskService {
	return &TaskService{
		workspaceStore: workspaceStore,
		taskStore:      taskStore,
	}
}

/*
ListMyTasks returns tasks assigned to the current user.
*/
func (s *TaskService) ListMyTasks(
	ctx context.Context,
	input ListMyTasksInput,
) ([]domain.Task, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view tasks.")
	}

	workspaceID, err := s.requireWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	tasks, err := s.taskStore.ListTasksByWorkspaceIDAndUserID(
		ctx,
		workspaceID,
		cleanActorUserID,
		input.IncludeArchived,
	)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load tasks.")
	}

	return tasks, nil
}

/*
CreateTask creates a manually tracked task for the current user.
*/
func (s *TaskService) CreateTask(
	ctx context.Context,
	input CreateTaskInput,
) (*domain.Task, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to create tasks.")
	}

	workspaceID, err := s.requireWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	title := strings.TrimSpace(input.Title)
	if title == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Task title is required.")
	}

	if err := s.requireUniqueTaskTitle(ctx, workspaceID, cleanActorUserID, title, ""); err != nil {
		return nil, err
	}

	now := time.Now().UTC()
	task := domain.Task{
		ID:          domain.ID(uuid.NewString()),
		WorkspaceID: workspaceID,
		UserID:      cleanActorUserID,

		SourceSubmissionID: "",
		SourceAnswerID:     "",

		Title:       title,
		Description: strings.TrimSpace(input.Description),

		ProjectID:  domain.ID(strings.TrimSpace(input.ProjectID)),
		CategoryID: domain.ID(strings.TrimSpace(input.CategoryID)),

		Status:   domain.TaskStatusActive,
		BoardURL: strings.TrimSpace(input.BoardURL),

		CreatedBy:   cleanActorUserID,
		CreatedAt:   now,
		UpdatedAt:   now,
		CompletedAt: nil,
	}

	created, err := s.taskStore.CreateTask(ctx, store.CreateTaskParams{
		Task: task,
	})
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not create task.")
	}

	return created, nil
}

/*
UpdateTask updates a task assigned to the current user.
*/
func (s *TaskService) UpdateTask(
	ctx context.Context,
	input UpdateTaskInput,
) (*domain.Task, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to update tasks.")
	}

	workspaceID, err := s.requireWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	taskID := domain.ID(strings.TrimSpace(input.TaskID))
	if taskID.String() == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Task ID is required.")
	}

	existingTask, err := s.taskStore.GetTaskByID(ctx, workspaceID, taskID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Task was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load task.")
	}

	if existingTask.UserID != cleanActorUserID {
		return nil, NewError(ErrorCodePermissionDenied, "Only the assigned user can update this task.")
	}

	title := strings.TrimSpace(input.Title)
	if title == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Task title is required.")
	}

	if err := s.requireUniqueTaskTitle(ctx, workspaceID, cleanActorUserID, title, existingTask.ID); err != nil {
		return nil, err
	}

	status := domain.TaskStatus(strings.TrimSpace(input.Status))
	if !status.IsValid() {
		return nil, NewError(ErrorCodeValidationFailed, "Task status is not supported.")
	}

	now := time.Now().UTC()
	completedAt := existingTask.CompletedAt
	if status == domain.TaskStatusCompleted && completedAt == nil {
		completedAt = &now
	}
	if status != domain.TaskStatusCompleted {
		completedAt = nil
	}

	updatedTask := *existingTask
	updatedTask.Title = title
	updatedTask.Description = strings.TrimSpace(input.Description)
	updatedTask.ProjectID = domain.ID(strings.TrimSpace(input.ProjectID))
	updatedTask.CategoryID = domain.ID(strings.TrimSpace(input.CategoryID))
	updatedTask.Status = status
	updatedTask.BoardURL = strings.TrimSpace(input.BoardURL)
	updatedTask.UpdatedAt = now
	updatedTask.CompletedAt = completedAt

	updated, err := s.taskStore.UpdateTask(ctx, store.UpdateTaskParams{
		Task: updatedTask,
	})
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Task was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not update task.")
	}

	return updated, nil
}

/*
requireUniqueTaskTitle prevents duplicate task names for one user in a workspace.

The database still stores the original title text, but comparisons are
case-insensitive and whitespace-normalized so standup-created work rows can
reuse existing tasks instead of multiplying near-identical task records.
*/
func (s *TaskService) requireUniqueTaskTitle(
	ctx context.Context,
	workspaceID domain.ID,
	userID string,
	title string,
	allowedTaskID domain.ID,
) error {
	tasks, err := s.taskStore.ListTasksByWorkspaceIDAndUserID(ctx, workspaceID, userID, true)
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not verify task title uniqueness.")
	}

	titleKey := normalizedUserTaskTitleKey(title)
	for _, task := range tasks {
		if task.ID == allowedTaskID {
			continue
		}

		if normalizedUserTaskTitleKey(task.Title) == titleKey {
			return NewError(ErrorCodeConflict, "You already have a Campfire task with this title in this workspace.")
		}
	}

	return nil
}

/*
normalizedUserTaskTitleKey returns the canonical comparison key for user task titles.
*/
func normalizedUserTaskTitleKey(value string) string {
	return strings.ToLower(strings.Join(strings.Fields(value), " "))
}

/*
ListMyTimeEntries returns current-user time entries for an inclusive date range.
*/
func (s *TaskService) ListMyTimeEntries(
	ctx context.Context,
	input ListMyTimeEntriesInput,
) ([]domain.TimeEntry, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view time entries.")
	}

	workspaceID, err := s.requireWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	startDate := domain.LocalDate(strings.TrimSpace(input.StartDate))
	if _, err := parseLocalDate(startDate); err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Start date must be a real YYYY-MM-DD calendar date.")
	}

	endDate := domain.LocalDate(strings.TrimSpace(input.EndDate))
	if _, err := parseLocalDate(endDate); err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "End date must be a real YYYY-MM-DD calendar date.")
	}

	if endDate.String() < startDate.String() {
		return nil, NewError(ErrorCodeValidationFailed, "End date cannot be before start date.")
	}

	entries, err := s.taskStore.ListTimeEntriesByWorkspaceIDAndUserID(
		ctx,
		workspaceID,
		cleanActorUserID,
		startDate,
		endDate,
	)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load time entries.")
	}

	return entries, nil
}

/*
CreateTimeEntry records time against an existing workspace task.

The entry date is independent from the task creation date, which lets users add
time to any task for any date.
*/
func (s *TaskService) CreateTimeEntry(
	ctx context.Context,
	input CreateTimeEntryInput,
) (*domain.TimeEntry, error) {
	cleanActorUserID := strings.TrimSpace(input.ActorUserID)
	if cleanActorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to create time entries.")
	}

	workspaceID, err := s.requireWorkspace(ctx, input.WorkspaceID)
	if err != nil {
		return nil, err
	}

	taskID := domain.ID(strings.TrimSpace(input.TaskID))
	if taskID.String() == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Task ID is required.")
	}

	task, err := s.taskStore.GetTaskByID(ctx, workspaceID, taskID)
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Task was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load task.")
	}

	entryDate := domain.LocalDate(strings.TrimSpace(input.EntryDate))
	if _, err := parseLocalDate(entryDate); err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Entry date must be a real YYYY-MM-DD calendar date.")
	}

	if input.Minutes <= 0 {
		return nil, NewError(ErrorCodeValidationFailed, "Time entry minutes must be greater than zero.")
	}

	if input.Minutes > 1440 {
		return nil, NewError(ErrorCodeValidationFailed, "Time entry minutes cannot exceed 1440.")
	}

	projectID := domain.ID(strings.TrimSpace(input.ProjectID))
	if projectID.String() == "" {
		projectID = task.ProjectID
	}

	categoryID := domain.ID(strings.TrimSpace(input.CategoryID))
	if categoryID.String() == "" {
		categoryID = task.CategoryID
	}

	now := time.Now().UTC()
	entry := domain.TimeEntry{
		ID:          domain.ID(uuid.NewString()),
		WorkspaceID: workspaceID,

		TaskID: task.ID,
		UserID: cleanActorUserID,

		EntryDate: entryDate,
		Minutes:   input.Minutes,
		Note:      strings.TrimSpace(input.Note),

		ProjectID:  projectID,
		CategoryID: categoryID,

		CreatedBy: cleanActorUserID,
		CreatedAt: now,
		UpdatedAt: now,
	}

	created, err := s.taskStore.CreateTimeEntry(ctx, store.CreateTimeEntryParams{
		TimeEntry: entry,
	})
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not create time entry.")
	}

	return created, nil
}

/*
requireWorkspace validates that a workspace exists and returns its ID.
*/
func (s *TaskService) requireWorkspace(ctx context.Context, workspaceID string) (domain.ID, error) {
	cleanWorkspaceID := strings.TrimSpace(workspaceID)
	if cleanWorkspaceID == "" {
		return "", NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	id := domain.ID(cleanWorkspaceID)
	if _, err := s.workspaceStore.GetByID(ctx, id); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return "", NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return "", NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	return id, nil
}

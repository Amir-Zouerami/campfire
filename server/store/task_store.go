package store

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/jmoiron/sqlx"
)

/*
CreateTaskParams contains data needed to create a task.
*/
type CreateTaskParams struct {
	Task domain.Task
}

/*
UpdateTaskParams contains mutable task fields.
*/
type UpdateTaskParams struct {
	Task domain.Task
}

/*
CreateTimeEntryParams contains data needed to create a time entry.
*/
type CreateTimeEntryParams struct {
	TimeEntry domain.TimeEntry
}

/*
TaskStore defines task and time-entry persistence operations.
*/
type TaskStore interface {
	GetTaskByID(ctx context.Context, workspaceID domain.ID, taskID domain.ID) (*domain.Task, error)
	ListTasksByWorkspaceIDAndUserID(
		ctx context.Context,
		workspaceID domain.ID,
		userID string,
		includeArchived bool,
	) ([]domain.Task, error)
	CreateTask(ctx context.Context, params CreateTaskParams) (*domain.Task, error)
	UpdateTask(ctx context.Context, params UpdateTaskParams) (*domain.Task, error)

	ListTimeEntriesByWorkspaceIDAndUserID(
		ctx context.Context,
		workspaceID domain.ID,
		userID string,
		startDate domain.LocalDate,
		endDate domain.LocalDate,
	) ([]domain.TimeEntry, error)
	ListTimeEntriesByWorkspaceIDBetween(
		ctx context.Context,
		workspaceID domain.ID,
		startDate domain.LocalDate,
		endDate domain.LocalDate,
	) ([]domain.TimeEntry, error)
	CreateTimeEntry(ctx context.Context, params CreateTimeEntryParams) (*domain.TimeEntry, error)
}

/*
SQLTaskStore persists tasks and time entries in SQL.
*/
type SQLTaskStore struct {
	db *sqlx.DB
}

/*
NewSQLTaskStore creates a SQL-backed task store.
*/
func NewSQLTaskStore(database *Database) *SQLTaskStore {
	return &SQLTaskStore{
		db: database.DB,
	}
}

/*
GetTaskByID returns one task by workspace and ID.
*/
func (s *SQLTaskStore) GetTaskByID(
	ctx context.Context,
	workspaceID domain.ID,
	taskID domain.ID,
) (*domain.Task, error) {
	var record taskRecord

	err := s.db.GetContext(
		ctx,
		&record,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				user_id,
				source_submission_id,
				source_answer_id,
				title,
				description,
				project_id,
				category_id,
				status,
				board_url,
				created_by,
				created_at,
				updated_at,
				completed_at
			FROM campfire_tasks
			WHERE workspace_id = ? AND id = ?
			LIMIT 1
		`),
		workspaceID.String(),
		taskID.String(),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get task by id: %w", err)
	}

	task := record.toDomain()

	return &task, nil
}

/*
ListTasksByWorkspaceIDAndUserID returns tasks assigned to one user.
*/
func (s *SQLTaskStore) ListTasksByWorkspaceIDAndUserID(
	ctx context.Context,
	workspaceID domain.ID,
	userID string,
	includeArchived bool,
) ([]domain.Task, error) {
	records := []taskRecord{}

	statusClause := ""
	args := []interface{}{workspaceID.String(), userID}
	if !includeArchived {
		statusClause = "AND status <> ?"
		args = append(args, string(domain.TaskStatusArchived))
	}

	query := s.db.Rebind(fmt.Sprintf(`
		SELECT
			id,
			workspace_id,
			user_id,
			source_submission_id,
			source_answer_id,
			title,
			description,
			project_id,
			category_id,
			status,
			board_url,
			created_by,
			created_at,
			updated_at,
			completed_at
		FROM campfire_tasks
		WHERE workspace_id = ?
			AND user_id = ?
			%s
		ORDER BY updated_at DESC, created_at DESC
	`, statusClause))

	err := s.db.SelectContext(ctx, &records, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list tasks by workspace and user: %w", err)
	}

	tasks := make([]domain.Task, 0, len(records))
	for _, record := range records {
		tasks = append(tasks, record.toDomain())
	}

	return tasks, nil
}

/*
CreateTask inserts a task.
*/
func (s *SQLTaskStore) CreateTask(ctx context.Context, params CreateTaskParams) (*domain.Task, error) {
	task := params.Task

	_, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_tasks (
				id,
				workspace_id,
				user_id,
				source_submission_id,
				source_answer_id,
				title,
				description,
				project_id,
				category_id,
				status,
				board_url,
				created_by,
				created_at,
				updated_at,
				completed_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		task.ID.String(),
		task.WorkspaceID.String(),
		task.UserID,
		task.SourceSubmissionID.String(),
		task.SourceAnswerID.String(),
		task.Title,
		task.Description,
		task.ProjectID.String(),
		task.CategoryID.String(),
		string(task.Status),
		task.BoardURL,
		task.CreatedBy,
		task.CreatedAt,
		task.UpdatedAt,
		task.CompletedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert task: %w", err)
	}

	created, err := s.GetTaskByID(ctx, task.WorkspaceID, task.ID)
	if err != nil {
		return nil, err
	}

	return created, nil
}

/*
UpdateTask updates mutable task fields.
*/
func (s *SQLTaskStore) UpdateTask(ctx context.Context, params UpdateTaskParams) (*domain.Task, error) {
	task := params.Task

	result, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			UPDATE campfire_tasks
			SET
				title = ?,
				description = ?,
				project_id = ?,
				category_id = ?,
				status = ?,
				board_url = ?,
				updated_at = ?,
				completed_at = ?
			WHERE workspace_id = ? AND id = ?
		`),
		task.Title,
		task.Description,
		task.ProjectID.String(),
		task.CategoryID.String(),
		string(task.Status),
		task.BoardURL,
		task.UpdatedAt,
		task.CompletedAt,
		task.WorkspaceID.String(),
		task.ID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("update task: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("read task update result: %w", err)
	}

	if rowsAffected == 0 {
		return nil, ErrNotFound
	}

	updated, err := s.GetTaskByID(ctx, task.WorkspaceID, task.ID)
	if err != nil {
		return nil, err
	}

	return updated, nil
}

/*
ListTimeEntriesByWorkspaceIDAndUserID returns time entries for a user and date range.
*/
func (s *SQLTaskStore) ListTimeEntriesByWorkspaceIDAndUserID(
	ctx context.Context,
	workspaceID domain.ID,
	userID string,
	startDate domain.LocalDate,
	endDate domain.LocalDate,
) ([]domain.TimeEntry, error) {
	records := []timeEntryRecord{}

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				task_id,
				user_id,
				entry_date,
				minutes,
				note,
				project_id,
				category_id,
				created_by,
				created_at,
				updated_at
			FROM campfire_time_entries
			WHERE workspace_id = ?
				AND user_id = ?
				AND entry_date >= ?
				AND entry_date <= ?
			ORDER BY entry_date DESC, created_at DESC
		`),
		workspaceID.String(),
		userID,
		startDate.String(),
		endDate.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("list time entries by workspace and user: %w", err)
	}

	entries := make([]domain.TimeEntry, 0, len(records))
	for _, record := range records {
		entries = append(entries, record.toDomain())
	}

	return entries, nil
}

/*
ListTimeEntriesByWorkspaceIDBetween returns all workspace time entries in a date range.
*/
func (s *SQLTaskStore) ListTimeEntriesByWorkspaceIDBetween(
	ctx context.Context,
	workspaceID domain.ID,
	startDate domain.LocalDate,
	endDate domain.LocalDate,
) ([]domain.TimeEntry, error) {
	records := []timeEntryRecord{}

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				task_id,
				user_id,
				entry_date,
				minutes,
				note,
				project_id,
				category_id,
				created_by,
				created_at,
				updated_at
			FROM campfire_time_entries
			WHERE workspace_id = ?
				AND entry_date >= ?
				AND entry_date <= ?
			ORDER BY entry_date ASC, user_id ASC, created_at ASC
		`),
		workspaceID.String(),
		startDate.String(),
		endDate.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("list workspace time entries between dates: %w", err)
	}

	entries := make([]domain.TimeEntry, 0, len(records))
	for _, record := range records {
		entries = append(entries, record.toDomain())
	}

	return entries, nil
}

/*
CreateTimeEntry inserts a time entry.
*/
func (s *SQLTaskStore) CreateTimeEntry(
	ctx context.Context,
	params CreateTimeEntryParams,
) (*domain.TimeEntry, error) {
	entry := params.TimeEntry

	_, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_time_entries (
				id,
				workspace_id,
				task_id,
				user_id,
				entry_date,
				minutes,
				note,
				project_id,
				category_id,
				created_by,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		entry.ID.String(),
		entry.WorkspaceID.String(),
		entry.TaskID.String(),
		entry.UserID,
		entry.EntryDate.String(),
		entry.Minutes,
		entry.Note,
		entry.ProjectID.String(),
		entry.CategoryID.String(),
		entry.CreatedBy,
		entry.CreatedAt,
		entry.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert time entry: %w", err)
	}

	created, err := s.getTimeEntryByID(ctx, entry.WorkspaceID, entry.ID)
	if err != nil {
		return nil, err
	}

	return created, nil
}

/*
getTimeEntryByID returns one time entry by workspace and ID.
*/
func (s *SQLTaskStore) getTimeEntryByID(
	ctx context.Context,
	workspaceID domain.ID,
	timeEntryID domain.ID,
) (*domain.TimeEntry, error) {
	var record timeEntryRecord

	err := s.db.GetContext(
		ctx,
		&record,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				task_id,
				user_id,
				entry_date,
				minutes,
				note,
				project_id,
				category_id,
				created_by,
				created_at,
				updated_at
			FROM campfire_time_entries
			WHERE workspace_id = ? AND id = ?
			LIMIT 1
		`),
		workspaceID.String(),
		timeEntryID.String(),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get time entry by id: %w", err)
	}

	entry := record.toDomain()

	return &entry, nil
}

/*
taskRecord represents one row from campfire_tasks.
*/
type taskRecord struct {
	ID                 string       `db:"id"`
	WorkspaceID        string       `db:"workspace_id"`
	UserID             string       `db:"user_id"`
	SourceSubmissionID string       `db:"source_submission_id"`
	SourceAnswerID     string       `db:"source_answer_id"`
	Title              string       `db:"title"`
	Description        string       `db:"description"`
	ProjectID          string       `db:"project_id"`
	CategoryID         string       `db:"category_id"`
	Status             string       `db:"status"`
	BoardURL           string       `db:"board_url"`
	CreatedBy          string       `db:"created_by"`
	CreatedAt          time.Time    `db:"created_at"`
	UpdatedAt          time.Time    `db:"updated_at"`
	CompletedAt        sql.NullTime `db:"completed_at"`
}

/*
toDomain maps a task record to the domain model.
*/
func (r taskRecord) toDomain() domain.Task {
	var completedAt *time.Time
	if r.CompletedAt.Valid {
		value := parseStoredTime(r.CompletedAt.Time)
		completedAt = &value
	}

	return domain.Task{
		ID:                 domain.ID(r.ID),
		WorkspaceID:        domain.ID(r.WorkspaceID),
		UserID:             r.UserID,
		SourceSubmissionID: domain.ID(r.SourceSubmissionID),
		SourceAnswerID:     domain.ID(r.SourceAnswerID),
		Title:              r.Title,
		Description:        r.Description,
		ProjectID:          domain.ID(r.ProjectID),
		CategoryID:         domain.ID(r.CategoryID),
		Status:             domain.TaskStatus(r.Status),
		BoardURL:           r.BoardURL,
		CreatedBy:          r.CreatedBy,
		CreatedAt:          parseStoredTime(r.CreatedAt),
		UpdatedAt:          parseStoredTime(r.UpdatedAt),
		CompletedAt:        completedAt,
	}
}

/*
timeEntryRecord represents one row from campfire_time_entries.
*/
type timeEntryRecord struct {
	ID          string    `db:"id"`
	WorkspaceID string    `db:"workspace_id"`
	TaskID      string    `db:"task_id"`
	UserID      string    `db:"user_id"`
	EntryDate   string    `db:"entry_date"`
	Minutes     int       `db:"minutes"`
	Note        string    `db:"note"`
	ProjectID   string    `db:"project_id"`
	CategoryID  string    `db:"category_id"`
	CreatedBy   string    `db:"created_by"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
}

/*
toDomain maps a time entry record to the domain model.
*/
func (r timeEntryRecord) toDomain() domain.TimeEntry {
	return domain.TimeEntry{
		ID:          domain.ID(r.ID),
		WorkspaceID: domain.ID(r.WorkspaceID),
		TaskID:      domain.ID(r.TaskID),
		UserID:      r.UserID,
		EntryDate:   domain.LocalDate(r.EntryDate),
		Minutes:     r.Minutes,
		Note:        r.Note,
		ProjectID:   domain.ID(r.ProjectID),
		CategoryID:  domain.ID(r.CategoryID),
		CreatedBy:   r.CreatedBy,
		CreatedAt:   parseStoredTime(r.CreatedAt),
		UpdatedAt:   parseStoredTime(r.UpdatedAt),
	}
}

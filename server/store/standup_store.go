package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/jmoiron/sqlx"
)

/*
UpsertStandupSubmissionParams contains a standup submission and its answers.
*/
type UpsertStandupSubmissionParams struct {
	Submission domain.StandupSubmission
	Answers    []domain.StandupAnswer
}

/*
UpsertStandupSubmissionResult contains the stored standup submission and answers.
*/
type UpsertStandupSubmissionResult struct {
	Submission domain.StandupSubmission
	Answers    []domain.StandupAnswer
}

/*
StandupStore defines persistence operations for standup configuration and submissions.
*/
type StandupStore interface {
	ListTemplatesByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.StandupTemplate, error)
	ListQuestionsByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.StandupQuestion, error)
	ListSchedulesByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.StandupSchedule, error)
	UpsertSubmission(ctx context.Context, params UpsertStandupSubmissionParams) (*UpsertStandupSubmissionResult, error)
}

/*
SQLStandupStore reads and writes standup data in SQL.
*/
type SQLStandupStore struct {
	db *sqlx.DB
}

/*
NewSQLStandupStore creates a SQL-backed standup store.
*/
func NewSQLStandupStore(database *Database) *SQLStandupStore {
	return &SQLStandupStore{
		db: database.DB,
	}
}

/*
ListTemplatesByWorkspaceID returns active standup templates for a workspace.
*/
func (s *SQLStandupStore) ListTemplatesByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
) ([]domain.StandupTemplate, error) {
	records := []standupTemplateRecord{}

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				name,
				description,
				kind,
				FALSE AS is_default,
				is_active,
				created_by,
				created_at,
				updated_at
			FROM campfire_standup_templates
			WHERE workspace_id = ? AND is_active = TRUE
			ORDER BY kind ASC, name ASC
		`),
		workspaceID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("list standup templates: %w", err)
	}

	templates := make([]domain.StandupTemplate, 0, len(records))
	for _, record := range records {
		templates = append(templates, record.toDomain())
	}

	return templates, nil
}

/*
ListQuestionsByWorkspaceID returns questions for active templates in a workspace.
*/
func (s *SQLStandupStore) ListQuestionsByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
) ([]domain.StandupQuestion, error) {
	records := []standupQuestionRecord{}

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(`
			SELECT
				questions.id,
				questions.workspace_id,
				questions.template_id,
				questions.section,
				questions.label,
				questions.help_text,
				questions.placeholder,
				questions.type AS question_type,
				questions.required,
				questions.show_in_report,
				questions.is_private,
				questions.position,
				questions.options_json,
				questions.created_at,
				questions.updated_at
			FROM campfire_standup_questions questions
			INNER JOIN campfire_standup_templates templates
				ON templates.id = questions.template_id
			WHERE questions.workspace_id = ?
				AND templates.is_active = TRUE
			ORDER BY questions.template_id ASC, questions.position ASC, questions.created_at ASC
		`),
		workspaceID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("list standup questions: %w", err)
	}

	questions := make([]domain.StandupQuestion, 0, len(records))
	for _, record := range records {
		question, err := record.toDomain()
		if err != nil {
			return nil, err
		}

		questions = append(questions, *question)
	}

	return questions, nil
}

/*
ListSchedulesByWorkspaceID returns standup schedules for a workspace.
*/
func (s *SQLStandupStore) ListSchedulesByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
) ([]domain.StandupSchedule, error) {
	records := []standupScheduleRecord{}

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				template_id,
				kind,
				enabled,
				time_of_day,
				skip_non_working_days,
				weekly_mode,
				skip_daily_when_weekly_runs,
				created_by,
				created_at,
				updated_at
			FROM campfire_standup_schedules
			WHERE workspace_id = ?
			ORDER BY kind ASC, time_of_day ASC, created_at ASC
		`),
		workspaceID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("list standup schedules: %w", err)
	}

	schedules := make([]domain.StandupSchedule, 0, len(records))
	for _, record := range records {
		schedules = append(schedules, record.toDomain())
	}

	return schedules, nil
}

/*
UpsertSubmission creates or updates a user's standup submission for one occurrence.
*/
func (s *SQLStandupStore) UpsertSubmission(
	ctx context.Context,
	params UpsertStandupSubmissionParams,
) (*UpsertStandupSubmissionResult, error) {
	transaction, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin standup submission transaction: %w", err)
	}

	committed := false

	defer func() {
		if !committed {
			rollbackErr := transaction.Rollback()
			if rollbackErr != nil && !errors.Is(rollbackErr, sql.ErrTxDone) {
				return
			}
		}
	}()

	submission := params.Submission

	existingSubmission, err := findExistingSubmission(
		ctx,
		transaction,
		s.db,
		submission.WorkspaceID,
		submission.TemplateID,
		submission.UserID,
		submission.OccurrenceDate,
	)
	if err != nil {
		return nil, err
	}

	if existingSubmission != nil {
		submission.ID = existingSubmission.ID
		submission.FirstSubmittedAt = existingSubmission.FirstSubmittedAt
		submission.CreatedAt = existingSubmission.CreatedAt

		if err := updateStandupSubmission(ctx, transaction, s.db, submission); err != nil {
			return nil, err
		}

		if err := deleteStandupAnswers(ctx, transaction, s.db, submission.ID); err != nil {
			return nil, err
		}
	} else {
		if err := insertStandupSubmission(ctx, transaction, s.db, submission); err != nil {
			return nil, err
		}
	}

	answers := make([]domain.StandupAnswer, 0, len(params.Answers))
	for _, answer := range params.Answers {
		answer.SubmissionID = submission.ID
		if err := insertStandupAnswer(ctx, transaction, s.db, answer); err != nil {
			return nil, err
		}

		answers = append(answers, answer)
	}

	if err := transaction.Commit(); err != nil {
		return nil, fmt.Errorf("commit standup submission transaction: %w", err)
	}

	committed = true

	return &UpsertStandupSubmissionResult{
		Submission: submission,
		Answers:    answers,
	}, nil
}

/*
findExistingSubmission returns an existing submission for the unique occurrence key.
*/
func findExistingSubmission(
	ctx context.Context,
	tx *sqlx.Tx,
	db *sqlx.DB,
	workspaceID domain.ID,
	templateID domain.ID,
	userID string,
	occurrenceDate domain.LocalDate,
) (*domain.StandupSubmission, error) {
	var record standupSubmissionRecord

	err := tx.GetContext(
		ctx,
		&record,
		db.Rebind(`
			SELECT
				id,
				workspace_id,
				template_id,
				schedule_id,
				user_id,
				occurrence_date,
				first_submitted_at,
				last_updated_at,
				status,
				created_at,
				updated_at
			FROM campfire_standup_submissions
			WHERE workspace_id = ?
				AND template_id = ?
				AND user_id = ?
				AND occurrence_date = ?
			LIMIT 1
		`),
		workspaceID.String(),
		templateID.String(),
		userID,
		occurrenceDate.String(),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}

		return nil, fmt.Errorf("find existing standup submission: %w", err)
	}

	submission := record.toDomain()

	return &submission, nil
}

/*
insertStandupSubmission inserts a new standup submission.
*/
func insertStandupSubmission(
	ctx context.Context,
	tx *sqlx.Tx,
	db *sqlx.DB,
	submission domain.StandupSubmission,
) error {
	_, err := tx.ExecContext(
		ctx,
		db.Rebind(`
			INSERT INTO campfire_standup_submissions (
				id,
				workspace_id,
				template_id,
				schedule_id,
				user_id,
				occurrence_date,
				first_submitted_at,
				last_updated_at,
				status,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		submission.ID.String(),
		submission.WorkspaceID.String(),
		submission.TemplateID.String(),
		submission.ScheduleID.String(),
		submission.UserID,
		submission.OccurrenceDate.String(),
		submission.FirstSubmittedAt,
		submission.LastUpdatedAt,
		string(submission.Status),
		submission.CreatedAt,
		submission.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert standup submission: %w", err)
	}

	return nil
}

/*
updateStandupSubmission updates an existing standup submission.
*/
func updateStandupSubmission(
	ctx context.Context,
	tx *sqlx.Tx,
	db *sqlx.DB,
	submission domain.StandupSubmission,
) error {
	_, err := tx.ExecContext(
		ctx,
		db.Rebind(`
			UPDATE campfire_standup_submissions
			SET
				schedule_id = ?,
				last_updated_at = ?,
				status = ?,
				updated_at = ?
			WHERE id = ?
		`),
		submission.ScheduleID.String(),
		submission.LastUpdatedAt,
		string(submission.Status),
		submission.UpdatedAt,
		submission.ID.String(),
	)
	if err != nil {
		return fmt.Errorf("update standup submission: %w", err)
	}

	return nil
}

/*
deleteStandupAnswers deletes answers before replacing an existing submission.
*/
func deleteStandupAnswers(
	ctx context.Context,
	tx *sqlx.Tx,
	db *sqlx.DB,
	submissionID domain.ID,
) error {
	_, err := tx.ExecContext(
		ctx,
		db.Rebind(`
			DELETE FROM campfire_standup_answers
			WHERE submission_id = ?
		`),
		submissionID.String(),
	)
	if err != nil {
		return fmt.Errorf("delete standup answers: %w", err)
	}

	return nil
}

/*
insertStandupAnswer inserts one standup answer.
*/
func insertStandupAnswer(
	ctx context.Context,
	tx *sqlx.Tx,
	db *sqlx.DB,
	answer domain.StandupAnswer,
) error {
	_, err := tx.ExecContext(
		ctx,
		db.Rebind(`
			INSERT INTO campfire_standup_answers (
				id,
				submission_id,
				workspace_id,
				question_id,
				value_json,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?)
		`),
		answer.ID.String(),
		answer.SubmissionID.String(),
		answer.WorkspaceID.String(),
		answer.QuestionID.String(),
		answer.ValueJSON,
		answer.CreatedAt,
		answer.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert standup answer: %w", err)
	}

	return nil
}

/*
standupTemplateRecord represents a row from campfire_standup_templates.
*/
type standupTemplateRecord struct {
	ID          string    `db:"id"`
	WorkspaceID string    `db:"workspace_id"`
	Name        string    `db:"name"`
	Description string    `db:"description"`
	Kind        string    `db:"kind"`
	IsDefault   bool      `db:"is_default"`
	IsActive    bool      `db:"is_active"`
	CreatedBy   string    `db:"created_by"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
}

/*
toDomain maps a standup template record to the domain model.
*/
func (r standupTemplateRecord) toDomain() domain.StandupTemplate {
	return domain.StandupTemplate{
		ID:          domain.ID(r.ID),
		WorkspaceID: domain.ID(r.WorkspaceID),
		Name:        r.Name,
		Description: r.Description,
		Kind:        domain.StandupKind(r.Kind),
		IsDefault:   r.IsDefault,
		IsActive:    r.IsActive,
		CreatedBy:   r.CreatedBy,
		CreatedAt:   parseStoredTime(r.CreatedAt),
		UpdatedAt:   parseStoredTime(r.UpdatedAt),
	}
}

/*
standupQuestionRecord represents a row from campfire_standup_questions.
*/
type standupQuestionRecord struct {
	ID           string    `db:"id"`
	WorkspaceID  string    `db:"workspace_id"`
	TemplateID   string    `db:"template_id"`
	Section      string    `db:"section"`
	Label        string    `db:"label"`
	HelpText     string    `db:"help_text"`
	Placeholder  string    `db:"placeholder"`
	QuestionType string    `db:"question_type"`
	Required     bool      `db:"required"`
	ShowInReport bool      `db:"show_in_report"`
	IsPrivate    bool      `db:"is_private"`
	Position     int       `db:"position"`
	OptionsJSON  string    `db:"options_json"`
	CreatedAt    time.Time `db:"created_at"`
	UpdatedAt    time.Time `db:"updated_at"`
}

/*
toDomain maps a standup question record to the domain model.
*/
func (r standupQuestionRecord) toDomain() (*domain.StandupQuestion, error) {
	options, err := parseQuestionOptions(r.OptionsJSON)
	if err != nil {
		return nil, fmt.Errorf("parse question options for %s: %w", r.ID, err)
	}

	return &domain.StandupQuestion{
		ID:           domain.ID(r.ID),
		WorkspaceID:  domain.ID(r.WorkspaceID),
		TemplateID:   domain.ID(r.TemplateID),
		Section:      r.Section,
		QuestionKey:  r.ID,
		Label:        r.Label,
		Prompt:       r.Label,
		HelpText:     r.HelpText,
		Placeholder:  r.Placeholder,
		Type:         domain.QuestionType(r.QuestionType),
		Required:     r.Required,
		ShowInReport: r.ShowInReport,
		IsPrivate:    r.IsPrivate,
		Position:     r.Position,
		SortOrder:    r.Position,
		OptionsJSON:  r.OptionsJSON,
		Options:      options,
		CreatedAt:    parseStoredTime(r.CreatedAt),
		UpdatedAt:    parseStoredTime(r.UpdatedAt),
	}, nil
}

/*
parseQuestionOptions parses a question option JSON array.
*/
func parseQuestionOptions(value string) ([]string, error) {
	if value == "" {
		return []string{}, nil
	}

	options := []string{}
	if err := json.Unmarshal([]byte(value), &options); err != nil {
		return nil, err
	}

	return options, nil
}

/*
standupScheduleRecord represents a row from campfire_standup_schedules.
*/
type standupScheduleRecord struct {
	ID                      string    `db:"id"`
	WorkspaceID             string    `db:"workspace_id"`
	TemplateID              string    `db:"template_id"`
	Kind                    string    `db:"kind"`
	Enabled                 bool      `db:"enabled"`
	TimeOfDay               string    `db:"time_of_day"`
	SkipNonWorkingDays      bool      `db:"skip_non_working_days"`
	WeeklyMode              string    `db:"weekly_mode"`
	SkipDailyWhenWeeklyRuns bool      `db:"skip_daily_when_weekly_runs"`
	CreatedBy               string    `db:"created_by"`
	CreatedAt               time.Time `db:"created_at"`
	UpdatedAt               time.Time `db:"updated_at"`
}

/*
toDomain maps a standup schedule record to the domain model.
*/
func (r standupScheduleRecord) toDomain() domain.StandupSchedule {
	return domain.StandupSchedule{
		ID:                      domain.ID(r.ID),
		WorkspaceID:             domain.ID(r.WorkspaceID),
		TemplateID:              domain.ID(r.TemplateID),
		Kind:                    domain.StandupKind(r.Kind),
		Enabled:                 r.Enabled,
		TimeOfDay:               domain.TimeOfDay(r.TimeOfDay),
		SkipNonWorkingDays:      r.SkipNonWorkingDays,
		WeeklyMode:              domain.WeeklyMode(r.WeeklyMode),
		SkipDailyWhenWeeklyRuns: r.SkipDailyWhenWeeklyRuns,
		CreatedBy:               r.CreatedBy,
		CreatedAt:               parseStoredTime(r.CreatedAt),
		UpdatedAt:               parseStoredTime(r.UpdatedAt),
	}
}

/*
standupSubmissionRecord represents a row from campfire_standup_submissions.
*/
type standupSubmissionRecord struct {
	ID               string    `db:"id"`
	WorkspaceID      string    `db:"workspace_id"`
	TemplateID       string    `db:"template_id"`
	ScheduleID       string    `db:"schedule_id"`
	UserID           string    `db:"user_id"`
	OccurrenceDate   string    `db:"occurrence_date"`
	FirstSubmittedAt time.Time `db:"first_submitted_at"`
	LastUpdatedAt    time.Time `db:"last_updated_at"`
	Status           string    `db:"status"`
	CreatedAt        time.Time `db:"created_at"`
	UpdatedAt        time.Time `db:"updated_at"`
}

/*
toDomain maps a standup submission record to the domain model.
*/
func (r standupSubmissionRecord) toDomain() domain.StandupSubmission {
	return domain.StandupSubmission{
		ID:               domain.ID(r.ID),
		WorkspaceID:      domain.ID(r.WorkspaceID),
		TemplateID:       domain.ID(r.TemplateID),
		ScheduleID:       domain.ID(r.ScheduleID),
		UserID:           r.UserID,
		OccurrenceDate:   domain.LocalDate(r.OccurrenceDate),
		FirstSubmittedAt: parseStoredTime(r.FirstSubmittedAt),
		LastUpdatedAt:    parseStoredTime(r.LastUpdatedAt),
		Status:           domain.StandupSubmissionStatus(r.Status),
		CreatedAt:        parseStoredTime(r.CreatedAt),
		UpdatedAt:        parseStoredTime(r.UpdatedAt),
	}
}

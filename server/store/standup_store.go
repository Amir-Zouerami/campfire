package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
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
	ListAllTemplatesByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.StandupTemplate, error)
	ListQuestionsByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.StandupQuestion, error)
	ListAllQuestionsByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.StandupQuestion, error)
	ListSchedulesByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.StandupSchedule, error)
	CreateTemplate(ctx context.Context, template domain.StandupTemplate) (*domain.StandupTemplate, error)
	UpdateTemplate(ctx context.Context, template domain.StandupTemplate) (*domain.StandupTemplate, error)
	DeleteTemplate(ctx context.Context, workspaceID domain.ID, templateID domain.ID) error
	CreateQuestion(ctx context.Context, question domain.StandupQuestion) (*domain.StandupQuestion, error)
	UpdateQuestion(ctx context.Context, question domain.StandupQuestion) (*domain.StandupQuestion, error)
	DeleteQuestion(ctx context.Context, workspaceID domain.ID, questionID domain.ID) error
	CreateSchedule(ctx context.Context, schedule domain.StandupSchedule) (*domain.StandupSchedule, error)
	UpdateSchedule(ctx context.Context, schedule domain.StandupSchedule) (*domain.StandupSchedule, error)
	DeleteSchedule(ctx context.Context, workspaceID domain.ID, scheduleID domain.ID) error
	GetTemplateByID(ctx context.Context, workspaceID domain.ID, templateID domain.ID) (*domain.StandupTemplate, error)
	GetQuestionByID(ctx context.Context, workspaceID domain.ID, questionID domain.ID) (*domain.StandupQuestion, error)
	GetScheduleByID(ctx context.Context, workspaceID domain.ID, scheduleID domain.ID) (*domain.StandupSchedule, error)
	ListSubmissionsWithAnswersByWorkspaceIDAndDate(
		ctx context.Context,
		workspaceID domain.ID,
		occurrenceDate domain.LocalDate,
	) ([]domain.StandupSubmissionWithAnswers, error)
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
GetTemplateByID returns one standup template by workspace and ID.
*/
func (s *SQLStandupStore) GetTemplateByID(
	ctx context.Context,
	workspaceID domain.ID,
	templateID domain.ID,
) (*domain.StandupTemplate, error) {
	var record standupTemplateRecord

	err := s.db.GetContext(
		ctx,
		&record,
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
			WHERE workspace_id = ? AND id = ?
			LIMIT 1
		`),
		workspaceID.String(),
		templateID.String(),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get standup template by id: %w", err)
	}

	template := record.toDomain()

	return &template, nil
}

/*
ListTemplatesByWorkspaceID returns active standup templates for a workspace.
*/
func (s *SQLStandupStore) ListTemplatesByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
) ([]domain.StandupTemplate, error) {
	return s.listTemplatesByWorkspaceID(ctx, workspaceID, false)
}

/*
ListAllTemplatesByWorkspaceID returns active and inactive standup templates for
configuration screens that need to manage dormant templates.
*/
func (s *SQLStandupStore) ListAllTemplatesByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
) ([]domain.StandupTemplate, error) {
	return s.listTemplatesByWorkspaceID(ctx, workspaceID, true)
}

/*
listTemplatesByWorkspaceID returns templates for a workspace.
*/
func (s *SQLStandupStore) listTemplatesByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
	includeInactive bool,
) ([]domain.StandupTemplate, error) {
	records := []standupTemplateRecord{}
	query := `
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
		WHERE workspace_id = ?
	`
	if !includeInactive {
		query += ` AND is_active = TRUE`
	}
	query += ` ORDER BY kind ASC, is_active DESC, name ASC`

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(query),
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
CreateTemplate inserts a standup template.

The insert is transactional because template names must be unique inside a
workspace and activating a daily template must deactivate the previous daily
template in the same workspace.
*/
func (s *SQLStandupStore) CreateTemplate(
	ctx context.Context,
	template domain.StandupTemplate,
) (*domain.StandupTemplate, error) {
	transaction, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin standup template create transaction: %w", err)
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

	if err := s.ensureUniqueTemplateName(ctx, transaction, template.WorkspaceID, template.Name, ""); err != nil {
		return nil, err
	}

	if err := s.deactivateOtherActiveDailyTemplates(ctx, transaction, template.WorkspaceID, template.ID, template.Kind, template.IsActive, template.UpdatedAt); err != nil {
		return nil, err
	}

	_, err = transaction.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_standup_templates (
				id,
				workspace_id,
				name,
				description,
				kind,
				is_active,
				created_by,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		template.ID.String(),
		template.WorkspaceID.String(),
		template.Name,
		template.Description,
		string(template.Kind),
		template.IsActive,
		template.CreatedBy,
		template.CreatedAt,
		template.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert standup template: %w", err)
	}

	if err := transaction.Commit(); err != nil {
		return nil, fmt.Errorf("commit standup template create transaction: %w", err)
	}
	committed = true

	created, err := s.GetTemplateByID(ctx, template.WorkspaceID, template.ID)
	if err != nil {
		return nil, err
	}

	return created, nil
}

/*
UpdateTemplate updates mutable standup template fields.

The update is transactional for the same reason template creation is
transactional: a workspace cannot have duplicate template names, and activating
one daily template must atomically deactivate the previous active daily
template.
*/
func (s *SQLStandupStore) UpdateTemplate(
	ctx context.Context,
	template domain.StandupTemplate,
) (*domain.StandupTemplate, error) {
	transaction, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin standup template update transaction: %w", err)
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

	if err := s.ensureUniqueTemplateName(ctx, transaction, template.WorkspaceID, template.Name, template.ID); err != nil {
		return nil, err
	}

	if err := s.deactivateOtherActiveDailyTemplates(ctx, transaction, template.WorkspaceID, template.ID, template.Kind, template.IsActive, template.UpdatedAt); err != nil {
		return nil, err
	}

	result, err := transaction.ExecContext(
		ctx,
		s.db.Rebind(`
			UPDATE campfire_standup_templates
			SET
				name = ?,
				description = ?,
				kind = ?,
				is_active = ?,
				updated_at = ?
			WHERE workspace_id = ? AND id = ?
		`),
		template.Name,
		template.Description,
		string(template.Kind),
		template.IsActive,
		template.UpdatedAt,
		template.WorkspaceID.String(),
		template.ID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("update standup template: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("read standup template update result: %w", err)
	}

	if rowsAffected == 0 {
		return nil, ErrNotFound
	}

	if err := transaction.Commit(); err != nil {
		return nil, fmt.Errorf("commit standup template update transaction: %w", err)
	}
	committed = true

	updated, err := s.GetTemplateByID(ctx, template.WorkspaceID, template.ID)
	if err != nil {
		return nil, err
	}

	return updated, nil
}

/*
ListQuestionsByWorkspaceID returns questions for active templates in a workspace.
*/
func (s *SQLStandupStore) ListQuestionsByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
) ([]domain.StandupQuestion, error) {
	return s.listQuestionsByWorkspaceID(ctx, workspaceID, false)
}

/*
ListAllQuestionsByWorkspaceID returns questions for active and inactive templates
in a workspace. Settings screens use this to avoid hiding questions when a
template is temporarily inactive.
*/
func (s *SQLStandupStore) ListAllQuestionsByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
) ([]domain.StandupQuestion, error) {
	return s.listQuestionsByWorkspaceID(ctx, workspaceID, true)
}

/*
listQuestionsByWorkspaceID returns standup questions for a workspace.
*/
func (s *SQLStandupStore) listQuestionsByWorkspaceID(
	ctx context.Context,
	workspaceID domain.ID,
	includeInactiveTemplates bool,
) ([]domain.StandupQuestion, error) {
	records := []standupQuestionRecord{}
	query := `
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
			questions.creates_tasks,
			questions.position,
			questions.options_json,
			questions.created_at,
			questions.updated_at
		FROM campfire_standup_questions questions
		INNER JOIN campfire_standup_templates templates
			ON templates.id = questions.template_id
		WHERE questions.workspace_id = ?
	`
	if !includeInactiveTemplates {
		query += ` AND templates.is_active = TRUE`
	}
	query += ` ORDER BY questions.template_id ASC, questions.position ASC, questions.created_at ASC`

	err := s.db.SelectContext(
		ctx,
		&records,
		s.db.Rebind(query),
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
GetQuestionByID returns one standup question by workspace and ID.
*/
func (s *SQLStandupStore) GetQuestionByID(
	ctx context.Context,
	workspaceID domain.ID,
	questionID domain.ID,
) (*domain.StandupQuestion, error) {
	var record standupQuestionRecord

	err := s.db.GetContext(
		ctx,
		&record,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				template_id,
				section,
				label,
				help_text,
				placeholder,
				type AS question_type,
				required,
				show_in_report,
				is_private,
				creates_tasks,
				position,
				options_json,
				created_at,
				updated_at
			FROM campfire_standup_questions
			WHERE workspace_id = ? AND id = ?
			LIMIT 1
		`),
		workspaceID.String(),
		questionID.String(),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get standup question by id: %w", err)
	}

	question, err := record.toDomain()
	if err != nil {
		return nil, err
	}

	return question, nil
}

/*
DeleteTemplate deletes one standup template and all configuration/history rows
that depend on it through database foreign keys.
*/
func (s *SQLStandupStore) DeleteTemplate(
	ctx context.Context,
	workspaceID domain.ID,
	templateID domain.ID,
) error {
	result, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			DELETE FROM campfire_standup_templates
			WHERE workspace_id = ? AND id = ?
		`),
		workspaceID.String(),
		templateID.String(),
	)
	if err != nil {
		return fmt.Errorf("delete standup template: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("read standup template delete result: %w", err)
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

/*
CreateQuestion inserts a standup question.
*/
func (s *SQLStandupStore) CreateQuestion(
	ctx context.Context,
	question domain.StandupQuestion,
) (*domain.StandupQuestion, error) {
	_, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_standup_questions (
				id,
				template_id,
				workspace_id,
				section,
				label,
				help_text,
				placeholder,
				type,
				required,
				show_in_report,
				is_private,
				creates_tasks,
				position,
				options_json,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		question.ID.String(),
		question.TemplateID.String(),
		question.WorkspaceID.String(),
		question.Section,
		question.Label,
		question.HelpText,
		question.Placeholder,
		string(question.Type),
		question.Required,
		question.ShowInReport,
		question.IsPrivate,
		question.CreatesTasks,
		question.Position,
		question.OptionsJSON,
		question.CreatedAt,
		question.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert standup question: %w", err)
	}

	created, err := s.GetQuestionByID(ctx, question.WorkspaceID, question.ID)
	if err != nil {
		return nil, err
	}

	return created, nil
}

/*
UpdateQuestion updates mutable standup question fields.
*/
func (s *SQLStandupStore) UpdateQuestion(
	ctx context.Context,
	question domain.StandupQuestion,
) (*domain.StandupQuestion, error) {
	result, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			UPDATE campfire_standup_questions
			SET
				template_id = ?,
				section = ?,
				label = ?,
				help_text = ?,
				placeholder = ?,
				type = ?,
				required = ?,
				show_in_report = ?,
				is_private = ?,
				creates_tasks = ?,
				position = ?,
				options_json = ?,
				updated_at = ?
			WHERE workspace_id = ? AND id = ?
		`),
		question.TemplateID.String(),
		question.Section,
		question.Label,
		question.HelpText,
		question.Placeholder,
		string(question.Type),
		question.Required,
		question.ShowInReport,
		question.IsPrivate,
		question.CreatesTasks,
		question.Position,
		question.OptionsJSON,
		question.UpdatedAt,
		question.WorkspaceID.String(),
		question.ID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("update standup question: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("read standup question update result: %w", err)
	}

	if rowsAffected == 0 {
		return nil, ErrNotFound
	}

	updated, err := s.GetQuestionByID(ctx, question.WorkspaceID, question.ID)
	if err != nil {
		return nil, err
	}

	return updated, nil
}

/*
DeleteQuestion deletes one standup question and answers that depend on it.
*/
func (s *SQLStandupStore) DeleteQuestion(
	ctx context.Context,
	workspaceID domain.ID,
	questionID domain.ID,
) error {
	result, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			DELETE FROM campfire_standup_questions
			WHERE workspace_id = ? AND id = ?
		`),
		workspaceID.String(),
		questionID.String(),
	)
	if err != nil {
		return fmt.Errorf("delete standup question: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("read standup question delete result: %w", err)
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
}

/*
GetScheduleByID returns one standup schedule by workspace and ID.
*/
func (s *SQLStandupStore) GetScheduleByID(
	ctx context.Context,
	workspaceID domain.ID,
	scheduleID domain.ID,
) (*domain.StandupSchedule, error) {
	var record standupScheduleRecord

	err := s.db.GetContext(
		ctx,
		&record,
		s.db.Rebind(`
			SELECT
				id,
				workspace_id,
				template_id,
				kind,
				enabled,
				opens_at,
				time_of_day,
				skip_non_working_days,
				weekly_mode,
				skip_daily_when_weekly_runs,
				created_by,
				created_at,
				updated_at
			FROM campfire_standup_schedules
			WHERE workspace_id = ? AND id = ?
			LIMIT 1
		`),
		workspaceID.String(),
		scheduleID.String(),
	)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get standup schedule by id: %w", err)
	}

	schedule := record.toDomain()

	return &schedule, nil
}

/*
CreateSchedule inserts a standup schedule.
*/
func (s *SQLStandupStore) CreateSchedule(
	ctx context.Context,
	schedule domain.StandupSchedule,
) (*domain.StandupSchedule, error) {
	_, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_standup_schedules (
				id,
				workspace_id,
				template_id,
				kind,
				enabled,
				opens_at,
				time_of_day,
				skip_non_working_days,
				weekly_mode,
				skip_daily_when_weekly_runs,
				created_by,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		schedule.ID.String(),
		schedule.WorkspaceID.String(),
		schedule.TemplateID.String(),
		string(schedule.Kind),
		schedule.Enabled,
		schedule.OpensAt.String(),
		schedule.TimeOfDay.String(),
		schedule.SkipNonWorkingDays,
		string(schedule.WeeklyMode),
		schedule.SkipDailyWhenWeeklyRuns,
		schedule.CreatedBy,
		schedule.CreatedAt,
		schedule.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("insert standup schedule: %w", err)
	}

	created, err := s.GetScheduleByID(ctx, schedule.WorkspaceID, schedule.ID)
	if err != nil {
		return nil, err
	}

	return created, nil
}

/*
UpdateSchedule updates mutable standup schedule fields.
*/
func (s *SQLStandupStore) UpdateSchedule(
	ctx context.Context,
	schedule domain.StandupSchedule,
) (*domain.StandupSchedule, error) {
	result, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			UPDATE campfire_standup_schedules
			SET
				template_id = ?,
				kind = ?,
				enabled = ?,
				opens_at = ?,
				time_of_day = ?,
				skip_non_working_days = ?,
				weekly_mode = ?,
				skip_daily_when_weekly_runs = ?,
				updated_at = ?
			WHERE workspace_id = ? AND id = ?
		`),
		schedule.TemplateID.String(),
		string(schedule.Kind),
		schedule.Enabled,
		schedule.OpensAt.String(),
		schedule.TimeOfDay.String(),
		schedule.SkipNonWorkingDays,
		string(schedule.WeeklyMode),
		schedule.SkipDailyWhenWeeklyRuns,
		schedule.UpdatedAt,
		schedule.WorkspaceID.String(),
		schedule.ID.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("update standup schedule: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return nil, fmt.Errorf("read standup schedule update result: %w", err)
	}

	if rowsAffected == 0 {
		return nil, ErrNotFound
	}

	updated, err := s.GetScheduleByID(ctx, schedule.WorkspaceID, schedule.ID)
	if err != nil {
		return nil, err
	}

	return updated, nil
}

/*
DeleteSchedule deletes one standup schedule and all reminder/report/submission
rows that depend on it through database foreign keys.
*/
func (s *SQLStandupStore) DeleteSchedule(
	ctx context.Context,
	workspaceID domain.ID,
	scheduleID domain.ID,
) error {
	result, err := s.db.ExecContext(
		ctx,
		s.db.Rebind(`
			DELETE FROM campfire_standup_schedules
			WHERE workspace_id = ? AND id = ?
		`),
		workspaceID.String(),
		scheduleID.String(),
	)
	if err != nil {
		return fmt.Errorf("delete standup schedule: %w", err)
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("read standup schedule delete result: %w", err)
	}

	if rowsAffected == 0 {
		return ErrNotFound
	}

	return nil
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
				opens_at,
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
ListSubmissionsWithAnswersByWorkspaceIDAndDate returns submissions and answers for one occurrence date.
*/
func (s *SQLStandupStore) ListSubmissionsWithAnswersByWorkspaceIDAndDate(
	ctx context.Context,
	workspaceID domain.ID,
	occurrenceDate domain.LocalDate,
) ([]domain.StandupSubmissionWithAnswers, error) {
	submissionRecords := []standupSubmissionRecord{}

	err := s.db.SelectContext(
		ctx,
		&submissionRecords,
		s.db.Rebind(`
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
				AND occurrence_date = ?
			ORDER BY first_submitted_at ASC, user_id ASC
		`),
		workspaceID.String(),
		occurrenceDate.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("list standup submissions: %w", err)
	}

	answerRecords := []standupAnswerRecord{}

	err = s.db.SelectContext(
		ctx,
		&answerRecords,
		s.db.Rebind(`
			SELECT
				answers.id,
				answers.submission_id,
				answers.workspace_id,
				answers.question_id,
				answers.value_json,
				answers.created_at,
				answers.updated_at
			FROM campfire_standup_answers answers
			INNER JOIN campfire_standup_submissions submissions
				ON submissions.id = answers.submission_id
			WHERE submissions.workspace_id = ?
				AND submissions.occurrence_date = ?
			ORDER BY answers.submission_id ASC, answers.created_at ASC
		`),
		workspaceID.String(),
		occurrenceDate.String(),
	)
	if err != nil {
		return nil, fmt.Errorf("list standup answers: %w", err)
	}

	answersBySubmissionID := map[string][]domain.StandupAnswer{}
	for _, record := range answerRecords {
		answer := record.toDomain()
		submissionID := answer.SubmissionID.String()
		answersBySubmissionID[submissionID] = append(answersBySubmissionID[submissionID], answer)
	}

	results := make([]domain.StandupSubmissionWithAnswers, 0, len(submissionRecords))
	for _, record := range submissionRecords {
		submission := record.toDomain()

		results = append(results, domain.StandupSubmissionWithAnswers{
			Submission: submission,
			Answers:    answersBySubmissionID[submission.ID.String()],
		})
	}

	return results, nil
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
		submission.ScheduleID,
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
	scheduleID domain.ID,
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
				AND schedule_id = ?
				AND user_id = ?
				AND occurrence_date = ?
			LIMIT 1
		`),
		workspaceID.String(),
		templateID.String(),
		scheduleID.String(),
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
ensureUniqueTemplateName prevents duplicate template names in one workspace.

The comparison is intentionally case-insensitive and whitespace-normalized so
"Daily Standup" and " daily  standup " are treated as the same PM-facing name.
*/
func (s *SQLStandupStore) ensureUniqueTemplateName(
	ctx context.Context,
	tx *sqlx.Tx,
	workspaceID domain.ID,
	name string,
	excludedTemplateID domain.ID,
) error {
	cleanName := normalizeTemplateNameForLookup(name)
	query := `
		SELECT COUNT(*)
		FROM campfire_standup_templates
		WHERE workspace_id = ?
			AND LOWER(name) = LOWER(?)
	`
	args := []interface{}{workspaceID.String(), cleanName}

	if excludedTemplateID.String() != "" {
		query += ` AND id <> ?`
		args = append(args, excludedTemplateID.String())
	}

	var count int
	if err := tx.GetContext(ctx, &count, s.db.Rebind(query), args...); err != nil {
		return fmt.Errorf("check standup template name uniqueness: %w", err)
	}

	if count > 0 {
		return ErrConflict
	}

	return nil
}

/*
deactivateOtherActiveDailyTemplates enforces the workspace rule that only one
active daily template may exist. Weekly and custom templates are intentionally
not affected.
*/
func (s *SQLStandupStore) deactivateOtherActiveDailyTemplates(
	ctx context.Context,
	tx *sqlx.Tx,
	workspaceID domain.ID,
	templateID domain.ID,
	kind domain.StandupKind,
	isActive bool,
	updatedAt time.Time,
) error {
	if kind != domain.StandupKindDaily || !isActive {
		return nil
	}

	_, err := tx.ExecContext(
		ctx,
		s.db.Rebind(`
			UPDATE campfire_standup_templates
			SET
				is_active = FALSE,
				updated_at = ?
			WHERE workspace_id = ?
				AND kind = ?
				AND is_active = TRUE
				AND id <> ?
		`),
		updatedAt,
		workspaceID.String(),
		string(domain.StandupKindDaily),
		templateID.String(),
	)
	if err != nil {
		return fmt.Errorf("deactivate previous daily standup templates: %w", err)
	}

	return nil
}

/*
normalizeTemplateNameForLookup mirrors service-level cleanup for duplicate
checks without changing the user-facing persisted casing.
*/
func normalizeTemplateNameForLookup(value string) string {
	return strings.Join(strings.Fields(value), " ")
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
	CreatesTasks bool      `db:"creates_tasks"`
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
		CreatesTasks: r.CreatesTasks,
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
	OpensAt                 string    `db:"opens_at"`
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
		OpensAt:                 domain.TimeOfDay(r.OpensAt),
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

/*
standupAnswerRecord represents a row from campfire_standup_answers.
*/
type standupAnswerRecord struct {
	ID           string    `db:"id"`
	SubmissionID string    `db:"submission_id"`
	WorkspaceID  string    `db:"workspace_id"`
	QuestionID   string    `db:"question_id"`
	ValueJSON    string    `db:"value_json"`
	CreatedAt    time.Time `db:"created_at"`
	UpdatedAt    time.Time `db:"updated_at"`
}

/*
toDomain maps a standup answer record to the domain model.
*/
func (r standupAnswerRecord) toDomain() domain.StandupAnswer {
	return domain.StandupAnswer{
		ID:           domain.ID(r.ID),
		SubmissionID: domain.ID(r.SubmissionID),
		WorkspaceID:  domain.ID(r.WorkspaceID),
		QuestionID:   domain.ID(r.QuestionID),
		ValueJSON:    r.ValueJSON,
		CreatedAt:    parseStoredTime(r.CreatedAt),
		UpdatedAt:    parseStoredTime(r.UpdatedAt),
	}
}

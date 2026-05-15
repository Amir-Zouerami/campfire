package store

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/jmoiron/sqlx"
)

/*
StandupStore defines persistence operations for standup configuration.
*/
type StandupStore interface {
	ListTemplatesByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.StandupTemplate, error)
	ListQuestionsByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.StandupQuestion, error)
	ListSchedulesByWorkspaceID(ctx context.Context, workspaceID domain.ID) ([]domain.StandupSchedule, error)
}

/*
SQLStandupStore reads standup configuration from SQL.
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
				is_default,
				is_active,
				created_by,
				created_at,
				updated_at
			FROM campfire_standup_templates
			WHERE workspace_id = ? AND is_active = TRUE
			ORDER BY kind ASC, is_default DESC, name ASC
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
				questions.question_key,
				questions.label,
				questions.prompt,
				questions.help_text,
				questions.placeholder,
				questions.question_type,
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
	ID           string         `db:"id"`
	WorkspaceID  string         `db:"workspace_id"`
	TemplateID   string         `db:"template_id"`
	Section      string         `db:"section"`
	QuestionKey  string         `db:"question_key"`
	Label        string         `db:"label"`
	Prompt       string         `db:"prompt"`
	HelpText     string         `db:"help_text"`
	Placeholder  string         `db:"placeholder"`
	QuestionType string         `db:"question_type"`
	Required     bool           `db:"required"`
	ShowInReport bool           `db:"show_in_report"`
	IsPrivate    bool           `db:"is_private"`
	Position     int            `db:"position"`
	OptionsJSON  sql.NullString `db:"options_json"`
	CreatedAt    time.Time      `db:"created_at"`
	UpdatedAt    time.Time      `db:"updated_at"`
}

/*
toDomain maps a standup question record to the domain model.
*/
func (r standupQuestionRecord) toDomain() (*domain.StandupQuestion, error) {
	optionsJSON := ""
	if r.OptionsJSON.Valid {
		optionsJSON = r.OptionsJSON.String
	}

	options, err := parseQuestionOptions(r.OptionsJSON)
	if err != nil {
		return nil, fmt.Errorf("parse question options for %s: %w", r.ID, err)
	}

	return &domain.StandupQuestion{
		ID:           domain.ID(r.ID),
		WorkspaceID:  domain.ID(r.WorkspaceID),
		TemplateID:   domain.ID(r.TemplateID),
		Section:      r.Section,
		QuestionKey:  r.QuestionKey,
		Label:        r.Label,
		Prompt:       r.Prompt,
		HelpText:     r.HelpText,
		Placeholder:  r.Placeholder,
		Type:         domain.QuestionType(r.QuestionType),
		Required:     r.Required,
		ShowInReport: r.ShowInReport,
		IsPrivate:    r.IsPrivate,
		Position:     r.Position,
		SortOrder:    r.Position,
		OptionsJSON:  optionsJSON,
		Options:      options,
		CreatedAt:    parseStoredTime(r.CreatedAt),
		UpdatedAt:    parseStoredTime(r.UpdatedAt),
	}, nil
}

/*
parseQuestionOptions parses a question option JSON array.
*/
func parseQuestionOptions(value sql.NullString) ([]string, error) {
	if !value.Valid || value.String == "" {
		return []string{}, nil
	}

	options := []string{}
	if err := json.Unmarshal([]byte(value.String), &options); err != nil {
		return nil, err
	}

	return options, nil
}

/*
standupScheduleRecord represents a row from campfire_standup_schedules.
*/
type standupScheduleRecord struct {
	ID                      string         `db:"id"`
	WorkspaceID             string         `db:"workspace_id"`
	TemplateID              string         `db:"template_id"`
	Kind                    string         `db:"kind"`
	Enabled                 bool           `db:"enabled"`
	TimeOfDay               string         `db:"time_of_day"`
	SkipNonWorkingDays      bool           `db:"skip_non_working_days"`
	WeeklyMode              sql.NullString `db:"weekly_mode"`
	SkipDailyWhenWeeklyRuns bool           `db:"skip_daily_when_weekly_runs"`
	CreatedBy               string         `db:"created_by"`
	CreatedAt               time.Time      `db:"created_at"`
	UpdatedAt               time.Time      `db:"updated_at"`
}

/*
toDomain maps a standup schedule record to the domain model.
*/
func (r standupScheduleRecord) toDomain() domain.StandupSchedule {
	weeklyMode := ""
	if r.WeeklyMode.Valid {
		weeklyMode = r.WeeklyMode.String
	}

	return domain.StandupSchedule{
		ID:                      domain.ID(r.ID),
		WorkspaceID:             domain.ID(r.WorkspaceID),
		TemplateID:              domain.ID(r.TemplateID),
		Kind:                    domain.StandupKind(r.Kind),
		Enabled:                 r.Enabled,
		TimeOfDay:               domain.TimeOfDay(r.TimeOfDay),
		SkipNonWorkingDays:      r.SkipNonWorkingDays,
		WeeklyMode:              domain.WeeklyMode(weeklyMode),
		SkipDailyWhenWeeklyRuns: r.SkipDailyWhenWeeklyRuns,
		CreatedBy:               r.CreatedBy,
		CreatedAt:               parseStoredTime(r.CreatedAt),
		UpdatedAt:               parseStoredTime(r.UpdatedAt),
	}
}

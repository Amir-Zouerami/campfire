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
CreateStandupTemplateParams contains a template and its questions.
*/
type CreateStandupTemplateParams struct {
	Template  domain.StandupTemplate
	Questions []domain.StandupQuestion
}

/*
CreateWorkspaceParams contains all records needed to create a workspace.

Workspace creation is intentionally transactional at the store layer.
*/
type CreateWorkspaceParams struct {
	Workspace        domain.Workspace
	WorkingDays      []domain.WorkspaceWorkingDay
	RoleSettings     domain.WorkspaceRoleSettings
	RoleAssignments  []domain.WorkspaceRoleAssignment
	LeaveTypes       []domain.LeaveType
	StandupTemplates []CreateStandupTemplateParams
	StandupSchedules []domain.StandupSchedule
	ReminderRules    []domain.ReminderRule
	ReportRules      []domain.ReportRule
}

/*
WorkspaceStore defines persistence operations for workspace configuration.
*/
type WorkspaceStore interface {
	GetByChannelID(ctx context.Context, channelID string) (*domain.Workspace, error)
	Create(ctx context.Context, params CreateWorkspaceParams) (*domain.Workspace, error)
}

/*
SQLWorkspaceStore persists workspace configuration in SQL.
*/
type SQLWorkspaceStore struct {
	db *sqlx.DB
}

/*
NewSQLWorkspaceStore creates a SQL-backed workspace store.
*/
func NewSQLWorkspaceStore(database *Database) *SQLWorkspaceStore {
	return &SQLWorkspaceStore{
		db: database.DB,
	}
}

/*
GetByChannelID returns the active Campfire workspace linked to a Mattermost channel.
*/
func (s *SQLWorkspaceStore) GetByChannelID(ctx context.Context, channelID string) (*domain.Workspace, error) {
	var record workspaceRecord

	query := s.db.Rebind(`
		SELECT
			id,
			team_id,
			channel_id,
			name,
			description,
			board_url,
			timezone,
			created_by,
			created_at,
			updated_at,
			is_archived
		FROM campfire_workspaces
		WHERE channel_id = ? AND is_archived = FALSE
		LIMIT 1
	`)

	err := s.db.GetContext(ctx, &record, query, channelID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}

		return nil, fmt.Errorf("get workspace by channel id: %w", err)
	}

	workspace := record.toDomain()

	return &workspace, nil
}

/*
Create inserts a workspace and its initial configuration in a single transaction.
*/
func (s *SQLWorkspaceStore) Create(ctx context.Context, params CreateWorkspaceParams) (*domain.Workspace, error) {
	transaction, err := s.db.BeginTxx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin workspace transaction: %w", err)
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

	if err := s.insertWorkspace(ctx, transaction, params.Workspace); err != nil {
		return nil, err
	}

	for _, workingDay := range params.WorkingDays {
		if err := s.insertWorkingDay(ctx, transaction, workingDay); err != nil {
			return nil, err
		}
	}

	if err := s.insertRoleSettings(ctx, transaction, params.RoleSettings); err != nil {
		return nil, err
	}

	for _, roleAssignment := range params.RoleAssignments {
		if err := s.insertRoleAssignment(ctx, transaction, roleAssignment); err != nil {
			return nil, err
		}
	}

	for _, leaveType := range params.LeaveTypes {
		if err := s.insertLeaveType(ctx, transaction, leaveType); err != nil {
			return nil, err
		}
	}

	for _, templateParams := range params.StandupTemplates {
		if err := s.insertStandupTemplate(ctx, transaction, templateParams.Template); err != nil {
			return nil, err
		}

		for _, question := range templateParams.Questions {
			if err := s.insertStandupQuestion(ctx, transaction, question); err != nil {
				return nil, err
			}
		}
	}

	for _, schedule := range params.StandupSchedules {
		if err := s.insertStandupSchedule(ctx, transaction, schedule); err != nil {
			return nil, err
		}
	}

	for _, reminderRule := range params.ReminderRules {
		if err := s.insertReminderRule(ctx, transaction, reminderRule); err != nil {
			return nil, err
		}
	}

	for _, reportRule := range params.ReportRules {
		if err := s.insertReportRule(ctx, transaction, reportRule); err != nil {
			return nil, err
		}
	}

	if err := transaction.Commit(); err != nil {
		return nil, fmt.Errorf("commit workspace transaction: %w", err)
	}

	committed = true

	return &params.Workspace, nil
}

/*
insertWorkspace inserts a workspace row.
*/
func (s *SQLWorkspaceStore) insertWorkspace(ctx context.Context, tx *sqlx.Tx, workspace domain.Workspace) error {
	_, err := tx.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_workspaces (
				id,
				team_id,
				channel_id,
				name,
				description,
				board_url,
				timezone,
				created_by,
				created_at,
				updated_at,
				is_archived
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		workspace.ID.String(),
		workspace.TeamID,
		workspace.ChannelID,
		workspace.Name,
		workspace.Description,
		workspace.BoardURL,
		workspace.Timezone,
		workspace.CreatedBy,
		workspace.CreatedAt,
		workspace.UpdatedAt,
		workspace.IsArchived,
	)
	if err != nil {
		return fmt.Errorf("insert workspace: %w", err)
	}

	return nil
}

/*
insertWorkingDay inserts a workspace working-day row.
*/
func (s *SQLWorkspaceStore) insertWorkingDay(
	ctx context.Context,
	tx *sqlx.Tx,
	workingDay domain.WorkspaceWorkingDay,
) error {
	_, err := tx.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_workspace_working_days (
				id,
				workspace_id,
				weekday,
				enabled,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?)
		`),
		workingDay.ID.String(),
		workingDay.WorkspaceID.String(),
		int(workingDay.Weekday),
		workingDay.Enabled,
		workingDay.CreatedAt,
		workingDay.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert workspace working day: %w", err)
	}

	return nil
}

/*
insertRoleSettings inserts workspace role settings.
*/
func (s *SQLWorkspaceStore) insertRoleSettings(
	ctx context.Context,
	tx *sqlx.Tx,
	roleSettings domain.WorkspaceRoleSettings,
) error {
	_, err := tx.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_workspace_role_settings (
				workspace_id,
				channel_admins_are_leads,
				system_admins_are_admins,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?)
		`),
		roleSettings.WorkspaceID.String(),
		roleSettings.ChannelAdminsAreLeads,
		roleSettings.SystemAdminsAreAdmins,
		roleSettings.CreatedAt,
		roleSettings.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert workspace role settings: %w", err)
	}

	return nil
}

/*
insertRoleAssignment inserts a workspace role assignment.
*/
func (s *SQLWorkspaceStore) insertRoleAssignment(
	ctx context.Context,
	tx *sqlx.Tx,
	roleAssignment domain.WorkspaceRoleAssignment,
) error {
	_, err := tx.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_workspace_role_assignments (
				id,
				workspace_id,
				user_id,
				role,
				created_by,
				created_at
			) VALUES (?, ?, ?, ?, ?, ?)
		`),
		roleAssignment.ID.String(),
		roleAssignment.WorkspaceID.String(),
		roleAssignment.UserID,
		string(roleAssignment.Role),
		roleAssignment.CreatedBy,
		roleAssignment.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert workspace role assignment: %w", err)
	}

	return nil
}

/*
insertLeaveType inserts a workspace leave type.
*/
func (s *SQLWorkspaceStore) insertLeaveType(ctx context.Context, tx *sqlx.Tx, leaveType domain.LeaveType) error {
	_, err := tx.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_leave_types (
				id,
				workspace_id,
				name,
				code,
				color,
				requires_approval,
				is_active,
				created_by,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		leaveType.ID.String(),
		leaveType.WorkspaceID.String(),
		leaveType.Name,
		leaveType.Code,
		leaveType.Color,
		leaveType.RequiresApproval,
		leaveType.IsActive,
		leaveType.CreatedBy,
		leaveType.CreatedAt,
		leaveType.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert leave type: %w", err)
	}

	return nil
}

/*
insertStandupTemplate inserts a standup template.
*/
func (s *SQLWorkspaceStore) insertStandupTemplate(
	ctx context.Context,
	tx *sqlx.Tx,
	template domain.StandupTemplate,
) error {
	_, err := tx.ExecContext(
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
		return fmt.Errorf("insert standup template: %w", err)
	}

	return nil
}

/*
insertStandupQuestion inserts a standup question.
*/
func (s *SQLWorkspaceStore) insertStandupQuestion(
	ctx context.Context,
	tx *sqlx.Tx,
	question domain.StandupQuestion,
) error {
	_, err := tx.ExecContext(
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
				position,
				options_json,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
		question.Position,
		question.OptionsJSON,
		question.CreatedAt,
		question.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert standup question: %w", err)
	}

	return nil
}

/*
insertStandupSchedule inserts a standup schedule.
*/
func (s *SQLWorkspaceStore) insertStandupSchedule(
	ctx context.Context,
	tx *sqlx.Tx,
	schedule domain.StandupSchedule,
) error {
	_, err := tx.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_standup_schedules (
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
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		schedule.ID.String(),
		schedule.WorkspaceID.String(),
		schedule.TemplateID.String(),
		string(schedule.Kind),
		schedule.Enabled,
		schedule.TimeOfDay.String(),
		schedule.SkipNonWorkingDays,
		string(schedule.WeeklyMode),
		schedule.SkipDailyWhenWeeklyRuns,
		schedule.CreatedBy,
		schedule.CreatedAt,
		schedule.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert standup schedule: %w", err)
	}

	return nil
}

/*
insertReminderRule inserts a reminder rule.
*/
func (s *SQLWorkspaceStore) insertReminderRule(
	ctx context.Context,
	tx *sqlx.Tx,
	rule domain.ReminderRule,
) error {
	_, err := tx.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_reminder_rules (
				id,
				workspace_id,
				schedule_id,
				enabled,
				channel_reminder_enabled,
				dm_reminder_enabled,
				reminder_count,
				interval_minutes,
				start_offset_minutes,
				mention_missing_in_channel,
				created_by,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		rule.ID.String(),
		rule.WorkspaceID.String(),
		rule.ScheduleID.String(),
		rule.Enabled,
		rule.ChannelReminderEnabled,
		rule.DMReminderEnabled,
		rule.ReminderCount,
		rule.IntervalMinutes,
		rule.StartOffsetMinutes,
		rule.MentionMissingInChannel,
		rule.CreatedBy,
		rule.CreatedAt,
		rule.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert reminder rule: %w", err)
	}

	return nil
}

/*
insertReportRule inserts a report rule.
*/
func (s *SQLWorkspaceStore) insertReportRule(
	ctx context.Context,
	tx *sqlx.Tx,
	rule domain.ReportRule,
) error {
	_, err := tx.ExecContext(
		ctx,
		s.db.Rebind(`
			INSERT INTO campfire_report_rules (
				id,
				workspace_id,
				schedule_id,
				enabled,
				report_kind,
				post_to_channel,
				preview_required,
				sort_mode,
				include_on_leave,
				include_missing,
				include_time,
				include_blockers,
				created_by,
				created_at,
				updated_at
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`),
		rule.ID.String(),
		rule.WorkspaceID.String(),
		rule.ScheduleID.String(),
		rule.Enabled,
		string(rule.ReportKind),
		rule.PostToChannel,
		rule.PreviewRequired,
		string(rule.SortMode),
		rule.IncludeOnLeave,
		rule.IncludeMissing,
		rule.IncludeTime,
		rule.IncludeBlockers,
		rule.CreatedBy,
		rule.CreatedAt,
		rule.UpdatedAt,
	)
	if err != nil {
		return fmt.Errorf("insert report rule: %w", err)
	}

	return nil
}

/*
workspaceRecord represents a row from campfire_workspaces.
*/
type workspaceRecord struct {
	ID          string    `db:"id"`
	TeamID      string    `db:"team_id"`
	ChannelID   string    `db:"channel_id"`
	Name        string    `db:"name"`
	Description string    `db:"description"`
	BoardURL    string    `db:"board_url"`
	Timezone    string    `db:"timezone"`
	CreatedBy   string    `db:"created_by"`
	CreatedAt   time.Time `db:"created_at"`
	UpdatedAt   time.Time `db:"updated_at"`
	IsArchived  bool      `db:"is_archived"`
}

/*
toDomain maps a workspace database record to the domain model.
*/
func (r workspaceRecord) toDomain() domain.Workspace {
	return domain.Workspace{
		ID:          domain.ID(r.ID),
		TeamID:      r.TeamID,
		ChannelID:   r.ChannelID,
		Name:        r.Name,
		Description: r.Description,
		BoardURL:    r.BoardURL,
		Timezone:    r.Timezone,
		CreatedBy:   r.CreatedBy,
		CreatedAt:   parseStoredTime(r.CreatedAt),
		UpdatedAt:   parseStoredTime(r.UpdatedAt),
		IsArchived:  r.IsArchived,
	}
}

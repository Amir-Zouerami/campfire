-- +goose Up

CREATE TABLE IF NOT EXISTS campfire_standup_templates (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    kind VARCHAR(32) NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_standup_templates_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campfire_standup_templates_workspace_kind
    ON campfire_standup_templates(workspace_id, kind);

CREATE TABLE IF NOT EXISTS campfire_standup_questions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    template_id VARCHAR(36) NOT NULL,
    workspace_id VARCHAR(36) NOT NULL,
    section VARCHAR(255) NOT NULL,
    label TEXT NOT NULL,
    help_text TEXT NOT NULL,
    placeholder TEXT NOT NULL,
    type VARCHAR(32) NOT NULL,
    required BOOLEAN NOT NULL,
    show_in_report BOOLEAN NOT NULL,
    is_private BOOLEAN NOT NULL,
    position INTEGER NOT NULL,
    options_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_standup_questions_template
        FOREIGN KEY (template_id)
        REFERENCES campfire_standup_templates(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_campfire_standup_questions_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campfire_standup_questions_template_position
    ON campfire_standup_questions(template_id, position);

CREATE TABLE IF NOT EXISTS campfire_standup_schedules (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    template_id VARCHAR(36) NOT NULL,
    kind VARCHAR(32) NOT NULL,
    enabled BOOLEAN NOT NULL,
    time_of_day VARCHAR(5) NOT NULL,
    skip_non_working_days BOOLEAN NOT NULL,
    weekly_mode VARCHAR(64) NOT NULL,
    skip_daily_when_weekly_runs BOOLEAN NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_standup_schedules_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_campfire_standup_schedules_template
        FOREIGN KEY (template_id)
        REFERENCES campfire_standup_templates(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campfire_standup_schedules_workspace_kind
    ON campfire_standup_schedules(workspace_id, kind);

CREATE TABLE IF NOT EXISTS campfire_reminder_rules (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    schedule_id VARCHAR(36) NOT NULL,
    enabled BOOLEAN NOT NULL,
    channel_reminder_enabled BOOLEAN NOT NULL,
    dm_reminder_enabled BOOLEAN NOT NULL,
    reminder_count INTEGER NOT NULL,
    interval_minutes INTEGER NOT NULL,
    start_offset_minutes INTEGER NOT NULL,
    mention_missing_in_channel BOOLEAN NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_reminder_rules_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_campfire_reminder_rules_schedule
        FOREIGN KEY (schedule_id)
        REFERENCES campfire_standup_schedules(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campfire_reminder_rules_workspace_schedule
    ON campfire_reminder_rules(workspace_id, schedule_id);

CREATE TABLE IF NOT EXISTS campfire_report_rules (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    schedule_id VARCHAR(36) NOT NULL,
    enabled BOOLEAN NOT NULL,
    report_kind VARCHAR(32) NOT NULL,
    post_to_channel BOOLEAN NOT NULL,
    preview_required BOOLEAN NOT NULL,
    sort_mode VARCHAR(64) NOT NULL,
    include_on_leave BOOLEAN NOT NULL,
    include_missing BOOLEAN NOT NULL,
    include_time BOOLEAN NOT NULL,
    include_blockers BOOLEAN NOT NULL,
    created_by VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_report_rules_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_campfire_report_rules_schedule
        FOREIGN KEY (schedule_id)
        REFERENCES campfire_standup_schedules(id)
        ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_campfire_report_rules_workspace_kind
    ON campfire_report_rules(workspace_id, report_kind);

CREATE TABLE IF NOT EXISTS campfire_standup_submissions (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    workspace_id VARCHAR(36) NOT NULL,
    template_id VARCHAR(36) NOT NULL,
    schedule_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    occurrence_date VARCHAR(10) NOT NULL,
    first_submitted_at TIMESTAMP NOT NULL,
    last_updated_at TIMESTAMP NOT NULL,
    status VARCHAR(32) NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_standup_submissions_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_campfire_standup_submissions_template
        FOREIGN KEY (template_id)
        REFERENCES campfire_standup_templates(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_campfire_standup_submissions_schedule
        FOREIGN KEY (schedule_id)
        REFERENCES campfire_standup_schedules(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_campfire_standup_submissions_unique_occurrence
    ON campfire_standup_submissions(workspace_id, template_id, user_id, occurrence_date);

CREATE INDEX IF NOT EXISTS idx_campfire_standup_submissions_workspace_date
    ON campfire_standup_submissions(workspace_id, occurrence_date);

CREATE INDEX IF NOT EXISTS idx_campfire_standup_submissions_user_date
    ON campfire_standup_submissions(user_id, occurrence_date);

CREATE INDEX IF NOT EXISTS idx_campfire_standup_submissions_first_submitted
    ON campfire_standup_submissions(first_submitted_at);

CREATE INDEX IF NOT EXISTS idx_campfire_standup_submissions_last_updated
    ON campfire_standup_submissions(last_updated_at);

CREATE TABLE IF NOT EXISTS campfire_standup_answers (
    id VARCHAR(36) NOT NULL PRIMARY KEY,
    submission_id VARCHAR(36) NOT NULL,
    workspace_id VARCHAR(36) NOT NULL,
    question_id VARCHAR(36) NOT NULL,
    value_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,

    CONSTRAINT fk_campfire_standup_answers_submission
        FOREIGN KEY (submission_id)
        REFERENCES campfire_standup_submissions(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_campfire_standup_answers_workspace
        FOREIGN KEY (workspace_id)
        REFERENCES campfire_workspaces(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_campfire_standup_answers_question
        FOREIGN KEY (question_id)
        REFERENCES campfire_standup_questions(id)
        ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_campfire_standup_answers_submission_question
    ON campfire_standup_answers(submission_id, question_id);

-- +goose Down

DROP TABLE IF EXISTS campfire_standup_answers;
DROP TABLE IF EXISTS campfire_standup_submissions;
DROP TABLE IF EXISTS campfire_report_rules;
DROP TABLE IF EXISTS campfire_reminder_rules;
DROP TABLE IF EXISTS campfire_standup_schedules;
DROP TABLE IF EXISTS campfire_standup_questions;
DROP TABLE IF EXISTS campfire_standup_templates;
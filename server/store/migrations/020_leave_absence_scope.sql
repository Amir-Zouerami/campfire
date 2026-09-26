-- +goose Up

ALTER TABLE campfire_workspaces
    ADD COLUMN IF NOT EXISTS leave_absence_scope VARCHAR(32) NOT NULL DEFAULT 'same_workspace',
    ADD COLUMN IF NOT EXISTS leave_absence_channel_id VARCHAR(64) NOT NULL DEFAULT '';

-- +goose Down

ALTER TABLE campfire_workspaces
    DROP COLUMN IF EXISTS leave_absence_channel_id,
    DROP COLUMN IF EXISTS leave_absence_scope;

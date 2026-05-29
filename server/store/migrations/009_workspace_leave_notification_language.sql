-- +goose Up

ALTER TABLE campfire_workspaces
    ADD COLUMN IF NOT EXISTS leave_notification_language VARCHAR(16) NOT NULL DEFAULT 'english';

UPDATE campfire_workspaces
SET leave_notification_language = 'english'
WHERE leave_notification_language = '';

-- +goose Down

ALTER TABLE campfire_workspaces
    DROP COLUMN IF EXISTS leave_notification_language;

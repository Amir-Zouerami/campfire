-- +goose Up

ALTER TABLE campfire_workspaces
    ADD COLUMN approved_leave_notification_channel_id VARCHAR(64) NOT NULL DEFAULT '';

-- +goose Down

ALTER TABLE campfire_workspaces
    DROP COLUMN approved_leave_notification_channel_id;
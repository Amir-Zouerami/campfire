-- +goose Up

ALTER TABLE campfire_workspaces
    ADD COLUMN IF NOT EXISTS leave_request_notification_recipient_ids VARCHAR(2048) NOT NULL DEFAULT '';

ALTER TABLE campfire_leave_requests
    ADD COLUMN IF NOT EXISTS can_contact_if_needed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE campfire_workspaces
SET leave_request_notification_recipient_ids = ''
WHERE leave_request_notification_recipient_ids IS NULL;

-- +goose Down

ALTER TABLE campfire_leave_requests
    DROP COLUMN IF EXISTS can_contact_if_needed;

ALTER TABLE campfire_workspaces
    DROP COLUMN IF EXISTS leave_request_notification_recipient_ids;

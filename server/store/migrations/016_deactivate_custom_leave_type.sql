-- +goose Up
UPDATE campfire_leave_types
SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
WHERE LOWER(code) = 'custom' AND is_active = TRUE;

-- +goose Down
UPDATE campfire_leave_types
SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
WHERE LOWER(code) = 'custom' AND is_active = FALSE;

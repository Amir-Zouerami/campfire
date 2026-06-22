-- +goose Up
UPDATE campfire_leave_types
SET is_active = FALSE, updated_at = CURRENT_TIMESTAMP
WHERE LOWER(code) IN ('vacation', 'custom') AND is_active = TRUE;

UPDATE campfire_leave_types
SET name = 'WFH/Remote', updated_at = CURRENT_TIMESTAMP
WHERE LOWER(code) = 'remote_wfh' AND name <> 'WFH/Remote';

-- +goose Down
UPDATE campfire_leave_types
SET is_active = TRUE, updated_at = CURRENT_TIMESTAMP
WHERE LOWER(code) IN ('vacation', 'custom') AND is_active = FALSE;

UPDATE campfire_leave_types
SET name = 'Remote/WFH', updated_at = CURRENT_TIMESTAMP
WHERE LOWER(code) = 'remote_wfh' AND name = 'WFH/Remote';

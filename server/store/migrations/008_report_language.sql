-- +goose Up

ALTER TABLE campfire_report_rules
    ADD COLUMN IF NOT EXISTS report_language VARCHAR(32) NOT NULL DEFAULT 'english';

UPDATE campfire_report_rules
SET report_language = 'english'
WHERE report_language = '';

-- +goose Down

ALTER TABLE campfire_report_rules
    DROP COLUMN IF EXISTS report_language;

-- +goose Up

ALTER TABLE campfire_workspaces
    ADD COLUMN IF NOT EXISTS generated_message_language VARCHAR(16) NOT NULL DEFAULT 'english';

UPDATE campfire_workspaces
SET generated_message_language = CASE
    WHEN leave_notification_language IN ('persian', 'arabic') THEN leave_notification_language
    WHEN timezone = 'Asia/Tehran' THEN 'persian'
    WHEN timezone IN (
        'Africa/Algiers',
        'Africa/Cairo',
        'Africa/Casablanca',
        'Africa/Khartoum',
        'Africa/Tripoli',
        'Africa/Tunis',
        'Asia/Amman',
        'Asia/Baghdad',
        'Asia/Bahrain',
        'Asia/Beirut',
        'Asia/Dubai',
        'Asia/Jeddah',
        'Asia/Kuwait',
        'Asia/Muscat',
        'Asia/Qatar',
        'Asia/Riyadh'
    ) THEN 'arabic'
    ELSE 'english'
END
WHERE generated_message_language = ''
    OR generated_message_language = 'english';

-- +goose Down

ALTER TABLE campfire_workspaces
    DROP COLUMN IF EXISTS generated_message_language;

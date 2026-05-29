-- +goose Up

ALTER TABLE campfire_standup_questions
    ADD COLUMN creates_tasks BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE campfire_standup_questions
SET creates_tasks = TRUE
WHERE
    type IN ('text', 'long_text')
    AND (
        LOWER(section) LIKE '%progress%'
        OR LOWER(section) LIKE '%plan%'
        OR LOWER(label) LIKE '%yesterday%'
        OR LOWER(label) LIKE '%today%'
        OR LOWER(label) LIKE '%work on%'
        OR LOWER(label) LIKE '%focusing on%'
        OR LOWER(help_text) LIKE '%work item%'
        OR LOWER(help_text) LIKE '%task%'
    )
    AND LOWER(section) NOT LIKE '%block%'
    AND LOWER(label) NOT LIKE '%block%'
    AND LOWER(label) NOT LIKE '%risk%';

-- +goose Down

ALTER TABLE campfire_standup_questions
    DROP COLUMN creates_tasks;

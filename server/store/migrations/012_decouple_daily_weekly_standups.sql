-- +goose Up

UPDATE campfire_standup_schedules
SET skip_daily_when_weekly_runs = FALSE
WHERE skip_daily_when_weekly_runs = TRUE;

UPDATE campfire_standup_schedules
SET opens_at = '09:30',
    time_of_day = '10:00'
WHERE kind = 'daily'
  AND opens_at = '09:30'
  AND time_of_day IN ('09:30', '10:00');

UPDATE campfire_standup_schedules
SET opens_at = '15:30',
    time_of_day = '16:00',
    weekly_mode = 'last_working_day'
WHERE kind = 'weekly'
  AND weekly_mode IN ('', 'last_working_day')
  AND time_of_day IN ('10:00', '16:00');

UPDATE campfire_reminder_rules
SET reminder_offsets_json = '[15,25]'
WHERE schedule_id IN (
    SELECT id
    FROM campfire_standup_schedules
    WHERE kind = 'daily'
)
AND reminder_offsets_json = '[0,15,25]';

UPDATE campfire_reminder_rules
SET reminder_offsets_json = '[15]'
WHERE schedule_id IN (
    SELECT id
    FROM campfire_standup_schedules
    WHERE kind = 'weekly'
)
AND reminder_offsets_json IN ('[0,15,25]', '[15,25]', '[15]');

UPDATE campfire_report_rules
SET preview_required = FALSE,
    sort_mode = 'first_submitted'
WHERE report_kind IN ('daily', 'weekly');

UPDATE campfire_standup_questions
SET creates_tasks = FALSE
WHERE creates_tasks = TRUE;

-- +goose Down

-- Daily and weekly schedule decoupling is a forward-only data correction.
-- The previous skip_daily_when_weekly_runs values cannot be recovered safely.

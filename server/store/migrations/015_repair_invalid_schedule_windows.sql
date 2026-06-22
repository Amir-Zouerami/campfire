-- +goose Up

-- Older local/dev databases may contain schedules whose close/report time is
-- before their opening time. Those rows are invalid in the decoupled scheduler
-- model and cause the reminder loop to skip them repeatedly. This migration is
-- intentionally conservative: only impossible windows are normalized.
UPDATE campfire_standup_schedules
SET opens_at = '09:30',
    time_of_day = '10:00'
WHERE kind = 'daily'
  AND opens_at >= time_of_day;

UPDATE campfire_standup_schedules
SET opens_at = '15:30',
    time_of_day = '16:00'
WHERE kind = 'weekly'
  AND opens_at >= time_of_day;

-- +goose Down

-- Forward-only data repair. The previous invalid windows were not usable, so
-- rolling them back would reintroduce scheduler noise and missed reminders.

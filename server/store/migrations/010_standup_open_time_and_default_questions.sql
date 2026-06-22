-- +goose Up
ALTER TABLE campfire_standup_schedules
    ADD COLUMN IF NOT EXISTS opens_at VARCHAR(5) NOT NULL DEFAULT '09:30';

UPDATE campfire_standup_schedules
SET opens_at = CASE
    WHEN time_of_day = '10:00' THEN '09:30'
    WHEN time_of_day = '16:00' THEN '15:30'
    ELSE opens_at
END;

UPDATE campfire_standup_questions
SET
    label = 'What did you do today?',
    help_text = 'Share the work you completed or moved forward.',
    placeholder = 'Finished login refactor, reviewed dashboard PRs…',
    section = 'Today'
WHERE label = 'Yesterday / Progress'
  AND section = 'Progress';

UPDATE campfire_standup_questions
SET
    label = 'What will you do next?',
    help_text = 'Share your next focus and planned work.',
    placeholder = 'Continue dashboard work, pair on API contract…',
    section = 'Next'
WHERE label = 'Today / Plan'
  AND section = 'Plan';

UPDATE campfire_standup_questions
SET
    label = 'Are you blocked?',
    help_text = 'Share blockers, dependencies, or risks that need help.',
    placeholder = 'Waiting on API contract…',
    section = 'Blockers'
WHERE label = 'Blockers'
  AND section = 'Blockers';

-- +goose Down
UPDATE campfire_standup_questions
SET
    label = 'Yesterday / Progress',
    help_text = 'What did you finish or make progress on?',
    placeholder = 'Finished login refactor, reviewed dashboard PRs...',
    section = 'Progress'
WHERE label = 'What did you do today?'
  AND section = 'Today';

UPDATE campfire_standup_questions
SET
    label = 'Today / Plan',
    help_text = 'What are you focusing on next?',
    placeholder = 'Continue dashboard work, pair on API contract...',
    section = 'Plan'
WHERE label = 'What will you do next?'
  AND section = 'Next';

UPDATE campfire_standup_questions
SET
    label = 'Blockers',
    help_text = 'Anything blocking you?',
    placeholder = 'Waiting on API contract...',
    section = 'Blockers'
WHERE label = 'Are you blocked?'
  AND section = 'Blockers';

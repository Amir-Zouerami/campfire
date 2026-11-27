-- +goose Up

-- Migration 012 switched task creation off everywhere, so new standup items
-- stopped being offered as suggestions.
UPDATE campfire_standup_questions
SET creates_tasks = TRUE
WHERE type = 'work_items'
  AND is_private = FALSE;

-- Cancelling leave used to leave its change request waiting in the queue.
UPDATE campfire_leave_change_requests
SET status = 'rejected',
    decision_comment = 'The leave request was cancelled.',
    updated_at = CURRENT_TIMESTAMP,
    decided_at = CURRENT_TIMESTAMP
WHERE status = 'pending'
  AND leave_request_id IN (
      SELECT id FROM campfire_leave_requests WHERE status = 'cancelled'
  );

-- +goose Down

-- Forward-only data correction.

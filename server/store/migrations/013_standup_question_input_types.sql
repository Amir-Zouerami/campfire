-- +goose Up

UPDATE campfire_standup_questions
SET type = 'work_items',
    creates_tasks = FALSE
WHERE type IN ('text', 'long_text')
  AND label IN (
    'What did you work on yesterday?',
    'What are you working on today?',
    'What did you do today?',
    'What will you do next?',
    'Yesterday / Progress',
    'Today / Plan',
    'دیروز روی چه چیزهایی کار کردید؟',
    'امروز روی چه چیزهایی کار می‌کنید؟',
    'ما الذي عملت عليه أمس؟',
    'ما الذي ستعمل عليه اليوم؟'
  );

-- +goose Down

UPDATE campfire_standup_questions
SET type = 'long_text'
WHERE type = 'work_items'
  AND label IN (
    'What did you work on yesterday?',
    'What are you working on today?',
    'What did you do today?',
    'What will you do next?',
    'Yesterday / Progress',
    'Today / Plan',
    'دیروز روی چه چیزهایی کار کردید؟',
    'امروز روی چه چیزهایی کار می‌کنید؟',
    'ما الذي عملت عليه أمس؟',
    'ما الذي ستعمل عليه اليوم؟'
  );

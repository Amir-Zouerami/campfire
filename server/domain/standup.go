package domain

import "time"

/*
StandupTemplate defines a reusable standup form.
*/
type StandupTemplate struct {
	ID          ID
	WorkspaceID ID

	Name        string
	Description string
	Kind        StandupKind

	IsDefault bool
	IsActive  bool

	CreatedBy string
	CreatedAt time.Time
	UpdatedAt time.Time
}

/*
StandupQuestion defines one question inside a standup template.

The fields intentionally match Campfire's seeded workspace schema so workspace
creation, configuration listing, and future submission validation all use one
domain model.
*/
type StandupQuestion struct {
	ID          ID
	WorkspaceID ID
	TemplateID  ID

	Section     string
	QuestionKey string
	Label       string
	Prompt      string
	HelpText    string
	Placeholder string

	Type     QuestionType
	Required bool

	ShowInReport bool
	IsPrivate    bool
	CreatesTasks bool

	Position    int
	SortOrder   int
	OptionsJSON string
	Options     []string

	CreatedAt time.Time
	UpdatedAt time.Time
}

/*
StandupSchedule defines when a standup template runs.
*/
type StandupSchedule struct {
	ID          ID
	WorkspaceID ID
	TemplateID  ID

	Kind    StandupKind
	Enabled bool

	OpensAt   TimeOfDay
	TimeOfDay TimeOfDay

	SkipNonWorkingDays      bool
	WeeklyMode              WeeklyMode
	SkipDailyWhenWeeklyRuns bool

	CreatedBy string
	CreatedAt time.Time
	UpdatedAt time.Time
}

/*
StandupSubmission is one user's submission for one standup occurrence.
*/
type StandupSubmission struct {
	ID          ID
	WorkspaceID ID
	TemplateID  ID
	ScheduleID  ID

	UserID         string
	OccurrenceDate LocalDate

	FirstSubmittedAt time.Time
	LastUpdatedAt    time.Time

	Status StandupSubmissionStatus

	CreatedAt time.Time
	UpdatedAt time.Time
}

/*
StandupAnswer is one answer inside a standup submission.
*/
type StandupAnswer struct {
	ID           ID
	SubmissionID ID
	WorkspaceID  ID
	QuestionID   ID

	ValueJSON string

	CreatedAt time.Time
	UpdatedAt time.Time
}

/*
StandupSubmissionWithAnswers contains one submission and all stored answers.
*/
type StandupSubmissionWithAnswers struct {
	Submission StandupSubmission
	Answers    []StandupAnswer
}

/*
StandupSubmissionSortMode identifies supported standup submission sorting modes.
*/
type StandupSubmissionSortMode string

const (
	/*
		StandupSubmissionSortName sorts submissions by user ID for now.

		Display-name sorting can be added after we introduce a user directory
		read model.
	*/
	StandupSubmissionSortName StandupSubmissionSortMode = "name"

	/*
		StandupSubmissionSortFirstSubmitted sorts by first submission time.
	*/
	StandupSubmissionSortFirstSubmitted StandupSubmissionSortMode = "first_submitted"

	/*
		StandupSubmissionSortLastSubmitted sorts by last update time.
	*/
	StandupSubmissionSortLastSubmitted StandupSubmissionSortMode = "last_submitted"

	/*
		StandupSubmissionSortMissingFirst lets the UI put missing users before submissions.
	*/
	StandupSubmissionSortMissingFirst StandupSubmissionSortMode = "missing_first"
)

/*
StandupKind identifies a standup template or schedule kind.
*/
type StandupKind string

const (
	/*
		StandupKindDaily identifies daily standups.
	*/
	StandupKindDaily StandupKind = "daily"

	/*
		StandupKindWeekly identifies weekly summaries.
	*/
	StandupKindWeekly StandupKind = "weekly"

	/*
		StandupKindCustom identifies future custom standup schedules.
	*/
	StandupKindCustom StandupKind = "custom"
)

/*
QuestionType identifies supported dynamic standup question types.
*/
type QuestionType string

const (
	/*
		QuestionTypeText stores a short text answer.
	*/
	QuestionTypeText QuestionType = "text"

	/*
		QuestionTypeLongText stores a longer text answer.
	*/
	QuestionTypeLongText QuestionType = "long_text"

	/*
		QuestionTypeWorkItems stores itemized work as newline-separated text.
	*/
	QuestionTypeWorkItems QuestionType = "work_items"

	/*
		QuestionTypeDate stores a YYYY-MM-DD calendar date.
	*/
	QuestionTypeDate QuestionType = "date"

	/*
		QuestionTypeTime stores an HH:mm local time.
	*/
	QuestionTypeTime QuestionType = "time"

	/*
		QuestionTypeDateTime stores a YYYY-MM-DDTHH:mm local date-time.
	*/
	QuestionTypeDateTime QuestionType = "datetime"

	/*
		QuestionTypeCheckbox stores a checkbox answer.
	*/
	QuestionTypeCheckbox QuestionType = "checkbox"

	/*
		QuestionTypeBoolean stores a true/false answer.
	*/
	QuestionTypeBoolean QuestionType = "boolean"

	/*
		QuestionTypeDropdown stores one selected option.
	*/
	QuestionTypeDropdown QuestionType = "dropdown"

	/*
		QuestionTypeMultiSelect stores multiple selected options.
	*/
	QuestionTypeMultiSelect QuestionType = "multi_select"

	/*
		QuestionTypeNumber stores a numeric answer.
	*/
	QuestionTypeNumber QuestionType = "number"

	/*
		QuestionTypeDuration stores a duration answer.
	*/
	QuestionTypeDuration QuestionType = "duration"
)

const (
	/*
		QuestionText is a backwards-compatible alias for short text questions.
	*/
	QuestionText = QuestionTypeText

	/*
		QuestionLongText is a backwards-compatible alias for long text questions.
	*/
	QuestionLongText = QuestionTypeLongText

	/*
		QuestionWorkItems is an alias for itemized work questions.
	*/
	QuestionWorkItems = QuestionTypeWorkItems

	/*
		QuestionDate is an alias for date questions.
	*/
	QuestionDate = QuestionTypeDate

	/*
		QuestionTime is an alias for time questions.
	*/
	QuestionTime = QuestionTypeTime

	/*
		QuestionDateTime is an alias for date-time questions.
	*/
	QuestionDateTime = QuestionTypeDateTime

	/*
		QuestionCheckbox is a backwards-compatible alias for checkbox questions.
	*/
	QuestionCheckbox = QuestionTypeCheckbox

	/*
		QuestionBoolean is a backwards-compatible alias for true/false questions.
	*/
	QuestionBoolean = QuestionTypeBoolean

	/*
		QuestionDropdown is a backwards-compatible alias for dropdown questions.
	*/
	QuestionDropdown = QuestionTypeDropdown

	/*
		QuestionMultiSelect is a backwards-compatible alias for multi-select questions.
	*/
	QuestionMultiSelect = QuestionTypeMultiSelect

	/*
		QuestionNumber is a backwards-compatible alias for number questions.
	*/
	QuestionNumber = QuestionTypeNumber

	/*
		QuestionDuration is a backwards-compatible alias for duration questions.
	*/
	QuestionDuration = QuestionTypeDuration
)

/*
WeeklyMode identifies how weekly summaries are scheduled.
*/
type WeeklyMode string

const (
	/*
		WeeklyModeNone means no weekly mode is configured.
	*/
	WeeklyModeNone WeeklyMode = ""

	/*
		WeeklyModeLastWorkingDay means the weekly summary runs on the last working day.
	*/
	WeeklyModeLastWorkingDay WeeklyMode = "last_working_day"
)

/*
StandupSubmissionStatus identifies a submission lifecycle state.
*/
type StandupSubmissionStatus string

const (
	/*
		StandupSubmissionStatusSubmitted means the user submitted their standup.
	*/
	StandupSubmissionStatusSubmitted StandupSubmissionStatus = "submitted"
)

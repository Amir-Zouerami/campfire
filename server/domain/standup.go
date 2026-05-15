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

	TimeOfDay TimeOfDay

	SkipNonWorkingDays      bool
	WeeklyMode              WeeklyMode
	SkipDailyWhenWeeklyRuns bool

	CreatedBy string
	CreatedAt time.Time
	UpdatedAt time.Time
}

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

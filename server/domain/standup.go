package domain

import "time"

/*
StandupKind identifies the type of standup template or schedule.
*/
type StandupKind string

const (
	/*
		StandupKindDaily identifies a daily standup.
	*/
	StandupKindDaily StandupKind = "daily"

	/*
		StandupKindWeekly identifies a weekly summary.
	*/
	StandupKindWeekly StandupKind = "weekly"

	/*
		StandupKindCustom identifies a custom future standup type.
	*/
	StandupKindCustom StandupKind = "custom"
)

/*
StandupTemplate defines a dynamic standup form for a workspace.
*/
type StandupTemplate struct {
	ID          ID
	WorkspaceID ID

	Name        string
	Description string
	Kind        StandupKind

	IsActive bool

	CreatedBy string
	CreatedAt time.Time
	UpdatedAt time.Time
}

/*
QuestionType identifies the supported dynamic standup question type.
*/
type QuestionType string

const (
	/*
		QuestionText is a single-line text answer.
	*/
	QuestionText QuestionType = "text"

	/*
		QuestionLongText is a multi-line text answer.
	*/
	QuestionLongText QuestionType = "long_text"

	/*
		QuestionCheckbox is a checkbox or checkbox-group answer.
	*/
	QuestionCheckbox QuestionType = "checkbox"

	/*
		QuestionBoolean is a true/false answer.
	*/
	QuestionBoolean QuestionType = "boolean"

	/*
		QuestionDropdown is a single-select dropdown answer.
	*/
	QuestionDropdown QuestionType = "dropdown"

	/*
		QuestionMultiSelect is a multi-select answer.
	*/
	QuestionMultiSelect QuestionType = "multi_select"

	/*
		QuestionNumber is a numeric answer.
	*/
	QuestionNumber QuestionType = "number"

	/*
		QuestionDuration is a duration answer stored in minutes.
	*/
	QuestionDuration QuestionType = "duration"
)

/*
StandupQuestion defines one dynamic question inside a standup template.
*/
type StandupQuestion struct {
	ID          ID
	TemplateID  ID
	WorkspaceID ID

	Section     string
	Label       string
	HelpText    string
	Placeholder string

	Type QuestionType

	Required     bool
	ShowInReport bool
	IsPrivate    bool

	Position int

	OptionsJSON string

	CreatedAt time.Time
	UpdatedAt time.Time
}

/*
IsValid returns true when the standup kind is supported by Campfire.
*/
func (k StandupKind) IsValid() bool {
	switch k {
	case StandupKindDaily, StandupKindWeekly, StandupKindCustom:
		return true
	default:
		return false
	}
}

/*
IsValid returns true when the question type is supported by Campfire MVP.
*/
func (q QuestionType) IsValid() bool {
	switch q {
	case QuestionText,
		QuestionLongText,
		QuestionCheckbox,
		QuestionBoolean,
		QuestionDropdown,
		QuestionMultiSelect,
		QuestionNumber,
		QuestionDuration:
		return true
	default:
		return false
	}
}

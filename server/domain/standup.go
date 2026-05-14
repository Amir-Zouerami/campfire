package domain

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

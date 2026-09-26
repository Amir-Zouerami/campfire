package service

import (
	"strings"

	"github.com/amir-zouerami/campfire/server/domain"
)

// approvedLeavesAtTime keeps full-day leave and hourly leave covering referenceTime.
func approvedLeavesAtTime(leaves []domain.LeaveRequestWithType, referenceTime domain.TimeOfDay) []domain.LeaveRequestWithType {
	if strings.TrimSpace(referenceTime.String()) == "" {
		return leaves
	}

	result := make([]domain.LeaveRequestWithType, 0, len(leaves))
	for _, leave := range leaves {
		if leave.LeaveRequest.DurationMode != domain.LeaveDurationHourly ||
			(leave.LeaveRequest.StartTime <= referenceTime && referenceTime < leave.LeaveRequest.EndTime) {
			result = append(result, leave)
		}
	}
	return result
}

// approvedLeavesForDayGate excludes hourly leave because a day-level decision
// has no schedule time and must not cancel a later standup window.
func approvedLeavesForDayGate(leaves []domain.LeaveRequestWithType) []domain.LeaveRequestWithType {
	result := make([]domain.LeaveRequestWithType, 0, len(leaves))
	for _, leave := range leaves {
		if leave.LeaveRequest.DurationMode != domain.LeaveDurationHourly {
			result = append(result, leave)
		}
	}
	return result
}

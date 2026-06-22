package service

import (
	"context"
	"strings"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

/*
standupParticipantsFromMembers removes users explicitly excluded from standups.

Mattermost channel membership remains the source of the workspace member list,
but a Campfire excluded assignment removes that user from standup expectations,
missing-user calculations, reminders, runtime counts, and report rows.
*/
func standupParticipantsFromMembers(
	ctx context.Context,
	roleStore store.WorkspaceRoleStore,
	workspaceID domain.ID,
	memberUserIDs []string,
) ([]string, []string, error) {
	members := uniqueNonEmptyStrings(memberUserIDs)
	if roleStore == nil || len(members) == 0 {
		return members, []string{}, nil
	}

	excludedUserIDs, err := roleStore.ListUserIDsByRoles(ctx, workspaceID, []domain.Role{domain.RoleExcluded})
	if err != nil {
		return nil, nil, err
	}

	excludedSet := stringSet(excludedUserIDs)
	participants := make([]string, 0, len(members))
	excludedMembers := []string{}

	for _, userID := range members {
		if excludedSet[userID] {
			excludedMembers = append(excludedMembers, userID)
			continue
		}

		participants = append(participants, userID)
	}

	return participants, excludedMembers, nil
}

/*
filterStandupSubmissionsForParticipants removes submissions from excluded users.

This keeps historical or accidental submissions from users who are no longer
standup participants out of Team Review, reports, reminders, and CSV exports.
*/
func filterStandupSubmissionsForParticipants(
	submissions []domain.StandupSubmissionWithAnswers,
	participantUserIDs []string,
) []domain.StandupSubmissionWithAnswers {
	participantSet := stringSet(participantUserIDs)
	if len(participantSet) == 0 {
		return []domain.StandupSubmissionWithAnswers{}
	}

	filtered := make([]domain.StandupSubmissionWithAnswers, 0, len(submissions))
	for _, submission := range submissions {
		if participantSet[strings.TrimSpace(submission.Submission.UserID)] {
			filtered = append(filtered, submission)
		}
	}

	return filtered
}

/*
requireUserIsStandupParticipant blocks manual standup submission by excluded users.
*/
func requireUserIsStandupParticipant(
	ctx context.Context,
	roleStore store.WorkspaceRoleStore,
	workspaceID domain.ID,
	userID string,
) error {
	cleanUserID := strings.TrimSpace(userID)
	if cleanUserID == "" || roleStore == nil {
		return nil
	}

	excluded, err := roleStore.UserHasAnyRole(ctx, workspaceID, cleanUserID, []domain.Role{domain.RoleExcluded})
	if err != nil {
		return NewError(ErrorCodeInternal, "Could not verify standup participation settings.")
	}

	if excluded {
		return NewError(ErrorCodePermissionDenied, "You are excluded from standups in this workspace.")
	}

	return nil
}

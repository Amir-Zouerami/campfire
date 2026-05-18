package service

import (
	"context"
	"errors"
	"sort"
	"strings"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

/*
ListWorkspaceMembersInput contains the workspace member lookup request.
*/
type ListWorkspaceMembersInput struct {
	ActorUserID string
	WorkspaceID string
}

/*
WorkspaceMemberDirectoryService lists Mattermost users in a Campfire workspace channel.
*/
type WorkspaceMemberDirectoryService struct {
	workspaceStore          store.WorkspaceStore
	workspaceMemberProvider WorkspaceMemberProvider
	userDirectoryProvider   UserDirectoryProvider
}

/*
NewWorkspaceMemberDirectoryService creates a workspace member directory service.
*/
func NewWorkspaceMemberDirectoryService(
	workspaceStore store.WorkspaceStore,
	workspaceMemberProvider WorkspaceMemberProvider,
	userDirectoryProvider UserDirectoryProvider,
) *WorkspaceMemberDirectoryService {
	return &WorkspaceMemberDirectoryService{
		workspaceStore:          workspaceStore,
		workspaceMemberProvider: workspaceMemberProvider,
		userDirectoryProvider:   userDirectoryProvider,
	}
}

/*
List returns user profiles for members of the workspace's Mattermost channel.
*/
func (s *WorkspaceMemberDirectoryService) List(
	ctx context.Context,
	input ListWorkspaceMembersInput,
) ([]UserProfile, error) {
	if strings.TrimSpace(input.ActorUserID) == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to list workspace members.")
	}

	workspaceID := strings.TrimSpace(input.WorkspaceID)
	if workspaceID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	workspace, err := s.workspaceStore.GetByID(ctx, domain.ID(workspaceID))
	if err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	memberUserIDs, err := s.workspaceMemberProvider.ListWorkspaceMemberUserIDs(ctx, *workspace)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load workspace members.")
	}

	memberUserIDs = normalizeUserIDs(memberUserIDs)
	if len(memberUserIDs) == 0 {
		return []UserProfile{}, nil
	}

	profiles, err := s.userDirectoryProvider.GetUsersByIDs(ctx, memberUserIDs)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not resolve workspace member profiles.")
	}

	profilesByID := map[string]UserProfile{}
	for _, profile := range profiles {
		cleanUserID := strings.TrimSpace(profile.ID)
		if cleanUserID == "" {
			continue
		}

		profilesByID[cleanUserID] = profile
	}

	result := make([]UserProfile, 0, len(memberUserIDs))
	for _, userID := range memberUserIDs {
		profile, exists := profilesByID[userID]
		if exists {
			result = append(result, profile)
			continue
		}

		result = append(result, UserProfile{
			ID:          userID,
			Username:    "",
			DisplayName: "",
			Email:       "",
		})
	}

	sort.SliceStable(result, func(firstIndex int, secondIndex int) bool {
		return strings.ToLower(userProfileSortLabel(result[firstIndex])) <
			strings.ToLower(userProfileSortLabel(result[secondIndex]))
	})

	return result, nil
}

/*
userProfileSortLabel returns the best stable label for member sorting.
*/
func userProfileSortLabel(profile UserProfile) string {
	if strings.TrimSpace(profile.DisplayName) != "" {
		return profile.DisplayName
	}

	if strings.TrimSpace(profile.Username) != "" {
		return profile.Username
	}

	return profile.ID
}

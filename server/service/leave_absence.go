package service

import (
	"context"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
)

// approvedLeavesForStandupParticipants resolves leave according to the workspace setting.
func approvedLeavesForStandupParticipants(
	ctx context.Context,
	workspaceStore store.WorkspaceStore,
	leaveStore store.LeaveStore,
	workspace domain.Workspace,
	memberUserIDs []string,
	date domain.LocalDate,
) ([]domain.LeaveRequestWithType, error) {
	switch workspace.LeaveAbsenceScope {
	case domain.LeaveAbsenceScopeAllWorkspaces:
		return leaveStore.ListApprovedByUserIDsBetween(ctx, memberUserIDs, date, date)
	case domain.LeaveAbsenceScopeChannel:
		leaveWorkspace, err := workspaceStore.GetByChannelID(ctx, workspace.LeaveAbsenceChannelID)
		if err != nil {
			return nil, err
		}
		return leaveStore.ListApprovedByWorkspaceIDBetween(ctx, leaveWorkspace.ID, date, date)
	default:
		return leaveStore.ListApprovedByWorkspaceIDBetween(ctx, workspace.ID, date, date)
	}
}

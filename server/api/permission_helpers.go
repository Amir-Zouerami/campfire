package api

import (
	"context"
	"net/http"

	"github.com/amir-zouerami/campfire/server/logger"
	"github.com/amir-zouerami/campfire/server/mattermost"
	"github.com/amir-zouerami/campfire/server/service"
)

/*
workspacePermissionCheck is a PermissionService workspace capability check.
*/
type workspacePermissionCheck func(context.Context, string, service.PermissionUser) (bool, error)

/*
requireWorkspacePermission enforces one workspace-level permission before a
handler reaches service/business logic.
*/
func requireWorkspacePermission(
	w http.ResponseWriter,
	r *http.Request,
	log logger.Logger,
	permissionService *service.PermissionService,
	user *mattermost.User,
	workspaceID string,
	check workspacePermissionCheck,
	message string,
) bool {
	if permissionService == nil {
		WriteError(w, http.StatusInternalServerError, "internal_error", "Campfire permission service is not configured.")
		return false
	}

	allowed, err := check(r.Context(), workspaceID, permissionUserFromMattermost(user))
	if err != nil {
		logServiceError(log, err)
		WriteServiceError(w, err)
		return false
	}

	if !allowed {
		WriteError(w, http.StatusForbidden, "permission_denied", message)
		return false
	}

	return true
}

/*
requireManageWorkspace enforces workspace settings permission.
*/
func requireManageWorkspace(
	w http.ResponseWriter,
	r *http.Request,
	log logger.Logger,
	permissionService *service.PermissionService,
	user *mattermost.User,
	workspaceID string,
) bool {
	return requireWorkspacePermission(
		w,
		r,
		log,
		permissionService,
		user,
		workspaceID,
		permissionService.CanManageWorkspace,
		"Only workspace Leads and system admins can manage workspace settings.",
	)
}

/*
requireManageStandups enforces standup form/schedule management permission.
*/
func requireManageStandups(
	w http.ResponseWriter,
	r *http.Request,
	log logger.Logger,
	permissionService *service.PermissionService,
	user *mattermost.User,
	workspaceID string,
) bool {
	return requireWorkspacePermission(
		w,
		r,
		log,
		permissionService,
		user,
		workspaceID,
		permissionService.CanManageStandups,
		"Only workspace Leads and system admins can manage standup forms and schedules.",
	)
}

/*
requireViewWorkspaceReports enforces workspace report visibility.
*/
func requireViewWorkspaceReports(
	w http.ResponseWriter,
	r *http.Request,
	log logger.Logger,
	permissionService *service.PermissionService,
	user *mattermost.User,
	workspaceID string,
) bool {
	return requireWorkspacePermission(
		w,
		r,
		log,
		permissionService,
		user,
		workspaceID,
		permissionService.CanViewWorkspaceReports,
		"Only workspace Leads, Viewers, and system admins can view workspace reports.",
	)
}

/*
requireExportReports enforces workspace report export/post permission.
*/
func requireExportReports(
	w http.ResponseWriter,
	r *http.Request,
	log logger.Logger,
	permissionService *service.PermissionService,
	user *mattermost.User,
	workspaceID string,
) bool {
	return requireWorkspacePermission(
		w,
		r,
		log,
		permissionService,
		user,
		workspaceID,
		permissionService.CanExportReports,
		"Only workspace Leads and system admins can post or export workspace reports.",
	)
}

/*
requireApproveLeaves enforces leave approval permission.
*/
func requireApproveLeaves(
	w http.ResponseWriter,
	r *http.Request,
	log logger.Logger,
	permissionService *service.PermissionService,
	user *mattermost.User,
	workspaceID string,
) bool {
	return requireWorkspacePermission(
		w,
		r,
		log,
		permissionService,
		user,
		workspaceID,
		permissionService.CanApproveLeaves,
		"Only workspace Approvers, Leads, and system admins can approve leave requests.",
	)
}

/*
requireViewGlobalReports enforces global report visibility.
*/
func requireViewGlobalReports(
	w http.ResponseWriter,
	r *http.Request,
	permissionService *service.PermissionService,
	user *mattermost.User,
) bool {
	if permissionService == nil {
		WriteError(w, http.StatusInternalServerError, "internal_error", "Campfire permission service is not configured.")
		return false
	}

	allowed, err := permissionService.CanViewGlobalReports(r.Context(), permissionUserFromMattermost(user))
	if err != nil {
		WriteServiceError(w, err)
		return false
	}

	if !allowed {
		WriteError(w, http.StatusForbidden, "permission_denied", "Only Mattermost system admins can view global Campfire reports.")
		return false
	}

	return true
}

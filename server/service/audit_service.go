package service

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/amir-zouerami/campfire/server/domain"
	"github.com/amir-zouerami/campfire/server/store"
	"github.com/google/uuid"
)

/*
RecordAuditLogInput contains one audit action to record.
*/
type RecordAuditLogInput struct {
	WorkspaceID string
	ActorUserID string
	Action      string
	EntityType  string
	EntityID    string
	Metadata    map[string]string
}

/*
ListAuditLogInput contains audit-log list filters.
*/
type ListAuditLogInput struct {
	ActorUserID   string
	IsSystemAdmin bool
	WorkspaceID   string
	Limit         int
}

/*
AuditService records and lists important Campfire actions.
*/
type AuditService struct {
	permissions        *PermissionService
	workspaceStore     store.WorkspaceStore
	workspaceRoleStore store.WorkspaceRoleStore
	auditStore         store.AuditStore
}

/*
NewAuditService creates an audit service.
*/
func NewAuditService(
	workspaceStore store.WorkspaceStore,
	workspaceRoleStore store.WorkspaceRoleStore,
	auditStore store.AuditStore,
	permissions *PermissionService,
) *AuditService {
	return &AuditService{
		permissions:        permissions,
		workspaceStore:     workspaceStore,
		workspaceRoleStore: workspaceRoleStore,
		auditStore:         auditStore,
	}
}

/*
Record writes one audit-log entry.

Audit recording is best-effort at call sites, but this method still validates
the entry so malformed data does not pollute the audit table.
*/
func (s *AuditService) Record(ctx context.Context, input RecordAuditLogInput) (*domain.AuditLogEntry, error) {
	workspaceID := domain.ID(strings.TrimSpace(input.WorkspaceID))
	if workspaceID.String() == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required for audit logging.")
	}

	actorUserID := strings.TrimSpace(input.ActorUserID)
	if actorUserID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Actor user ID is required for audit logging.")
	}

	action := strings.TrimSpace(input.Action)
	if action == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Audit action is required.")
	}

	entityType := strings.TrimSpace(input.EntityType)
	if entityType == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Audit entity type is required.")
	}

	entityID := strings.TrimSpace(input.EntityID)
	if entityID == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Audit entity ID is required.")
	}

	metadataJSON, err := encodeAuditMetadata(input.Metadata)
	if err != nil {
		return nil, NewError(ErrorCodeValidationFailed, "Audit metadata must be valid JSON.")
	}

	entry, err := s.auditStore.Create(ctx, store.CreateAuditLogEntryParams{
		ID:           domain.ID(uuid.NewString()),
		WorkspaceID:  workspaceID,
		ActorUserID:  actorUserID,
		Action:       action,
		EntityType:   entityType,
		EntityID:     entityID,
		MetadataJSON: metadataJSON,
		CreatedAt:    time.Now().UTC(),
	})
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not record audit log entry.")
	}

	return entry, nil
}

/*
List returns recent audit-log entries for a workspace.
*/
func (s *AuditService) List(ctx context.Context, input ListAuditLogInput) ([]domain.AuditLogEntry, error) {
	actorUserID := strings.TrimSpace(input.ActorUserID)
	if actorUserID == "" {
		return nil, NewError(ErrorCodePermissionDenied, "You must be signed in to view the audit log.")
	}

	workspaceID := domain.ID(strings.TrimSpace(input.WorkspaceID))
	if workspaceID.String() == "" {
		return nil, NewError(ErrorCodeValidationFailed, "Workspace ID is required.")
	}

	if _, err := s.workspaceStore.GetByID(ctx, workspaceID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return nil, NewError(ErrorCodeNotFound, "Workspace was not found.")
		}

		return nil, NewError(ErrorCodeInternal, "Could not load workspace.")
	}

	if err := s.requireAuditViewPermission(ctx, actorUserID, input.IsSystemAdmin, workspaceID); err != nil {
		return nil, err
	}

	entries, err := s.auditStore.ListByWorkspaceID(ctx, workspaceID, input.Limit)
	if err != nil {
		return nil, NewError(ErrorCodeInternal, "Could not load audit log.")
	}

	return entries, nil
}

/*
requireAuditViewPermission ensures the actor can view workspace audit history.
*/
func (s *AuditService) requireAuditViewPermission(
	ctx context.Context,
	actorUserID string,
	isSystemAdmin bool,
	workspaceID domain.ID,
) error {
	return s.permissions.require(ctx, workspaceID, actorUserID, isSystemAdmin, canManageWorkspace, "Only workspace Leads, Admins, and System Admins can view the audit log.")
}

/*
encodeAuditMetadata serializes metadata for storage.
*/
func encodeAuditMetadata(metadata map[string]string) (string, error) {
	if metadata == nil {
		return "{}", nil
	}

	encoded, err := json.Marshal(metadata)
	if err != nil {
		return "", err
	}

	return string(encoded), nil
}

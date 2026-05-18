package api

import (
	"context"

	"github.com/amir-zouerami/campfire/server/service"
)

/*
recordAuditEvent records an audit event without breaking the user action.

Audit logging should not make a successful product action fail just because the
audit row failed to write.
*/
func recordAuditEvent(
	ctx context.Context,
	auditService *service.AuditService,
	workspaceID string,
	actorUserID string,
	action string,
	entityType string,
	entityID string,
	metadata map[string]string,
) {
	if auditService == nil {
		return
	}

	_, _ = auditService.Record(ctx, service.RecordAuditLogInput{
		WorkspaceID: workspaceID,
		ActorUserID: actorUserID,
		Action:      action,
		EntityType:  entityType,
		EntityID:    entityID,
		Metadata:    metadata,
	})
}

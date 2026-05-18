package api

import (
	"encoding/json"

	"github.com/amir-zouerami/campfire/server/domain"
)

/*
AuditLogEntryPayload is the API representation of one audit-log entry.
*/
type AuditLogEntryPayload struct {
	ID          string            `json:"id"`
	WorkspaceID string            `json:"workspaceId"`
	ActorUserID string            `json:"actorUserId"`
	Action      string            `json:"action"`
	EntityType  string            `json:"entityType"`
	EntityID    string            `json:"entityId"`
	Metadata    map[string]string `json:"metadata"`
	CreatedAt   string            `json:"createdAt"`
}

/*
ListAuditLogResponse is returned by GET /workspaces/{workspaceID}/audit.
*/
type ListAuditLogResponse struct {
	Entries []AuditLogEntryPayload `json:"entries"`
}

/*
AuditLogEntriesToPayload maps audit entries to API payloads.
*/
func AuditLogEntriesToPayload(entries []domain.AuditLogEntry) []AuditLogEntryPayload {
	payloads := make([]AuditLogEntryPayload, 0, len(entries))

	for _, entry := range entries {
		payloads = append(payloads, AuditLogEntryToPayload(entry))
	}

	return payloads
}

/*
AuditLogEntryToPayload maps one audit entry to API payload.
*/
func AuditLogEntryToPayload(entry domain.AuditLogEntry) AuditLogEntryPayload {
	return AuditLogEntryPayload{
		ID:          entry.ID.String(),
		WorkspaceID: entry.WorkspaceID.String(),
		ActorUserID: entry.ActorUserID,
		Action:      entry.Action,
		EntityType:  entry.EntityType,
		EntityID:    entry.EntityID,
		Metadata:    auditMetadataToPayload(entry.MetadataJSON),
		CreatedAt:   formatAPITime(entry.CreatedAt),
	}
}

/*
auditMetadataToPayload decodes stored audit metadata.
*/
func auditMetadataToPayload(metadataJSON string) map[string]string {
	metadata := map[string]string{}

	if metadataJSON == "" {
		return metadata
	}

	if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
		return map[string]string{
			"raw": metadataJSON,
		}
	}

	return metadata
}

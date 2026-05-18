package domain

import "time"

/*
AuditLogEntry records one important Campfire action.
*/
type AuditLogEntry struct {
	ID           ID
	WorkspaceID  ID
	ActorUserID  string
	Action       string
	EntityType   string
	EntityID     string
	MetadataJSON string
	CreatedAt    time.Time
}

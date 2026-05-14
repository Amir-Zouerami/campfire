package domain

/*
ID is a Campfire string identifier.

Campfire uses string IDs so the storage layer can use UUIDs or Mattermost-style
random IDs without leaking implementation details into business logic.
*/
type ID string

/*
String returns the ID as a plain string.
*/
func (id ID) String() string {
	return string(id)
}

package api

import "github.com/amir-zouerami/campfire/server/service"

/*
UserProfilePayload is the API representation of a Mattermost user profile.
*/
type UserProfilePayload struct {
	ID          string `json:"id"`
	Username    string `json:"username"`
	DisplayName string `json:"displayName"`
	Email       string `json:"email"`
}

/*
LookupUsersRequest is accepted by POST /users/lookup.
*/
type LookupUsersRequest struct {
	UserIDs []string `json:"userIds"`
}

/*
LookupUsersResponse is returned by POST /users/lookup.
*/
type LookupUsersResponse struct {
	Users []UserProfilePayload `json:"users"`
}

/*
UserProfilesToPayload maps service user profiles to API payloads.
*/
func UserProfilesToPayload(profiles []service.UserProfile) []UserProfilePayload {
	payloads := make([]UserProfilePayload, 0, len(profiles))

	for _, profile := range profiles {
		payloads = append(payloads, UserProfileToPayload(profile))
	}

	return payloads
}

/*
UserProfileToPayload maps one service user profile to an API payload.
*/
func UserProfileToPayload(profile service.UserProfile) UserProfilePayload {
	return UserProfilePayload{
		ID:          profile.ID,
		Username:    profile.Username,
		DisplayName: profile.DisplayName,
		Email:       profile.Email,
	}
}

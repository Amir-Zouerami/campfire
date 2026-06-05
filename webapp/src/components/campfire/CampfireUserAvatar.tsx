import { useState, type ReactElement } from "react";

import { cn } from "@/lib/utils";

/**
 * CampfireUserAvatarProps contains identity values for a Mattermost avatar.
 */
type CampfireUserAvatarProps = {
  readonly userID: string;
  readonly displayName: string;
  readonly username: string;
  readonly className?: string;
};

/**
 * CampfireUserAvatar renders the Mattermost profile image when available and
 * falls back to initials when the user has no usable profile image.
 */
export function CampfireUserAvatar(
  props: CampfireUserAvatarProps,
): ReactElement {
  const [failed, setFailed] = useState(false);
  const initials = userInitials(props.displayName, props.username);
  const canLoadImage = props.userID.trim() !== "" && !failed;

  return (
    <span
      className={cn("campfire-user-avatar", props.className)}
      aria-label={userLabel(props.displayName, props.username)}
    >
      {canLoadImage ? (
        <img
          src={mattermostProfileImageURL(props.userID)}
          alt=""
          className="campfire-user-avatar-image"
          draggable={false}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="campfire-user-avatar-initials">{initials}</span>
      )}
    </span>
  );
}

/**
 * mattermostProfileImageURL returns the Mattermost webapp avatar endpoint.
 */
function mattermostProfileImageURL(userID: string): string {
  const basename = typeof window.basename === "string" ? window.basename : "";

  return `${basename}/api/v4/users/${encodeURIComponent(userID)}/image`;
}

/**
 * userLabel returns the best accessible label for one user.
 */
function userLabel(displayName: string, username: string): string {
  const cleanDisplayName = displayName.trim();
  if (cleanDisplayName !== "") {
    return cleanDisplayName;
  }

  const cleanUsername = username.trim();
  if (cleanUsername !== "") {
    return cleanUsername;
  }

  return "User";
}

/**
 * userInitials returns two initials for the current-user fallback badge.
 */
function userInitials(displayName: string, username: string): string {
  const source = displayName.trim() !== "" ? displayName : username;
  const words = source.trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0]?.[0] ?? ""}${words[1]?.[0] ?? ""}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase() || "CF";
}

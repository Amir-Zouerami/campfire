import {
  useDeferredValue,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { KeyboardEvent, ReactElement } from "react";
import { Check, ChevronDown, Loader2, Search, UserRound } from "lucide-react";

import { ApiClientError, listWorkspaceMembers } from "@/api";
import type { UserProfile } from "@/types/api";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n";
import { useCampfireFloatingPopover } from "./useCampfireFloatingPopover";

/**
 * CampfireUserPickerProps contains a workspace member search picker.
 */
type CampfireUserPickerProps = {
  readonly workspaceID: string;
  readonly value: string;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly onChange: (userID: string) => void;
};

type LoadState = "idle" | "loading" | "ready" | "error";

/**
 * CampfireUserPicker lets admins choose a workspace member from a searchable,
 * Mattermost-safe combobox without shifting surrounding form layout.
 */
export function CampfireUserPicker(
  props: CampfireUserPickerProps,
): ReactElement {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const [members, setMembers] = useState<readonly UserProfile[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [loadState, setLoadState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");
  const deferredQuery = useDeferredValue(query);
  const { direction, htmlLang, t } = useI18n();

  useEffect(() => {
    let active = true;

    async function loadMembers(): Promise<void> {
      setLoadState("loading");
      setMessage("");

      try {
        const response = await listWorkspaceMembers(props.workspaceID);
        if (!active) {
          return;
        }

        setMembers(response.users);
        setLoadState("ready");
      } catch (error: unknown) {
        if (!active) {
          return;
        }

        setLoadState("error");
        setMessage(errorToMessage(error, t("shared.userPicker.loadError")));
      }
    }

    void loadMembers();

    return () => {
      active = false;
    };
  }, [props.workspaceID, t]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }

    const focusTimer = window.setTimeout(() => searchRef.current?.focus(), 0);

    function handlePointerDown(event: MouseEvent): void {
      if (!(event.target instanceof Node)) {
        return;
      }

      if (rootRef.current !== null && rootRef.current.contains(event.target)) {
        return;
      }

      if (menuRef.current !== null && menuRef.current.contains(event.target)) {
        return;
      }

      setOpen(false);
    }

    function handleEscape(event: globalThis.KeyboardEvent): void {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("mousedown", handlePointerDown, true);
    document.addEventListener("keydown", handleEscape, true);

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("mousedown", handlePointerDown, true);
      document.removeEventListener("keydown", handleEscape, true);
    };
  }, [open]);

  const searchIndex = useMemo(() => buildMemberSearchIndex(members), [members]);
  const selectedUser = useMemo(
    () => members.find((member) => member.id === props.value) ?? null,
    [members, props.value],
  );
  const visibleMembers = useMemo(
    () => filterMembers(searchIndex, deferredQuery).slice(0, 10),
    [deferredQuery, searchIndex],
  );
  const disabled = props.disabled === true || loadState === "loading";
  const generatedID = useId();
  const menuID = `${generatedID}-campfire-user-picker-menu`;
  const floatingPopover = useCampfireFloatingPopover({
    open,
    triggerRef,
    popoverRef: menuRef,
    placement: "bottom-start",
    minHeight: 160,
    maxHeight: 360,
    maxWidth: 560,
    matchTriggerWidth: false,
  });

  function toggleOpen(): void {
    if (disabled) {
      return;
    }

    setOpen((current) => !current);
  }

  function selectMember(member: UserProfile): void {
    props.onChange(member.id);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>): void {
    switch (event.key) {
      case "ArrowDown":
      case "Enter":
      case " ":
        event.preventDefault();
        setOpen(true);
        break;

      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
    }
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        "campfire-user-picker",
        open && "campfire-user-picker--open",
      )}
    >
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={menuID}
        className="campfire-control-trigger campfire-user-picker-trigger"
        onClick={toggleOpen}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="campfire-user-picker-trigger-icon" aria-hidden="true">
          {loadState === "loading" ? (
            <Loader2 className="cf:size-4 cf:animate-spin" />
          ) : (
            <UserRound className="cf:size-4" />
          )}
        </span>
        <span className="campfire-user-picker-trigger-copy">
          <strong>
            <bdi dir="auto">
              {selectedUser === null
                ? (props.placeholder ?? t("shared.userPicker.placeholder"))
                : profileLabel(selectedUser)}
            </bdi>
          </strong>
          <small>
            <bdi dir="auto">
              {selectedUser === null
                ? t("shared.userPicker.searchHint")
                : profileSecondaryLabel(selectedUser)}
            </bdi>
          </small>
        </span>
        <ChevronDown
          className={cn(
            "cf:size-4 cf:flex-none cf:text-amber-200 cf:transition-transform",
            open && "cf:rotate-180",
          )}
        />
      </button>

      {open && floatingPopover.portalHost !== null && createPortal((
        <div
          ref={menuRef}
          id={menuID}
          dir={direction}
          lang={htmlLang}
          className="campfire-picker-portal-scope campfire-user-picker-menu campfire-floating-popover"
          role="listbox"
          aria-label={t("shared.userPicker.resultsLabel")}
          style={floatingPopover.style}
        >
          <label className="campfire-user-picker-search">
            <Search className="cf:size-4" aria-hidden="true" />
            <input
              ref={searchRef}
              type="search"
              disabled={disabled}
              placeholder={t("shared.userPicker.searchPlaceholder")}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              onKeyDown={(event) => event.stopPropagation()}
            />
          </label>

          {visibleMembers.map((member) => {
            const selected = member.id === props.value;

            return (
              <button
                key={member.id}
                type="button"
                role="option"
                aria-selected={selected}
                disabled={disabled}
                className={cn(
                  "campfire-user-picker-option",
                  selected && "campfire-user-picker-option--selected",
                )}
                onClick={() => selectMember(member)}
              >
                <span>
                  <strong>
                    <bdi dir="auto">{profileLabel(member)}</bdi>
                  </strong>
                  <small>
                    <bdi dir="auto">{profileSecondaryLabel(member)}</bdi>
                  </small>
                </span>
                {selected && (
                  <Check
                    className="cf:size-4 cf:flex-none cf:text-amber-200"
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}

          {loadState === "ready" && visibleMembers.length === 0 && (
            <p className="campfire-user-picker-message">
              {t("shared.userPicker.noResults")}
            </p>
          )}

          {message !== "" && (
            <p className="campfire-user-picker-message campfire-user-picker-message--error">
              {message}
            </p>
          )}
        </div>
      ), floatingPopover.portalHost)}
    </div>
  );
}

/**
 * profileLabel returns the best readable label for one Mattermost user.
 */
function profileLabel(profile: UserProfile): string {
  const displayName = profile.displayName.trim();
  if (displayName !== "") {
    return displayName;
  }

  const username = profile.username.trim();
  if (username !== "") {
    return username;
  }

  return profile.id;
}

/**
 * profileSecondaryLabel returns the compact secondary identity for one user.
 */
function profileSecondaryLabel(profile: UserProfile): string {
  const username = profile.username.trim();
  if (username !== "") {
    return `@${username}`;
  }

  const email = profile.email.trim();
  if (email !== "") {
    return email;
  }

  return profile.id;
}

/**
 * MemberSearchEntry stores one member with pre-normalized search text.
 */
type MemberSearchEntry = {
  readonly member: UserProfile;
  readonly searchText: string;
};

/**
 * buildMemberSearchIndex pre-normalizes member identity fields once per load.
 */
function buildMemberSearchIndex(
  members: readonly UserProfile[],
): readonly MemberSearchEntry[] {
  return members.map((member) => ({
    member,
    searchText: [member.id, member.username, member.displayName, member.email]
      .join(" ")
      .toLowerCase(),
  }));
}

/**
 * filterMembers searches pre-indexed user identity fields locally.
 */
function filterMembers(
  entries: readonly MemberSearchEntry[],
  query: string,
): readonly UserProfile[] {
  const cleanQuery = query.trim().toLowerCase();

  if (cleanQuery === "") {
    return entries.map((entry) => entry.member);
  }

  const matches: UserProfile[] = [];

  for (const entry of entries) {
    if (!entry.searchText.includes(cleanQuery)) {
      continue;
    }

    matches.push(entry.member);

    if (matches.length >= 10) {
      break;
    }
  }

  return matches;
}

/**
 * errorToMessage converts unknown errors to safe picker text.
 */
function errorToMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return fallback;
}

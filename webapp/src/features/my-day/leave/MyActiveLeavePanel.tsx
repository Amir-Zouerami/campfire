import type { ReactElement } from "react";
import { Ban, Umbrella } from "lucide-react";

import { Button } from "@/components/ui/button";
import { sortByNewest } from "@/lib/sort";
import type { LeaveRequest, PendingLeaveRequest } from "@/types/domain";

import {
  formatLeaveDurationDetails,
  formatLeaveRange,
  formatLeaveStatus,
  leaveStatusTone,
} from "./my-leave.helpers";
import {
  CampfireEmpty,
  CampfireStatusPill,
} from "@/components/campfire/CampfireLayoutPrimitives";

/**
 * MyActiveLeavePanelProps contains the current user's active leave requests.
 */
type MyActiveLeavePanelProps = {
  readonly leaveRequests: readonly PendingLeaveRequest[];
  readonly disabled: boolean;
  readonly timezone: string;
  readonly onCancel: (leaveRequestId: string) => Promise<void>;
};

/**
 * MyActiveLeavePanel renders the current user's pending and approved leave requests.
 */
export function MyActiveLeavePanel(
  props: MyActiveLeavePanelProps,
): ReactElement {
  const leaveRequests = sortByNewest(props.leaveRequests, (item) =>
    newestLeaveDateValue(item.leaveRequest),
  );

  return (
    <section className="campfire-flat-work-panel">
      <div>
        <p className="campfire-page-eyebrow">My active leave</p>
        <h3 className="campfire-surface-title">
          Pending and approved requests
        </h3>
      </div>

      {leaveRequests.length === 0 ? (
        <CampfireEmpty
          icon={Umbrella}
          title="No active leave"
          description="Pending and approved leave requests will appear here."
        />
      ) : (
        <div className="cf:grid cf:gap-3">
          {leaveRequests.map((item) => (
            <ActiveLeaveRow
              key={item.leaveRequest.id}
              item={item}
              disabled={props.disabled}
              timezone={props.timezone}
              onCancel={() => props.onCancel(item.leaveRequest.id)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * newestLeaveDateValue returns the newest meaningful timestamp for sorting leave rows.
 */
function newestLeaveDateValue(request: LeaveRequest): string {
  return (
    request.updatedAt ||
    request.createdAt ||
    request.startDate ||
    request.endDate
  );
}

/**
 * ActiveLeaveRow renders one personal leave request.
 */
function ActiveLeaveRow(props: {
  readonly item: PendingLeaveRequest;
  readonly disabled: boolean;
  readonly timezone: string;
  readonly onCancel: () => Promise<void>;
}): ReactElement {
  const request = props.item.leaveRequest;
  const cancellationLocked = isApprovedLeaveCancellationLocked(
    request,
    props.timezone,
  );
  const cancelDisabled = props.disabled || cancellationLocked;
  const cancelTitle = cancellationLocked
    ? "Approved leave can no longer be cancelled after its start time has passed."
    : undefined;

  return (
    <article className="campfire-flat-list-row campfire-flat-list-row--with-action">
      <div className="cf:min-w-0">
        <div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
          <h4 className="cf:min-w-0 cf:truncate cf:text-base cf:font-semibold cf:text-foreground">
            {props.item.leaveTypeName}
          </h4>
          <CampfireStatusPill tone={leaveStatusTone(request.status)}>
            {formatLeaveStatus(request.status)}
          </CampfireStatusPill>
        </div>

        <p className="cf:mt-2 cf:text-sm cf:font-semibold cf:leading-6 cf:text-muted-foreground">
          {formatLeaveRange(request)} · {formatLeaveDurationDetails(request)}
        </p>

        <div className="cf:mt-3 cf:flex cf:flex-wrap cf:gap-2">
          <LeaveMetaChip label="Backup" value={request.backupUserId} />
          <LeaveMetaChip label="Reason" value={request.reason} />
        </div>
      </div>

      <div className="cf:flex cf:items-start cf:justify-end">
        <Button
          type="button"
          variant="secondary"
          disabled={cancelDisabled}
          title={cancelTitle}
          onClick={() => void props.onCancel()}
        >
          <Ban className="cf:size-4" />
          Cancel
        </Button>
      </div>
    </article>
  );
}

/**
 * LeaveMetaChip renders optional leave metadata.
 */
function LeaveMetaChip(props: {
  readonly label: string;
  readonly value: string;
}): ReactElement | null {
  if (props.value.trim() === "") {
    return null;
  }

  return (
    <span className="cf:max-w-full cf:truncate cf:rounded-full cf:border cf:border-emerald-300/20 cf:bg-emerald-300/10 cf:px-2.5 cf:py-1 cf:text-xs cf:font-semibold cf:text-emerald-100">
      {props.label}: {props.value}
    </span>
  );
}

/**
 * isApprovedLeaveCancellationLocked returns true once an approved leave request
 * has started in the workspace timezone. Pending requests remain cancellable.
 */
function isApprovedLeaveCancellationLocked(
  request: LeaveRequest,
  timezone: string,
): boolean {
  if (request.status !== "approved") {
    return false;
  }

  const startAt = getLeaveStartDateTime(request, timezone);
  if (startAt === null) {
    return false;
  }

  return Date.now() >= startAt.getTime();
}

/**
 * getLeaveStartDateTime returns the first instant covered by a leave request.
 */
function getLeaveStartDateTime(
  request: LeaveRequest,
  timezone: string,
): Date | null {
  let timeOfDay = "00:00";

  if (request.durationMode === "hourly" && request.startTime.trim() !== "") {
    timeOfDay = request.startTime;
  }

  if (
    request.durationMode === "half_day" &&
    request.halfDayPart === "afternoon"
  ) {
    timeOfDay = "12:00";
  }

  return zonedDateTimeToDate(request.startDate, timeOfDay, timezone);
}

/**
 * zonedDateTimeToDate converts a workspace-local YYYY-MM-DD and HH:mm value to
 * an absolute Date without relying on the browser's local timezone.
 */
function zonedDateTimeToDate(
  dateValue: string,
  timeValue: string,
  timezone: string,
): Date | null {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue.trim());
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue.trim());
  if (dateMatch === null || timeMatch === null) {
    return null;
  }

  const year = Number.parseInt(dateMatch[1] ?? "", 10);
  const month = Number.parseInt(dateMatch[2] ?? "", 10);
  const day = Number.parseInt(dateMatch[3] ?? "", 10);
  const hour = Number.parseInt(timeMatch[1] ?? "", 10);
  const minute = Number.parseInt(timeMatch[2] ?? "", 10);
  if (![year, month, day, hour, minute].every(Number.isFinite)) {
    return null;
  }

  const targetUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  let candidate = new Date(targetUtc);

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const localParts = getDateTimePartsInTimezone(candidate, timezone);
    if (localParts === null) {
      return null;
    }

    const localAsUtc = Date.UTC(
      localParts.year,
      localParts.month - 1,
      localParts.day,
      localParts.hour,
      localParts.minute,
      0,
    );
    candidate = new Date(targetUtc - (localAsUtc - candidate.getTime()));
  }

  return candidate;
}

/**
 * getDateTimePartsInTimezone formats an instant into numeric date/time parts for
 * one IANA timezone.
 */
function getDateTimePartsInTimezone(
  date: Date,
  timezone: string,
): {
  readonly year: number;
  readonly month: number;
  readonly day: number;
  readonly hour: number;
  readonly minute: number;
} | null {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    const parts = Object.fromEntries(
      formatter.formatToParts(date).map((part) => [part.type, part.value]),
    );

    return {
      year: Number.parseInt(parts.year ?? "", 10),
      month: Number.parseInt(parts.month ?? "", 10),
      day: Number.parseInt(parts.day ?? "", 10),
      hour: Number.parseInt(parts.hour ?? "", 10),
      minute: Number.parseInt(parts.minute ?? "", 10),
    };
  } catch {
    return null;
  }
}

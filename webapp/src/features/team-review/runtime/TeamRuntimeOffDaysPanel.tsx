import type { ReactElement } from "react";
import { CalendarX2, Globe2 } from "lucide-react";

import { sortByNewest } from "@/lib/sort";
import type { GlobalSkipDate, WorkspaceOffDay } from "@/types/domain";

import {
  formatDateTime,
  formatGlobalOffDay,
  formatWorkspaceOffDay,
} from "./team-runtime.helpers";
import {
  CampfireEmpty,
  CampfireStatusPill,
} from "@/components/campfire/CampfireLayoutPrimitives";

/**
 * TeamRuntimeOffDaysPanelProps contains global and workspace off-day matches.
 */
type TeamRuntimeOffDaysPanelProps = {
  readonly globalOffDays: readonly GlobalSkipDate[];
  readonly workspaceOffDays: readonly WorkspaceOffDay[];
};

/**
 * TeamRuntimeOffDaysPanel renders off-day matches that can skip standup automation.
 */
export function TeamRuntimeOffDaysPanel(
  props: TeamRuntimeOffDaysPanelProps,
): ReactElement {
  const globalOffDays = sortByNewest(
    props.globalOffDays,
    (offDay) => offDay.date || offDay.createdAt,
  );
  const workspaceOffDays = sortByNewest(
    props.workspaceOffDays,
    (offDay) => offDay.date || offDay.createdAt,
  );
  const hasNoOffDays =
    globalOffDays.length === 0 && workspaceOffDays.length === 0;

  return (
    <section className="cf:grid cf:gap-4 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-white/[0.035] cf:p-5">
      <div>
        <p className="cf:text-sm cf:font-semibold cf:uppercase cf:tracking-[0.18em] cf:text-amber-100">
          Off-day matches
        </p>
        <h3 className="cf:mt-1 cf:text-xl cf:font-semibold cf:tracking-[-0.03em] cf:text-foreground">
          Global and workspace skip dates
        </h3>
      </div>

      {hasNoOffDays ? (
        <CampfireEmpty
          icon={CalendarX2}
          title="No off-day matches"
          description="The selected date is not blocked by global or workspace off-days."
        />
      ) : (
        <div className="cf:grid cf:gap-3">
          {globalOffDays.map((offDay) => (
            <OffDayRow
              key={`global-${offDay.id}`}
              icon="global"
              title={formatGlobalOffDay(offDay)}
              createdAt={offDay.createdAt}
            />
          ))}

          {workspaceOffDays.map((offDay) => (
            <OffDayRow
              key={`workspace-${offDay.id}`}
              icon="workspace"
              title={formatWorkspaceOffDay(offDay)}
              createdAt={offDay.createdAt}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/**
 * OffDayRow renders one matched off-day.
 */
function OffDayRow(props: {
  readonly icon: "global" | "workspace";
  readonly title: string;
  readonly createdAt: string;
}): ReactElement {
  const Icon = props.icon === "global" ? Globe2 : CalendarX2;

  return (
    <article className="cf:flex cf:flex-col cf:gap-3 cf:rounded-2xl cf:border cf:border-white/10 cf:bg-black/20 cf:p-4 cf:sm:flex-row cf:sm:items-start cf:sm:justify-between">
      <div className="cf:min-w-0">
        <div className="cf:flex cf:flex-wrap cf:items-center cf:gap-2">
          <Icon className="cf:size-4 cf:text-amber-200" />
          <strong className="cf:min-w-0 cf:truncate cf:text-base cf:font-semibold cf:text-foreground">
            {props.title}
          </strong>
        </div>
        <p className="cf:mt-2 cf:text-xs cf:font-bold cf:text-muted-foreground">
          Created {formatDateTime(props.createdAt)}
        </p>
      </div>

      <CampfireStatusPill tone="red">Skip signal</CampfireStatusPill>
    </article>
  );
}

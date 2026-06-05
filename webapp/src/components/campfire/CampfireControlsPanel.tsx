import type { ReactElement, ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * CampfireControlsPanelProps contains one focused filter/control surface.
 */
export type CampfireControlsPanelProps = {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly controls: ReactNode;
  readonly children?: ReactNode;
  readonly className?: string;
  readonly id?: string;
};

/**
 * CampfireControlsPanel separates explanatory copy from date/select filters.
 */
export function CampfireControlsPanel(
  props: CampfireControlsPanelProps,
): ReactElement {
  const titleID =
    props.id ??
    `campfire-controls-panel-${props.eyebrow.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <section
      className={cn("campfire-controls-panel", props.className)}
      aria-labelledby={titleID}
    >
      <div className="campfire-controls-panel-header">
        <p className="campfire-controls-panel-eyebrow">{props.eyebrow}</p>
        <h3 id={titleID}>{props.title}</h3>
        <p>{props.description}</p>
      </div>

      <div className="campfire-controls-panel-controls">{props.controls}</div>

      {props.children !== undefined && (
        <div className="campfire-controls-panel-body">{props.children}</div>
      )}
    </section>
  );
}

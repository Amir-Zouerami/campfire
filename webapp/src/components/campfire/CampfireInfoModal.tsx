import type { ReactElement, ReactNode } from "react";
import { X } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * CampfireInfoModalProps contains one inline, non-portal help modal.
 */
export type CampfireInfoModalProps = {
  readonly title: string;
  readonly description: string;
  readonly open: boolean;
  readonly children: ReactNode;
  readonly onClose: () => void;
};

/**
 * CampfireInfoModal renders documentation inside the Campfire modal tree without a body portal.
 */
export function CampfireInfoModal(
  props: CampfireInfoModalProps,
): ReactElement | null {
  if (!props.open) {
    return null;
  }

  return (
    <div
      className="campfire-info-modal-layer"
      role="presentation"
      onMouseDown={props.onClose}
    >
      <section
        className="campfire-info-modal"
        role="dialog"
        aria-modal="true"
        aria-label={props.title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="campfire-info-modal-header">
          <div>
            <p className="campfire-info-modal-eyebrow">Help</p>
            <h3>{props.title}</h3>
            <p>{props.description}</p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="icon-sm"
            aria-label="Close help"
            onClick={props.onClose}
          >
            <X className="cf:size-4" />
          </Button>
        </header>

        <div className="campfire-info-modal-body">{props.children}</div>
      </section>
    </div>
  );
}

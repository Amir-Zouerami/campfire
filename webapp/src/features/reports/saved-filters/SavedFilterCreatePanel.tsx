import type { FormEvent, ReactElement } from "react";
import { Plus } from "lucide-react";

import { CampfireField } from "@/components/campfire/CampfireField";
import { CampfireSelect } from "@/components/campfire/CampfireSelect";
import {
  CampfireResponsiveInput,
  CampfireResponsiveTextarea,
} from "@/components/campfire/CampfireResponsiveInput";
import { Button } from "@/components/ui/button";

import {
  formatReportKind,
  savedFilterReportKinds,
  toReportKind,
} from "./saved-filters.helpers";
import { SavedFilterJsonHelpButton } from "./SavedFilterJsonHelpButton";
import type {
  SavedFilterDraft,
  SavedFilterDraftPatch,
} from "./saved-filters.types";

/**
 * SavedFilterCreatePanelProps contains saved-filter form state and actions.
 */
type SavedFilterCreatePanelProps = {
  readonly draft: SavedFilterDraft;
  readonly disabled: boolean;
  readonly onChange: (patch: SavedFilterDraftPatch) => void;
  readonly onCreate: () => Promise<void>;
};

/**
 * SavedFilterCreatePanel renders the create saved-filter form.
 */
export function SavedFilterCreatePanel(
  props: SavedFilterCreatePanelProps,
): ReactElement {
  /**
   * handleSubmit creates a saved filter.
   */
  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void props.onCreate();
  }

  return (
    <form
      className="campfire-flat-work-panel campfire-flat-work-panel--form"
      onSubmit={handleSubmit}
    >
      <div>
        <p className="campfire-page-eyebrow">Create filter</p>
        <h3 className="campfire-surface-title">Save a report view</h3>
      </div>

      <div className="cf:grid cf:gap-4">
        <CampfireField id="campfire-saved-filter-name" label="Name">
          <CampfireResponsiveInput
            id="campfire-saved-filter-name"
            disabled={props.disabled}
            placeholder="Daily missing-first review"
            value={props.draft.name}
            onValueChange={(value) => props.onChange({ name: value })}
          />
        </CampfireField>

        <CampfireField id="campfire-saved-filter-type" label="Report type">
          <CampfireSelect
            id="campfire-saved-filter-type"
            disabled={props.disabled}
            value={props.draft.reportType}
            onValueChange={(value) =>
              props.onChange({ reportType: toReportKind(value) })
            }
          >
            {savedFilterReportKinds.map((reportKind) => (
              <option key={reportKind} value={reportKind}>
                {formatReportKind(reportKind)}
              </option>
            ))}
          </CampfireSelect>
        </CampfireField>

        <CampfireField
          id="campfire-saved-filter-json"
          label="Filter JSON"
          labelAction={<SavedFilterJsonHelpButton />}
          description="Advanced saved-filter settings. Use the help button for examples you can copy and edit."
        >
          <CampfireResponsiveTextarea
            id="campfire-saved-filter-json"
            disabled={props.disabled}
            value={props.draft.filterJson}
            onValueChange={(value) => props.onChange({ filterJson: value })}
          />
        </CampfireField>
      </div>

      <div className="cf:flex cf:justify-end">
        <Button type="submit" disabled={props.disabled}>
          <Plus className="cf:size-4" />
          Save filter
        </Button>
      </div>
    </form>
  );
}

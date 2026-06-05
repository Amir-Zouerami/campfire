import { useState, type ReactElement } from "react";
import { Info } from "lucide-react";

import { CampfireInfoModal } from "@/components/campfire/CampfireInfoModal";
import { Button } from "@/components/ui/button";

/**
 * SavedFilterJsonHelpButton opens non-technical guidance for saved-filter JSON.
 */
export function SavedFilterJsonHelpButton(): ReactElement {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="xs"
        className="campfire-field-info-button"
        onClick={() => setOpen(true)}
      >
        <Info className="cf:size-4" />
        How to use
      </Button>

      <CampfireInfoModal
        open={open}
        title="How saved report filters work"
        description="A saved filter stores the same dates, sort mode, and grouping choices you normally set in a report screen. You can paste one of these examples, change the values, then save it."
        onClose={() => setOpen(false)}
      >
        <div className="campfire-json-help-grid">
          <HelpExample
            title="Daily report"
            description="Use this when you want one daily Markdown preview with a fixed date and sort mode."
            code={`{
  "occurrenceDate": "2026-06-04",
  "sortMode": "first_submitted"
}`}
          />

          <HelpExample
            title="Weekly report"
            description="Use this for a weekly Markdown preview across a date range."
            code={`{
  "periodStart": "2026-06-01",
  "periodEnd": "2026-06-07",
  "sortMode": "blockers_first"
}`}
          />

          <HelpExample
            title="Time report"
            description="Use this for grouped time totals. Group by person, project, category, task, day, or week."
            code={`{
  "startDate": "2026-05-21",
  "endDate": "2026-06-04",
  "groupBy": "person"
}`}
          />

          <HelpExample
            title="Missing standups"
            description="Use this when the view is focused on missing submissions for a date window."
            code={`{
  "startDate": "2026-06-01",
  "endDate": "2026-06-07",
  "sortMode": "missing_first"
}`}
          />

          <HelpExample
            title="Blockers"
            description="Use this for blocker-focused review where blocked work should rise to the top."
            code={`{
  "startDate": "2026-06-01",
  "endDate": "2026-06-07",
  "sortMode": "blockers_first",
  "includeBlockers": true
}`}
          />
        </div>
      </CampfireInfoModal>
    </>
  );
}

/**
 * HelpExample renders one copyable saved-filter JSON example.
 */
function HelpExample(props: {
  readonly title: string;
  readonly description: string;
  readonly code: string;
}): ReactElement {
  return (
    <article className="campfire-json-help-example">
      <h4>{props.title}</h4>
      <p>{props.description}</p>
      <pre>
        <code>{props.code}</code>
      </pre>
    </article>
  );
}

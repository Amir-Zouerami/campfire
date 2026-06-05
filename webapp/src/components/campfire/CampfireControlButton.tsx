import type { ComponentProps, ReactElement } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * CampfireControlButtonProps contains one action button used beside filters and date controls.
 */
export type CampfireControlButtonProps = ComponentProps<typeof Button>;

/**
 * CampfireControlButton renders a button with the same height as Campfire inputs and selects.
 */
export function CampfireControlButton({
  className,
  ...props
}: CampfireControlButtonProps): ReactElement {
  return (
    <Button className={cn("campfire-control-button", className)} {...props} />
  );
}

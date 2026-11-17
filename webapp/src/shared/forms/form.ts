import { createFormHookContexts } from '@tanstack/react-form';

/**
 * Campfire's form contexts. Field components read the active field through
 * `useFieldContext`, and form-level components read the form through `useFormContext`.
 */
export const { fieldContext, formContext, useFieldContext, useFormContext } = createFormHookContexts();

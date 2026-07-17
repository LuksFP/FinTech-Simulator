import { useState, useCallback } from 'react';

/**
 * Lets a dialog component be driven either by its own internal state (default)
 * or by a parent through `open`/`onOpenChange` props. Used so the dashboard can
 * group several dialogs behind dropdown menus without nesting DialogTrigger
 * inside DropdownMenuItem (which breaks Radix focus management).
 */
export function useControlledDialog(
  controlledOpen?: boolean,
  onOpenChange?: (open: boolean) => void
) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;

  const setOpen = useCallback(
    (value: boolean) => {
      if (!isControlled) setInternalOpen(value);
      onOpenChange?.(value);
    },
    [isControlled, onOpenChange]
  );

  return { open, setOpen, isControlled };
}

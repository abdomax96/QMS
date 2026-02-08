import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface KeyboardOptions {
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  preventDefault?: boolean;
}

/**
 * Hook for handling keyboard shortcuts
 * @param key - key to listen for
 * @param handler - callback function
 * @param options - modifier keys and options
 */
function useKeyboard(
  key: string,
  handler: KeyHandler,
  options: KeyboardOptions = {}
): void {
  const { ctrl = false, shift = false, alt = false, meta = false, preventDefault = true } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const matchesKey = event.key.toLowerCase() === key.toLowerCase();
      const matchesCtrl = ctrl ? event.ctrlKey : !event.ctrlKey;
      const matchesShift = shift ? event.shiftKey : !event.shiftKey;
      const matchesAlt = alt ? event.altKey : !event.altKey;
      const matchesMeta = meta ? event.metaKey : !event.metaKey;

      if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
        if (preventDefault) {
          event.preventDefault();
        }
        handler(event);
      }
    },
    [key, handler, ctrl, shift, alt, meta, preventDefault]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Hook for handling multiple keyboard shortcuts
 * @param shortcuts - map of key combinations to handlers
 */
function useKeyboardShortcuts(
  shortcuts: Record<string, { handler: KeyHandler; options?: KeyboardOptions }>
): void {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      for (const [key, { handler, options = {} }] of Object.entries(shortcuts)) {
        const { ctrl = false, shift = false, alt = false, meta = false, preventDefault = true } = options;

        const matchesKey = event.key.toLowerCase() === key.toLowerCase();
        const matchesCtrl = ctrl ? event.ctrlKey : !event.ctrlKey;
        const matchesShift = shift ? event.shiftKey : !event.shiftKey;
        const matchesAlt = alt ? event.altKey : !event.altKey;
        const matchesMeta = meta ? event.metaKey : !event.metaKey;

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
          if (preventDefault) {
            event.preventDefault();
          }
          handler(event);
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export { useKeyboard, useKeyboardShortcuts };
export default useKeyboard;

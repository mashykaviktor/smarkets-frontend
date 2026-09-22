/**
 * A quiet, honest notice when the quotes poll has backed off after a 429 —
 * `aria-live="polite"` so screen reader users get the same information
 * sighted users see from the visible badge, without a running commentary
 * on every 5s poll (which would be a genuinely bad experience for a
 * screen reader user, not just an unnecessary one).
 */
export function ThrottledNotice({ isThrottled }: { isThrottled: boolean }) {
  return (
    <div aria-live="polite" className="text-xs">
      {isThrottled && (
        <p className="rounded-md bg-amber-50 px-2 py-1 text-amber-700">
          Prices throttled — updating every 30s instead of 5s.
        </p>
      )}
    </div>
  );
}

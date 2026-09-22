/**
 * A single shared, visually-hidden `aria-live="polite"` region announcing
 * "Prices updated" once per successful poll — throttled to the same 5s/30s
 * cadence as `usePriceRefresh`, never one announcement per contract/tick
 * (which would be unusable for a screen reader user). Remounted via a
 * `key` tied to `updatedAt` so identical repeated text still re-announces;
 * without it, setting the same string twice wouldn't trigger most screen
 * readers a second time.
 */
export function PriceUpdateAnnouncer({ updatedAt }: { updatedAt: number }) {
  return (
    <div aria-live="polite" className="sr-only">
      {updatedAt > 0 && <p key={updatedAt}>Prices updated</p>}
    </div>
  );
}

import { useEffect, useRef } from "react";

interface LongWaitPanelProps {
  onKeepWaiting: () => void;
  onRetry: () => void;
  onCancel: () => void;
  onManual: () => void;
}

export function LongWaitPanel({ onKeepWaiting, onRetry, onCancel, onManual }: LongWaitPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section className="long-wait-panel" role="status" aria-live="polite" aria-labelledby="long-wait-heading">
      <h2 id="long-wait-heading" ref={headingRef} tabIndex={-1}>This is taking longer than usual</h2>
      <p>Your image and message are still safe.</p>
      <div className="action-group">
        <button type="button" onClick={onKeepWaiting}>Keep waiting</button>
        <button type="button" onClick={onRetry}>Retry analysis</button>
        <button type="button" onClick={onCancel} aria-label="Cancel image analysis">Cancel</button>
        <button type="button" onClick={onManual}>Enter details manually</button>
      </div>
    </section>
  );
}

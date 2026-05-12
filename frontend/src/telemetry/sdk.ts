/**
 * Telemetry SDK
 * Captures all user interactions and batches them to the Event Gateway.
 */

const SESSION_ID = crypto.randomUUID();
const GATEWAY_URL = import.meta.env.VITE_EVENT_GATEWAY_URL || 'http://localhost:3002';

interface TelemetryEvent {
  event_type: string;
  app_id: string;
  context?: Record<string, unknown>;
}

const queue: TelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function flush() {
  if (queue.length === 0) return;
  const batch = queue.splice(0, queue.length);
  const enriched = batch.map(e => ({
    ...e,
    session_id: SESSION_ID,
    user_id: 'user-demo',
    tenant_id: 'tenant-demo',
  }));
  // Fire-and-forget
  fetch(`${GATEWAY_URL}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(enriched),
    keepalive: true,
  }).catch(() => { /* silent */ });
  flushTimer = null;
}

export function track(event: TelemetryEvent) {
  queue.push(event);
  // Debounce: flush 2 seconds after last event, or immediately if batch >= 20
  if (queue.length >= 20) {
    if (flushTimer) clearTimeout(flushTimer);
    flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flush, 2000);
  }
}

// Flush on page unload
window.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flush();
});

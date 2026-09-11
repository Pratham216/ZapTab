/**
 * ZapTab Client Telemetry & Funnel Analytics
 * Lightweight event tracker for measuring drop-offs in the user funnel.
 */

export type AnalyticsEvent =
  | "app_opened"
  | "receipt_scan_started"
  | "receipt_scan_completed"
  | "receipt_scan_failed"
  | "room_created"
  | "room_joined"
  | "item_selected"
  | "upi_clicked"
  | "payment_marked_paid"
  | "room_completed";

export function trackEvent(event: AnalyticsEvent, payload: Record<string, unknown> = {}) {
  const timestamp = new Date().toISOString();
  
  if (import.meta.env.DEV) {
    console.log(`[ZapTab Analytics] 🚀 ${event}`, { ...payload, timestamp });
  }

  // Safe fallback if an analytics provider (PostHog, Mixpanel, Segment, custom backend) is attached
  try {
    if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).gtag) {
      const gtag = (window as unknown as Record<string, unknown>).gtag as Function;
      gtag("event", event, payload);
    }
  } catch (err) {
    // Prevent analytics errors from ever interrupting user experience
    if (import.meta.env.DEV) {
      console.warn("[ZapTab Analytics Error]", err);
    }
  }
}

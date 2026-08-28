import type { ConsumerRefundState } from "@/services/consumer-refund";

export function EventTimeline({ events }: { events: ConsumerRefundState["timeline"] }) {
  return (
    <section className="timeline-section" aria-labelledby="timeline-heading">
      <div className="timeline-header-row">
        <div>
          <p className="section-number">Persisted audit events</p>
          <h2 id="timeline-heading" className="section-title font-editorial">System activity</h2>
        </div>
        <div className="citizen-action-pill" role="status">
          <span className="action-pill-label">Reapplications:</span>
          <span className="action-pill-val">0</span>
        </div>
      </div>
      <ol className="timeline-list">
        {events.map((event, index) => (
          <li key={event.id}>
            <span className="timeline-index currency">{String(index + 1).padStart(2, "0")}</span>
            <div className="timeline-entry">
              <p className="timeline-msg">{event.message}</p>
              <time className="timeline-time currency" dateTime={event.timestamp}>
                {new Intl.DateTimeFormat("en-IN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  timeZone: "Asia/Kolkata",
                }).format(new Date(event.timestamp))} IST
              </time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

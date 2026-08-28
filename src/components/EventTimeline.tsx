import type { ConsumerRefundState } from "@/services/consumer-refund";

export function EventTimeline({ events }: { events: ConsumerRefundState["timeline"] }) {
  return (
    <section className="timeline-section" aria-labelledby="timeline-heading">
      <p className="section-number">04 / Audit trail</p>
      <h2 id="timeline-heading" className="section-title font-editorial">What happened, in order</h2>
      <ol className="timeline-list">
        {events.map((event, index) => (
          <li key={event.id}>
            <span className="timeline-index currency">{String(index + 1).padStart(2, "0")}</span>
            <div><p>{event.message}</p><time dateTime={event.timestamp}>{new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }).format(new Date(event.timestamp))}</time></div>
          </li>
        ))}
      </ol>
    </section>
  );
}

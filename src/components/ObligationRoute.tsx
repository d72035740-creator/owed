import type { ConsumerRefundState } from "@/services/consumer-refund";

export function ObligationRoute({ state }: { state: ConsumerRefundState }) {
  const destinationDone = state.destination.validationStatus === "VALIDATED";
  const checksDone =
    state.checks.length > 0 && state.checks.every((check) => check.passed);
  const paymentActive =
    state.technical.retryStatus === "SCHEDULED" ||
    state.technical.retryStatus === "PROCESSING";
  const completed = state.refund.status === "COMPLETED";
  const steps = [
    {
      label: "Obligation",
      value: completed ? "Completed" : "₹23,740 owed",
      state: completed ? "done" : "active",
    },
    {
      label: "Destination",
      value: destinationDone
        ? "HDFC validated"
        : state.destination.validationStatus === "VALIDATING"
          ? "Validating"
          : "Action needed",
      state: destinationDone ? "done" : "active",
    },
    {
      label: "Safety checks",
      value: checksDone ? "Passed" : "Waiting",
      state: checksDone ? "done" : "waiting",
    },
    {
      label: "Payment",
      value: completed
        ? "Delivered"
        : paymentActive
          ? state.technical.retryStatus
          : "Waiting",
      state: completed ? "done" : paymentActive ? "active" : "waiting",
    },
  ];
  const latestEvent = state.timeline.at(-1);

  return (
    <section className="obligation-route" aria-label="Live refund status">
      <div className="route-heading">
        <span className="live-indicator" aria-hidden="true" /> Live case status
      </div>
      <ol>
        {steps.map((step) => (
          <li key={step.label} data-state={step.state}>
            <span className="route-node" aria-hidden="true">
              {step.state === "done" ? "✓" : ""}
            </span>
            <span>
              <b>{step.label}</b>
              <small>{step.value}</small>
            </span>
          </li>
        ))}
      </ol>
      {latestEvent ? (
        <p className="latest-event" aria-live="polite">
          <span>Latest event</span>
          {latestEvent.message}
        </p>
      ) : null}
    </section>
  );
}

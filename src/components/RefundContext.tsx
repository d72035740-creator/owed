import type { ConsumerRefundState } from "@/services/consumer-refund";

export function RefundContext({ state }: { state: ConsumerRefundState }) {
  return (
    <section className="context-section" aria-labelledby="what-happened">
      <div>
        <p className="section-number">01 / What happened</p>
        <h2 id="what-happened" className="section-title font-editorial">The refund exists. Its delivery failed.</h2>
      </div>
      <dl className="context-facts">
        <div><dt>Previous destination</dt><dd>{state.previousPayment.bankName} {state.previousPayment.maskedAccount}</dd></div>
        <div><dt>Delivery</dt><dd className="failure-text">Failed</dd></div>
        <div><dt>Reason</dt><dd>{state.previousPayment.reason}</dd></div>
        <div><dt>Government obligation</dt><dd>{state.refund.status === "COMPLETED" ? "Completed" : "Still owed"}</dd></div>
      </dl>
    </section>
  );
}

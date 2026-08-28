import type { ConsumerRefundState } from "@/services/consumer-refund";

export function RefundContext({ state }: { state: ConsumerRefundState }) {
  const completed = state.refund.status === "COMPLETED";
  return (
    <section className="context-section" aria-labelledby="what-happened">
      <div>
        <p className="section-number">Previous payment</p>
        <h2 id="what-happened" className="section-title font-editorial">Failed SBI delivery</h2>
      </div>
      <dl className="context-facts">
        <div>
          <dt>Previous destination</dt>
          <dd className="currency">{state.previousPayment.bankName} {state.previousPayment.maskedAccount}</dd>
        </div>
        <div>
          <dt>Delivery attempt</dt>
          <dd className="failure-text">Failed</dd>
        </div>
        <div>
          <dt>Failure reason</dt>
          <dd>{state.previousPayment.reason}</dd>
        </div>
        <div>
          <dt>Government obligation</dt>
          <dd className={completed ? "verified-text" : "active-obligation-text"}>
            {completed ? "Completed" : "OWED"}
          </dd>
        </div>
      </dl>
    </section>
  );
}

import { motion } from "framer-motion";

import type { ConsumerRefundState } from "@/services/consumer-refund";

export function OutcomeMetrics({ state }: { state: ConsumerRefundState }) {
  return (
    <motion.section className="outcome" initial={{ opacity: 0 }} animate={{ opacity: 1 }} aria-labelledby="outcome-heading">
      <p className="section-number">05 / Resolved</p>
      <h2 id="outcome-heading" className="outcome-amount font-editorial currency">{state.refund.displayAmount} delivered</h2>
      <p className="completed-obligation"><span aria-hidden="true">✓</span> Government obligation: Completed</p>
      <dl className="metrics-grid">
        <div><dd className="currency">{state.metrics.failedDeliveries}</dd><dt>failed delivery</dt></div>
        <div><dd className="currency">{state.metrics.destinationRepairs}</dd><dt>destination repair</dt></div>
        <div><dd className="currency">{state.metrics.reapplications}</dd><dt>reapplications</dt></div>
      </dl>
    </motion.section>
  );
}

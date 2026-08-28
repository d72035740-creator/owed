import { motion } from "framer-motion";

import type { ConsumerRefundState } from "@/services/consumer-refund";

export function OutcomeMetrics({ state }: { state: ConsumerRefundState }) {
  return (
    <motion.section
      className="outcome"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      aria-labelledby="outcome-heading"
    >
      <p className="section-number">05 / Obligation resolved</p>
      <h2 id="outcome-heading" className="outcome-amount font-editorial currency">
        {state.refund.displayAmount} delivered
      </h2>
      <p className="outcome-destination-note">
        Credited to {state.destination.bankName} {state.destination.maskedAccount} · AY {state.refund.assessmentYear}
      </p>

      <p className="completed-obligation">
        <span className="obligation-check" aria-hidden="true">✓</span> Government obligation: Completed
      </p>

      <div className="zero-reapplications-card" role="region" aria-label="Outcome highlight">
        <div className="zero-hero-digit font-editorial currency">0</div>
        <p className="zero-hero-title">REAPPLICATIONS</p>
      </div>

      <dl className="metrics-grid" aria-label="Journey metrics summary">
        <div>
          <dd className="currency">{state.metrics.failedDeliveries}</dd>
          <dt>failed delivery</dt>
        </div>
        <div>
          <dd className="currency">{state.metrics.destinationRepairs}</dd>
          <dt>destination repair</dt>
        </div>
        <div>
          <dd className="currency">{state.metrics.reapplications}</dd>
          <dt>reapplications</dt>
        </div>
      </dl>
    </motion.section>
  );
}

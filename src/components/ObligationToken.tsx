import { motion } from "framer-motion";

import type { ConsumerRefundState } from "@/services/consumer-refund";

export function ObligationToken({
  refund,
  previousPayment,
}: {
  refund: ConsumerRefundState["refund"];
  previousPayment?: ConsumerRefundState["previousPayment"];
}) {
  const completed = refund.status === "COMPLETED";
  return (
    <section className="obligation-token" aria-labelledby="refund-heading">
      <div className="hero-eyebrow-row">
        <p className="eyebrow">
          Unfinished Government Payment · AY {refund.assessmentYear}
        </p>
        <span className="live-obligation-tag">
          {completed ? "Obligation: Completed" : "Obligation: Still Active"}
        </span>
      </div>

      <motion.h1
        id="refund-heading"
        className="refund-amount currency font-editorial"
        layout
        aria-label={`${refund.displayAmount} ${completed ? "delivered" : "still owed"}`}
      >
        {refund.displayAmount}
      </motion.h1>

      <div className="hero-status-strip" role="region" aria-label="Current payment status summary">
        <div className="status-strip-item">
          <span className="status-strip-label">Government obligation</span>
          <span className={`status-strip-value ${completed ? "resolved" : "active"}`}>
            {completed ? "COMPLETED" : "STILL ACTIVE"}
          </span>
        </div>
        <div className="status-strip-divider" aria-hidden="true" />
        <div className="status-strip-item">
          <span className="status-strip-label">Previous delivery</span>
          <span className="status-strip-value failed">
            {previousPayment
              ? `FAILED · ${previousPayment.bankName} ${previousPayment.maskedAccount} (${previousPayment.reason})`
              : "FAILED · SBI ••••1028 (Account closed)"}
          </span>
        </div>
      </div>

      <motion.p key={completed ? "delivered" : "owed"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="refund-declaration font-editorial">
        {completed ? "delivered" : "still owed"}
      </motion.p>
    </section>
  );
}

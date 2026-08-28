import { motion } from "framer-motion";

import type { ConsumerRefundState } from "@/services/consumer-refund";

export function ObligationToken({ refund }: { refund: ConsumerRefundState["refund"] }) {
  const completed = refund.status === "COMPLETED";
  return (
    <section className="obligation-token" aria-labelledby="refund-heading">
      <p className="eyebrow">Income Tax refund · Assessment Year {refund.assessmentYear}</p>
      <motion.h1
        id="refund-heading"
        className="refund-amount currency font-editorial"
        layout
        aria-label={`${refund.displayAmount} ${completed ? "delivered" : "still owed"}`}
      >
        {refund.displayAmount}
      </motion.h1>
      <motion.p key={completed ? "delivered" : "owed"} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="refund-declaration font-editorial">
        {completed ? "delivered" : "is still owed to you"}
      </motion.p>
    </section>
  );
}
